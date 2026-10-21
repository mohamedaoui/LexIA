"""Statistiques d'utilisation de LexIA pour le tableau de bord administrateur."""

from dataclasses import dataclass
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

from chat.models import Feedback, Message, MessageSource
from legal.models import Category
from rag.prompts import detect_language

User = get_user_model()

LANGUAGES = {"fr": "Français", "ar": "Arabe / darija"}


@dataclass
class Period:
    """Période analysée. `days=None` : depuis le début."""

    days: int | None
    start: datetime | None
    end: datetime

    @classmethod
    def last(cls, days: int | None) -> "Period":
        end = timezone.now()
        if days is None:
            return cls(None, None, end)
        # Début de journée locale, `days` jours calendaires en comptant aujourd'hui.
        first_day = timezone.localdate(end) - timedelta(days=days - 1)
        start = timezone.make_aware(datetime.combine(first_day, datetime.min.time()))
        return cls(days, start, end)

    def filter(self, field: str = "created_at") -> Q:
        return Q(**{f"{field}__gte": self.start}) if self.start else Q()


def questions(period: Period):
    return Message.objects.filter(period.filter(), role=Message.Role.USER)


def feedbacks(period: Period):
    return Feedback.objects.filter(period.filter())


def satisfaction(positive: int, negative: int) -> float | None:
    total = positive + negative
    return round(positive / total, 4) if total else None


def daily_counts(period: Period) -> list[dict]:
    """Nombre de questions par jour (heure du Maroc), jours sans question inclus."""
    rows = dict(
        questions(period)
        .annotate(day=TruncDate("created_at"))
        .values_list("day")
        .annotate(n=Count("id"))
        .values_list("day", "n")
    )
    if not rows and period.start is None:
        return []
    first = timezone.localdate(period.start) if period.start else min(rows)
    last = timezone.localdate(period.end)
    days = (last - first).days + 1
    return [
        {"date": (first + timedelta(d)).isoformat(), "count": rows.get(first + timedelta(d), 0)}
        for d in range(days)
    ]


def by_category(period: Period) -> list[dict]:
    question_counts = dict(
        questions(period).exclude(category=None).values_list("category").annotate(n=Count("id")).values_list("category", "n")
    )
    feedback_counts = {
        row["message__category"]: row
        for row in feedbacks(period)
        .exclude(message__category=None)
        .values("message__category")
        .annotate(positive=Count("id", filter=Q(rating=1)), negative=Count("id", filter=Q(rating=-1)))
    }
    result = []
    for category in Category.objects.filter(id__in=question_counts):
        fb = feedback_counts.get(category.id, {"positive": 0, "negative": 0})
        result.append({
            "id": category.id,
            "slug": category.slug,
            "name_fr": category.name_fr,
            "name_ar": category.name_ar,
            "questions": question_counts[category.id],
            "positive": fb["positive"],
            "negative": fb["negative"],
            "satisfaction": satisfaction(fb["positive"], fb["negative"]),
        })
    return sorted(result, key=lambda c: (-c["questions"], c["name_fr"]))


def by_language(period: Period) -> list[dict]:
    counts = {code: 0 for code in LANGUAGES}
    for content in questions(period).values_list("content", flat=True).iterator():
        counts[detect_language(content)] += 1
    return [{"language": code, "label": LANGUAGES[code], "count": n} for code, n in counts.items()]


def top_laws(period: Period, limit: int = 10) -> list[dict]:
    rows = (
        MessageSource.objects.filter(period.filter("message__created_at"))
        .values(
            "article__document",
            "article__document__title",
            "article__document__category__name_fr",
            "article__document__category__name_ar",
        )
        .annotate(citations=Count("id"), answers=Count("message", distinct=True))
        .order_by("-citations", "article__document__title")[:limit]
    )
    return [
        {
            "document_id": r["article__document"],
            "title": r["article__document__title"],
            "category": r["article__document__category__name_fr"],
            "category_ar": r["article__document__category__name_ar"],
            "citations": r["citations"],
            "answers": r["answers"],
        }
        for r in rows
    ]


def question_before(answer: Message) -> Message | None:
    return (
        answer.conversation.messages.filter(role=Message.Role.USER, created_at__lte=answer.created_at)
        .order_by("-created_at")
        .first()
    )


def recent_negative_feedback(period: Period, limit: int = 10) -> list[dict]:
    items = (
        feedbacks(period)
        .filter(rating=Feedback.Rating.NEGATIVE)
        .select_related("message__conversation", "message__category", "user")
        .order_by("-created_at")[:limit]
    )
    result = []
    for fb in items:
        question = question_before(fb.message)
        result.append({
            "id": fb.id,
            "created_at": fb.created_at,
            "comment": fb.comment,
            "category": fb.message.category.name_fr if fb.message.category else None,
            "category_ar": fb.message.category.name_ar if fb.message.category else None,
            "question": question.content if question else "",
            "answer": fb.message.content,
            "conversation_id": str(fb.message.conversation_id),
            "user_role": fb.user.get_role_display(),
        })
    return result


def build_stats(period: Period) -> dict:
    qs = questions(period)
    fb = feedbacks(period).aggregate(
        positive=Count("id", filter=Q(rating=1)), negative=Count("id", filter=Q(rating=-1))
    )
    return {
        "period": {"days": period.days, "start": period.start, "end": period.end},
        "totals": {
            "questions": qs.count(),
            "conversations": qs.values("conversation").distinct().count(),
            "active_users": qs.values("conversation__user").distinct().count(),
            "users": User.objects.count(),
            "new_users": User.objects.filter(period.filter("date_joined")).count(),
            "unclassified_questions": qs.filter(category=None).count(),
            "feedback_positive": fb["positive"],
            "feedback_negative": fb["negative"],
            "satisfaction": satisfaction(fb["positive"], fb["negative"]),
        },
        "questions_per_day": daily_counts(period),
        "by_category": by_category(period),
        "by_language": by_language(period),
        "users_by_role": [
            {"role": role, "label": label, "count": User.objects.filter(role=role).count()}
            for role, label in User.Role.choices
        ],
        "top_laws": top_laws(period),
        "recent_negative_feedback": recent_negative_feedback(period),
    }


def question_answer_pairs(period: Period):
    """(question, réponse ou None) pour chaque question de la période, de la plus récente à la plus ancienne."""
    conversation_ids = questions(period).values("conversation")
    messages = (
        Message.objects.filter(conversation__in=conversation_ids)
        .select_related("category", "conversation__user", "feedback")
        .prefetch_related("messagesource_set__article__document")
        .order_by("conversation", "created_at")
    )
    pairs, pending = [], None
    for message in messages:
        if message.role == Message.Role.USER:
            if pending is not None:
                pairs.append((pending, None))
            pending = message
        elif pending is not None:
            pairs.append((pending, message))
            pending = None
    if pending is not None:
        pairs.append((pending, None))

    in_period = [p for p in pairs if period.start is None or p[0].created_at >= period.start]
    return sorted(in_period, key=lambda p: p[0].created_at, reverse=True)

