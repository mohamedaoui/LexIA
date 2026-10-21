import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations"
    )
    title = models.CharField(max_length=200, default="Nouvelle conversation")
    language = models.CharField(max_length=10, default="fr")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class Message(models.Model):
    class Role(models.TextChoices):
        USER = "user", "Utilisateur"
        ASSISTANT = "assistant", "Assistant"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    category = models.ForeignKey(
        "legal.Category", null=True, blank=True, on_delete=models.SET_NULL, related_name="messages"
    )
    sources = models.ManyToManyField(
        "legal.LegalArticle", through="MessageSource", related_name="cited_in", blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.get_role_display()} : {self.content[:60]}"


class MessageSource(models.Model):
    """Article de loi utilisé pour produire une réponse, avec son score de similarité."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE)
    article = models.ForeignKey("legal.LegalArticle", on_delete=models.CASCADE)
    score = models.FloatField()

    class Meta:
        ordering = ["-score"]
        constraints = [
            models.UniqueConstraint(fields=["message", "article"], name="unique_message_source"),
        ]


class Feedback(models.Model):
    class Rating(models.IntegerChoices):
        NEGATIVE = -1, "Pas utile"
        POSITIVE = 1, "Utile"

    message = models.OneToOneField(Message, on_delete=models.CASCADE, related_name="feedback")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="feedbacks")
    rating = models.SmallIntegerField(choices=Rating.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_rating_display()} — {self.message_id}"
