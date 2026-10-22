"""Gestion par les administrateurs : utilisateurs, catégories, FAQ (critère CR6)."""

import pytest

from conftest import ConversationFactory, UserFactory
from chat.models import Message
from legal.models import FAQ, Category

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin(api):
    user = UserFactory(is_staff=True, email="admin@lexia.ma")
    api.force_authenticate(user)
    return user


# --- Utilisateurs ------------------------------------------------------------------

def test_users_api_reserved_to_admins(api, user):
    assert api.get("/api/dashboard/users/").status_code == 401
    api.force_authenticate(user)
    assert api.get("/api/dashboard/users/").status_code == 403


def test_list_users_with_counts_and_filters(api, admin):
    student = UserFactory(role="student", first_name="Salma")
    conversation = ConversationFactory(user=student)
    conversation.messages.create(role=Message.Role.USER, content="Question")
    conversation.messages.create(role=Message.Role.ASSISTANT, content="Réponse")
    UserFactory(role="lawyer", is_active=False)

    results = api.get("/api/dashboard/users/").data["results"]
    assert len(results) == 3
    row = next(u for u in results if u["id"] == student.id)
    assert (row["conversation_count"], row["question_count"]) == (1, 1)

    assert [u["id"] for u in api.get("/api/dashboard/users/?q=salma").data["results"]] == [student.id]
    assert api.get("/api/dashboard/users/?role=lawyer").data["count"] == 1
    assert api.get("/api/dashboard/users/?is_active=false").data["count"] == 1
    assert api.get("/api/dashboard/users/?is_staff=true").data["count"] == 1


def test_admin_updates_role_status_and_rights(api, admin):
    target = UserFactory()
    response = api.patch(f"/api/dashboard/users/{target.id}/", {"role": "judge", "is_active": False, "is_staff": True})
    assert response.status_code == 200
    target.refresh_from_db()
    assert (target.role, target.is_active, target.is_staff) == ("judge", False, True)


def test_email_and_superuser_flag_are_read_only(api, admin):
    target = UserFactory()
    api.patch(f"/api/dashboard/users/{target.id}/", {"email": "pirate@x.ma", "is_superuser": True})
    target.refresh_from_db()
    assert target.email != "pirate@x.ma" and not target.is_superuser


def test_admin_cannot_lock_himself_out(api, admin):
    assert api.patch(f"/api/dashboard/users/{admin.id}/", {"is_staff": False}).status_code == 400
    assert api.patch(f"/api/dashboard/users/{admin.id}/", {"is_active": False}).status_code == 400
    assert api.delete(f"/api/dashboard/users/{admin.id}/").status_code == 400
    admin.refresh_from_db()
    assert admin.is_staff and admin.is_active


def test_only_superuser_can_modify_superuser(api, admin):
    boss = UserFactory(is_staff=True, is_superuser=True)
    assert api.patch(f"/api/dashboard/users/{boss.id}/", {"is_active": False}).status_code == 403
    assert api.delete(f"/api/dashboard/users/{boss.id}/").status_code == 403


def test_admin_deletes_user(api, admin):
    target = UserFactory()
    assert api.delete(f"/api/dashboard/users/{target.id}/").status_code == 204
    assert not type(target).objects.filter(id=target.id).exists()


# --- Catégories ----------------------------------------------------------------------

def test_category_crud_with_counts(api, admin):
    created = api.post("/api/categories/", {"slug": "fiscalite", "name_fr": "Fiscalité", "name_ar": "الجبايات"})
    assert created.status_code == 201
    category_id = created.data["id"]
    FAQ.objects.create(category_id=category_id, question="Q", answer="R")

    listed = next(c for c in api.get("/api/categories/").data if c["id"] == category_id)
    assert (listed["law_count"], listed["faq_count"], listed["question_count"]) == (0, 1, 0)

    assert api.patch(f"/api/categories/{category_id}/", {"description": "Impôts"}).status_code == 200
    assert api.post("/api/categories/", {"slug": "fiscalite", "name_fr": "Doublon"}).status_code == 400
    assert api.delete(f"/api/categories/{category_id}/").status_code == 204
    assert not Category.objects.filter(id=category_id).exists()


# --- FAQ --------------------------------------------------------------------------------

def test_faq_crud_and_publication(api, admin):
    category = Category.objects.create(slug="travail", name_fr="Travail", name_ar="الشغل")
    created = api.post("/api/faqs/", {
        "category": category.id, "question": "Durée du préavis ?", "answer": "Selon...", "language": "fr",
        "is_published": False,
    })
    assert created.status_code == 201
    assert created.data["category_name_ar"] == "الشغل"
    faq_id = created.data["id"]

    assert api.get("/api/faqs/").data["count"] == 1  # l'admin voit les brouillons

    api.force_authenticate(None)
    assert api.get("/api/faqs/").data["count"] == 0  # le public ne voit que les FAQ publiées
    api.force_authenticate(admin)

    assert api.patch(f"/api/faqs/{faq_id}/", {"is_published": True}).status_code == 200
    api.force_authenticate(None)
    assert api.get("/api/faqs/?language=fr").data["count"] == 1
    assert api.get("/api/faqs/?language=ar").data["count"] == 0
    api.force_authenticate(admin)

    assert api.post("/api/faqs/", {"category": category.id, "question": "Q", "answer": "R", "language": "en"}).status_code == 400
    assert api.delete(f"/api/faqs/{faq_id}/").status_code == 204
