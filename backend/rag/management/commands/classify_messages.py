from django.core.management.base import BaseCommand
from django.db import transaction

from chat.models import Message
from rag.pipeline import Source, detect_category


class Command(BaseCommand):
    help = (
        "Attribue une catégorie aux échanges qui n'en ont pas (posés avant l'ajout des catégories, "
        "ou avant une mise à jour de data/categories.json), à partir des sources déjà enregistrées."
    )

    def add_arguments(self, parser):
        parser.add_argument("--all", action="store_true", help="Reclasser aussi les messages déjà classés.")

    def handle(self, all, **options):
        answers = Message.objects.filter(role=Message.Role.ASSISTANT).prefetch_related(
            "messagesource_set__article__document__category"
        )
        if not all:
            answers = answers.filter(category=None)

        classified = 0
        for answer in answers.iterator(chunk_size=200):
            sources = [Source(s.article, s.score) for s in answer.messagesource_set.all()]
            category = detect_category(sources)
            if category is None:
                continue
            question = (
                answer.conversation.messages.filter(role=Message.Role.USER, created_at__lte=answer.created_at)
                .order_by("-created_at")
                .first()
            )
            with transaction.atomic():
                Message.objects.filter(pk__in=[answer.pk] + ([question.pk] if question else [])).update(category=category)
            classified += 1

        self.stdout.write(self.style.SUCCESS(f"{classified} échanges classés."))
