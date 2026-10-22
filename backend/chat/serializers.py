from rest_framework import serializers

from legal.serializers import CategorySerializer

from .models import Conversation, Feedback, Message, MessageSource


class MessageSourceSerializer(serializers.ModelSerializer):
    article_id = serializers.IntegerField(source="article.id")
    number = serializers.CharField(source="article.number")
    document_title = serializers.CharField(source="article.document.title")

    class Meta:
        model = MessageSource
        fields = ["article_id", "number", "document_title", "score"]


class FeedbackSerializer(serializers.ModelSerializer):
    comment = serializers.CharField(max_length=1000, required=False, allow_blank=True)

    class Meta:
        model = Feedback
        fields = ["rating", "comment", "created_at"]
        read_only_fields = ["created_at"]


class MessageSerializer(serializers.ModelSerializer):
    sources = MessageSourceSerializer(source="messagesource_set", many=True, read_only=True)
    feedback = FeedbackSerializer(read_only=True)
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "role", "content", "category", "sources", "feedback", "created_at"]


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, trim_whitespace=True)
    conversation_id = serializers.UUIDField(required=False)


class ChatResponseSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()
    question = MessageSerializer()
    answer = MessageSerializer()


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["id", "title", "language", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ConversationDetailSerializer(ConversationSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ["messages"]
