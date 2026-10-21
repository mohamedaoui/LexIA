from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Conversation, Feedback, Message, MessageSource
from .serializers import ConversationDetailSerializer, ConversationSerializer, FeedbackSerializer


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
