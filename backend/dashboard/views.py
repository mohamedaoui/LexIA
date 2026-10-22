import csv

from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import Feedback

from .stats import Period, build_stats, question_answer_pairs, question_before

PERIODS = {"7": 7, "30": 30, "90": 90, "all": None}

DAYS_PARAM = OpenApiParameter(
    "days", str, enum=list(PERIODS), default="30", description="Période : 7, 30 ou 90 derniers jours, ou all."
)


def parse_period(request) -> Period:
    value = request.query_params.get("days", "30")
    if value not in PERIODS:
        raise ValidationError({"days": f"Valeurs possibles : {', '.join(PERIODS)}."})
    return Period.last(PERIODS[value])


def local(dt) -> str:
    return timezone.localtime(dt).strftime("%Y-%m-%d %H:%M")


# Une cellule qui commence par l'un de ces caractères est exécutée comme une formule par
# Excel / LibreOffice : une question « =HYPERLINK(...) » deviendrait un lien piégé.
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def safe_cell(value) -> str:
    text = "" if value is None else str(value)
    return f"'{text}" if text.startswith(FORMULA_PREFIXES) else text


def csv_response(filename: str, header: list[str], rows) -> HttpResponse:
    # Le BOM UTF-8 permet à Excel d'afficher correctement l'arabe ; ";" est le séparateur
    # attendu par Excel en français.
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response.write("﻿")
    writer = csv.writer(response, delimiter=";")
    writer.writerow(header)
    writer.writerows([safe_cell(cell) for cell in row] for row in rows)
    return response


def rating_label(feedback) -> str:
    if feedback is None:
        return ""
    return "utile" if feedback.rating == Feedback.Rating.POSITIVE else "pas utile"


class StatsView(APIView):
    """Statistiques d'utilisation (administrateurs uniquement)."""

    permission_classes = [IsAdminUser]

    @extend_schema(parameters=[DAYS_PARAM], responses=OpenApiTypes.OBJECT)
    def get(self, request):
        return Response(build_stats(parse_period(request)))


class QuestionsExportView(APIView):
    """Toutes les questions de la période avec leur réponse, catégorie, sources et avis (CSV)."""

    permission_classes = [IsAdminUser]

    @extend_schema(parameters=[DAYS_PARAM], responses={(200, "text/csv"): OpenApiTypes.STR})
    def get(self, request):
        period = parse_period(request)
        rows = []
        for question, answer in question_answer_pairs(period):
            feedback = getattr(answer, "feedback", None) if answer else None
            sources = answer.messagesource_set.all() if answer else []
            rows.append([
                local(question.created_at),
                question.conversation_id,
                question.conversation.user_id,
                question.conversation.user.get_role_display(),
                question.category.name_fr if question.category else "",
                question.content,
                answer.content if answer else "",
                " | ".join(f"{s.article.document.title} — art. {s.article.number} ({s.score:.2f})" for s in sources),
                rating_label(feedback),
                feedback.comment if feedback else "",
            ])
        return csv_response(
            f"lexia-questions-{timezone.localdate():%Y%m%d}.csv",
            ["date", "conversation", "utilisateur (id)", "profil", "catégorie", "question", "réponse",
             "sources", "avis", "commentaire"],
            rows,
        )


class FeedbackExportView(APIView):
    """Tous les avis de la période, avec la question et la réponse concernées (CSV)."""

    permission_classes = [IsAdminUser]

    @extend_schema(parameters=[DAYS_PARAM], responses={(200, "text/csv"): OpenApiTypes.STR})
    def get(self, request):
        period = parse_period(request)
        feedbacks = (
            Feedback.objects.filter(period.filter())
            .select_related("message__conversation", "message__category", "user")
            .order_by("-created_at")
        )
        rows = []
        for fb in feedbacks:
            question = question_before(fb.message)
            rows.append([
                local(fb.created_at),
                rating_label(fb),
                fb.comment,
                fb.message.category.name_fr if fb.message.category else "",
                fb.user.get_role_display(),
                question.content if question else "",
                fb.message.content,
            ])
        return csv_response(
            f"lexia-avis-{timezone.localdate():%Y%m%d}.csv",
            ["date", "avis", "commentaire", "catégorie", "profil", "question", "réponse"],
            rows,
        )
