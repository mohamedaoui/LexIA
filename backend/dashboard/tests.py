import csv
import io
from datetime import timedelta

import pytest
from django.utils import timezone

from chat.models import Feedback, Message, MessageSource
from conftest import ConversationFactory, UserFactory
from legal.models import Category, LegalArticle, LegalDocument

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin_api(api):
    api.force_authenticate(UserFactory(is_staff=True))
    return api


@pytest.fixture
def data():
    """Deux échanges récents (travail, 👍 et 👎) et un ancien (famille, il y a 60 jours)."""
    travail = Category.objects.create(slug="travail", name_fr="Travail", name_ar="الشغل")
    famille = Category.objects.create(slug="famille", name_fr="Famille", name_ar="الأسرة")
    law = LegalDocument.objects.create(title="مدونة الشغل", source_file="travail.txt", category=travail)
    article = LegalArticle.objects.create(document=law, position=1, number="6", content="نص")

    student = UserFactory(role="student")
    lawyer = UserFactory(role="lawyer")

    def exchange(user, question, answer, category, days_ago=0, rating=None, comment=""):
        conversation = ConversationFactory(user=user)
        q = conversation.messages.create(role=Message.Role.USER, content=question, category=category)
        a = conversation.messages.create(role=Message.Role.ASSISTANT, content=answer, category=category)
        MessageSource.objects.create(message=a, article=article, score=0.8)
        if rating:
            Feedback.objects.create(message=a, user=user, rating=rating, comment=comment)
        if days_ago:
            when = timezone.now() - timedelta(days=days_ago)
            Message.objects.filter(id__in=[q.id, a.id]).update(created_at=when)
            Feedback.objects.filter(message=a).update(created_at=when)
        return q, a

    exchange(student, "Mon patron ne me paie pas", "Selon l'article 6...", travail, rating=1)
    exchange(lawyer, "ما هي مدة الإشعار؟", "حسب المادة 6...", travail, rating=-1, comment="Incomplet")
    exchange(student, "Pension alimentaire ?", "Selon la Moudawana...", famille, days_ago=60, rating=1)
    return {"travail": travail, "famille": famille}


def test_stats_reserved_to_admins(api, user):
    assert api.get("/api/dashboard/stats/").status_code == 401
    api.force_authenticate(user)
    assert api.get("/api/dashboard/stats/").status_code == 403
    assert api.get("/api/dashboard/export/questions.csv").status_code == 403


def test_stats_last_30_days(admin_api, data):
    stats = admin_api.get("/api/dashboard/stats/?days=30").data
    totals = stats["totals"]
    assert totals["questions"] == 2
    assert totals["conversations"] == 2
    assert totals["active_users"] == 2
    assert (totals["feedback_positive"], totals["feedback_negative"]) == (1, 1)
    assert totals["satisfaction"] == 0.5

    assert len(stats["questions_per_day"]) == 30
    assert stats["questions_per_day"][-1]["count"] == 2
    assert sum(d["count"] for d in stats["questions_per_day"]) == 2

    assert [c["slug"] for c in stats["by_category"]] == ["travail"]
    travail = stats["by_category"][0]
    assert (travail["questions"], travail["positive"], travail["negative"]) == (2, 1, 1)
    assert {l["language"]: l["count"] for l in stats["by_language"]} == {"fr": 1, "ar": 1}
    assert stats["top_laws"][0]["citations"] == 2


def test_stats_all_time_includes_old_exchanges(admin_api, data):
    stats = admin_api.get("/api/dashboard/stats/?days=all").data
    assert stats["totals"]["questions"] == 3
    assert stats["totals"]["satisfaction"] == pytest.approx(2 / 3, abs=1e-4)
    assert {c["slug"] for c in stats["by_category"]} == {"travail", "famille"}
    assert len(stats["questions_per_day"]) >= 60


def test_negative_feedback_shows_question_and_comment(admin_api, data):
    item = admin_api.get("/api/dashboard/stats/").data["recent_negative_feedback"][0]
    assert item["question"] == "ما هي مدة الإشعار؟"
    assert item["answer"].startswith("حسب المادة 6")
    assert item["comment"] == "Incomplet"
    assert item["user_role"] == "Avocat"


def test_invalid_period(admin_api):
    assert admin_api.get("/api/dashboard/stats/?days=12").status_code == 400


def test_stats_without_any_data(admin_api):
    stats = admin_api.get("/api/dashboard/stats/?days=all").data
    assert stats["totals"]["questions"] == 0
    assert stats["totals"]["satisfaction"] is None
    assert stats["questions_per_day"] == []


def read_csv(response):
    content = response.content.decode("utf-8")
    assert content.startswith("﻿")  # BOM pour Excel
    return list(csv.reader(io.StringIO(content[1:]), delimiter=";"))


def test_export_questions_csv(admin_api, data):
    response = admin_api.get("/api/dashboard/export/questions.csv?days=30")
    assert response.status_code == 200
    assert response["Content-Type"].startswith("text/csv")
    assert "attachment" in response["Content-Disposition"]

    header, *rows = read_csv(response)
    assert header[:6] == ["date", "conversation", "utilisateur (id)", "profil", "catégorie", "question"]
    assert len(rows) == 2
    by_question = {r[5]: r for r in rows}
    arabic = by_question["ما هي مدة الإشعار؟"]
    assert arabic[4] == "Travail"
    assert arabic[6].startswith("حسب المادة 6")
    assert "مدونة الشغل — art. 6" in arabic[7]
    assert (arabic[8], arabic[9]) == ("pas utile", "Incomplet")


def test_export_feedback_csv(admin_api, data):
    header, *rows = read_csv(admin_api.get("/api/dashboard/export/feedback.csv?days=all"))
    assert header[:3] == ["date", "avis", "commentaire"]
    assert sorted(r[1] for r in rows) == ["pas utile", "utile", "utile"]
