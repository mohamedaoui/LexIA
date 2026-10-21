import logging

from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.db.models import Prefetch
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


class ChatView(APIView):
    """Pose une question à LexIA. Sans `conversation_id`, une nouvelle conversation est créée."""

    @extend_schema(request=ChatRequestSerializer, responses={201: ChatResponseSerializer})
    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["message"]

        conversation = None
        history = []
        if conversation_id := serializer.validated_data.get("conversation_id"):
            conversation = get_object_or_404(Conversation, id=conversation_id, user=request.user)
            history = list(conversation.messages.values_list("role", "content"))

        try:
            result = pipeline.answer(question, history)
        except ImproperlyConfigured as error:
            logger.error("RAG non configuré : %s", error)
            return Response({"detail": str(error)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception:
            logger.exception("Échec du pipeline RAG")
            return Response(
                {"detail": "Le service de réponse est momentanément indisponible. Réessayez."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Question et réponse sont enregistrées ensemble : pas de question orpheline en cas d'erreur.
        with transaction.atomic():
            if conversation is None:
                conversation = Conversation.objects.create(
                    user=request.user, title=question[:80], language=result.language
                )
            user_message = conversation.messages.create(role=Message.Role.USER, content=question)
            answer = conversation.messages.create(role=Message.Role.ASSISTANT, content=result.content)
            MessageSource.objects.bulk_create(
                MessageSource(message=answer, article=s.article, score=s.score) for s in result.sources
            )
            conversation.save(update_fields=["updated_at"])

        answer = Message.objects.prefetch_related("messagesource_set__article__document").get(pk=answer.pk)
        return Response(
            {
                "conversation_id": conversation.id,
                "question": MessageSerializer(user_message).data,
                "answer": MessageSerializer(answer).data,
            },
            status=status.HTTP_201_CREATED,
        )
