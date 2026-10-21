import json
import logging

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Prefetch
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from rag import pipeline

from .models import Conversation, Feedback, Message, MessageSource
from .serializers import (
    ChatRequestSerializer,
    ChatResponseSerializer,
    ConversationDetailSerializer,
    ConversationSerializer,
    FeedbackSerializer,
    MessageSerializer,
)

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ModelViewSet):
    """Conversations de l'utilisateur connecté uniquement."""

    queryset = Conversation.objects.none()  # pour le schéma OpenAPI ; voir get_queryset

    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user)
        if self.action == "retrieve":
            qs = qs.prefetch_related(
                Prefetch(
                    "messages",
                    queryset=Message.objects.select_related("feedback").prefetch_related(
                        Prefetch(
                            "messagesource_set",
                            queryset=MessageSource.objects.select_related("article__document"),
                        )
                    ),
                )
            )
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MessageViewSet(viewsets.GenericViewSet):
    queryset = Message.objects.none()  # pour le schéma OpenAPI ; voir get_queryset

    def get_queryset(self):
        return Message.objects.filter(conversation__user=self.request.user)

    @action(detail=True, methods=["post", "put"], serializer_class=FeedbackSerializer)
    def feedback(self, request, pk=None):
        message = get_object_or_404(self.get_queryset(), pk=pk, role=Message.Role.ASSISTANT)
        serializer = FeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        feedback, created = Feedback.objects.update_or_create(
            message=message,
            defaults={"user": request.user, **serializer.validated_data},
        )
        return Response(
            FeedbackSerializer(feedback).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


UNAVAILABLE = "Le service de réponse est momentanément indisponible. Réessayez."
QUOTA_EXCEEDED = "La limite d'utilisation gratuite de l'IA est atteinte. Réessayez plus tard."


def failure_message(error: Exception) -> str:
    return QUOTA_EXCEEDED if "RESOURCE_EXHAUSTED" in str(error) else UNAVAILABLE


def save_exchange(user, conversation, question, content, sources, language):
    """Enregistre la question et la réponse ensemble : pas de question orpheline en cas d'erreur.
    Retourne (conversation, message utilisateur, réponse avec ses sources)."""
    with transaction.atomic():
        if conversation is None:
            conversation = Conversation.objects.create(user=user, title=question[:80], language=language)
        user_message = conversation.messages.create(role=Message.Role.USER, content=question)
        answer = conversation.messages.create(role=Message.Role.ASSISTANT, content=content)
        MessageSource.objects.bulk_create(
            MessageSource(message=answer, article=s.article, score=s.score) for s in sources
        )
        conversation.save(update_fields=["updated_at"])

    answer = Message.objects.prefetch_related("messagesource_set__article__document").get(pk=answer.pk)
    return conversation, user_message, answer


def exchange_payload(conversation, user_message, answer):
    return {
        "conversation_id": str(conversation.id),
        "question": MessageSerializer(user_message).data,
        "answer": MessageSerializer(answer).data,
    }


class BaseChatView(APIView):
    def parse(self, request):
        """Valide la requête ; retourne (question, conversation ou None, historique)."""
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation, history = None, []
        if conversation_id := serializer.validated_data.get("conversation_id"):
            conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
            history = list(conversation.messages.values_list("role", "content"))
        return serializer.validated_data["message"], conversation, history


class ChatView(BaseChatView):
    """Pose une question à LexIA. Sans `conversation_id`, une nouvelle conversation est créée."""

    @extend_schema(request=ChatRequestSerializer, responses={201: ChatResponseSerializer})
    def post(self, request):
        question, conversation, history = self.parse(request)
        try:
            result = pipeline.answer(question, history)
        except ImproperlyConfigured as error:
            logger.error("RAG non configuré : %s", error)
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as error:
            logger.exception("Échec du pipeline RAG")
            return Response({"detail": failure_message(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        saved = save_exchange(request.user, conversation, question, result.content, result.sources, result.language)
        return Response(exchange_payload(*saved), status=status.HTTP_201_CREATED)


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


class ChatStreamView(BaseChatView):
    """Comme /api/chat/, mais la réponse arrive mot par mot (Server-Sent Events).

    Événements : `sources` (articles trouvés), `token` (morceau de texte), puis `done`
    (messages enregistrés, même format que /api/chat/) ou `error`."""

    @extend_schema(request=ChatRequestSerializer, responses={(200, "text/event-stream"): str})
    def post(self, request):
        question, conversation, history = self.parse(request)
        try:
            prepared = pipeline.prepare(question, history)
        except ImproperlyConfigured as error:
            logger.error("RAG non configuré : %s", error)
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            logger.exception("Échec de la recherche RAG")
            return Response({"detail": UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        user = request.user

        def events():
            yield sse("sources", [
                {
                    "article_id": s.article.id,
                    "number": s.article.number,
                    "document_title": s.article.document.title,
                    "score": s.score,
                }
                for s in prepared.sources
            ])
            parts = []
            try:
                for text in pipeline.stream(prepared):
                    parts.append(text)
                    yield sse("token", text)
            except Exception as error:
                logger.exception("Échec de la génération en streaming")
                yield sse("error", {"detail": failure_message(error)})
                return
            content = "".join(parts).strip()
            saved = save_exchange(user, conversation, question, content, prepared.sources, prepared.language)
            yield sse("done", exchange_payload(*saved))

        response = StreamingHttpResponse(events(), content_type="text/event-stream; charset=utf-8")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
