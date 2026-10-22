"""Tests de sécurité transverses (audit du sprint 7, voir docs/securite.md)."""

import pytest

from chat.models import Message
from conftest import MessageFactory, UserFactory

pytestmark = pytest.mark.django_db

PASSWORD = "Motdepasse-solide-42"


def login(api, email, password=PASSWORD):
    return api.post("/api/auth/login/", {"email": email, "password": password})


# --- Limites de requêtes ---------------------------------------------------------

def test_login_attempts_are_limited(api, user):
    statuses = [login(api, user.email, "mauvais").status_code for _ in range(10)]
    assert set(statuses) == {401}
    # 11e essai dans la minute : bloqué, même avec le bon mot de passe.
    response = login(api, user.email)
    assert response.status_code == 429
    assert "Retry-After" in response


def test_registrations_are_limited(api):
    def register(i):
        return api.post("/api/auth/register/", {
            "email": f"spam{i}@lexia.ma", "first_name": "S", "last_name": "P", "password": PASSWORD,
        }).status_code

    assert [register(i) for i in range(10)] == [201] * 10
    assert register(10) == 429


def test_chat_is_limited_per_user(auth_api, monkeypatch):
    from rag import pipeline

    def fake_answer(question, history):
        return pipeline.RagAnswer("réponse", "fr", [])

    monkeypatch.setattr(pipeline, "answer", fake_answer)
    statuses = [auth_api.post("/api/chat/", {"message": f"Question {i}"}).status_code for i in range(61)]
    assert statuses[:60] == [201] * 60
    assert statuses[60] == 429


# --- Jetons JWT --------------------------------------------------------------------

def test_refresh_rotates_and_old_refresh_is_revoked(api, user):
    tokens = login(api, user.email).data
    renewed = api.post("/api/auth/refresh/", {"refresh": tokens["refresh"]})
    assert renewed.status_code == 200
    assert renewed.data["refresh"] != tokens["refresh"]
    # Réutiliser l'ancien jeton (volé, par exemple) échoue.
    assert api.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}).status_code == 401


def test_logout_revokes_refresh_token(api, user):
    tokens = login(api, user.email).data
    assert api.post("/api/auth/logout/", {"refresh": tokens["refresh"]}).status_code == 200
    assert api.post("/api/auth/refresh/", {"refresh": tokens["refresh"]}).status_code == 401


def test_forged_token_is_rejected(api, user):
    token = login(api, user.email).data["access"]
    header, payload, signature = token.split(".")
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {header}.{payload}.{signature[::-1]}")
    assert api.get("/api/auth/me/").status_code == 401


# --- Contrôle d'accès ----------------------------------------------------------------

@pytest.mark.parametrize("url", [
    "/api/auth/me/", "/api/conversations/", "/api/laws/", "/api/articles/", "/api/chat/stream/",
    "/api/dashboard/stats/",
])
def test_private_endpoints_require_authentication(api, url):
    method = api.post if "chat" in url else api.get
    assert method(url).status_code == 401


def test_user_cannot_promote_himself_to_admin(auth_api, user):
    auth_api.patch("/api/auth/me/", {"is_staff": True, "is_superuser": True})
    user.refresh_from_db()
    assert not user.is_staff and not user.is_superuser


# --- Entrées -------------------------------------------------------------------------

def test_oversized_request_is_rejected(api):
    response = api.post("/api/auth/login/", {"email": "a@b.ma", "password": "x" * 300_000}, format="json")
    assert response.status_code in (400, 413)


def test_feedback_comment_length_is_limited(auth_api, user):
    answer = MessageFactory(conversation__user=user, role=Message.Role.ASSISTANT)
    response = auth_api.post(f"/api/messages/{answer.id}/feedback/", {"rating": -1, "comment": "x" * 1001})
    assert response.status_code == 400


def test_csv_export_neutralises_formulas(api):
    from dashboard.views import safe_cell

    assert safe_cell('=HYPERLINK("http://pirate.example","clic")').startswith("'=")
    assert safe_cell("+212 6 00 00 00 00") == "'+212 6 00 00 00 00"
    assert safe_cell("-1") == "'-1"
    assert safe_cell("@SUM(A1)") == "'@SUM(A1)"
    assert safe_cell("Question normale ?") == "Question normale ?"
    assert safe_cell("ما هي مدة الإشعار؟") == "ما هي مدة الإشعار؟"

    admin = UserFactory(is_staff=True)
    MessageFactory(conversation__user=admin, role=Message.Role.USER, content="=1+1")
    api.force_authenticate(admin)
    content = api.get("/api/dashboard/export/questions.csv?days=all").content.decode("utf-8")
    assert ";'=1+1;" in content


# --- En-têtes HTTP --------------------------------------------------------------------

def test_security_headers(api):
    response = api.get("/api/categories/")
    assert response["X-Frame-Options"] == "DENY"
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["Referrer-Policy"] == "same-origin"


def test_cors_rejects_unknown_origin(api):
    response = api.get("/api/categories/", HTTP_ORIGIN="https://site-pirate.example")
    assert "Access-Control-Allow-Origin" not in response
    allowed = api.get("/api/categories/", HTTP_ORIGIN="http://localhost:5173")
    assert allowed["Access-Control-Allow-Origin"] == "http://localhost:5173"


def test_health_endpoint_is_public(api):
    response = api.get("/api/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
