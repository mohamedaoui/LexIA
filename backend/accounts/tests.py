import pytest

from accounts.models import User

pytestmark = pytest.mark.django_db

PASSWORD = "Motdepasse-solide-42"


def test_register_then_login(api):
    response = api.post("/api/auth/register/", {
        "email": "Mohamed@Lexia.ma",
        "first_name": "Mohamed",
        "last_name": "Aouijil",
        "password": PASSWORD,
        "role": "student",
    })
    assert response.status_code == 201
    assert "password" not in response.data

    response = api.post("/api/auth/login/", {"email": "Mohamed@lexia.ma", "password": PASSWORD})
    assert response.status_code == 200
    assert {"access", "refresh"} <= response.data.keys()


def test_register_rejects_weak_password(api):
    response = api.post("/api/auth/register/", {
        "email": "a@lexia.ma", "first_name": "A", "last_name": "B", "password": "123",
    })
    assert response.status_code == 400
    assert not User.objects.exists()


def test_login_wrong_password(api, user):
    response = api.post("/api/auth/login/", {"email": user.email, "password": "faux"})
    assert response.status_code == 401


def test_me_requires_authentication(api):
    assert api.get("/api/auth/me/").status_code == 401


def test_me_returns_profile_with_jwt(api, user):
    token = api.post("/api/auth/login/", {"email": user.email, "password": PASSWORD}).data["access"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    response = api.get("/api/auth/me/")
    assert response.status_code == 200
    assert response.data["email"] == user.email


def test_me_cannot_promote_to_staff(auth_api, user):
    auth_api.patch("/api/auth/me/", {"is_staff": True, "role": "lawyer"})
    user.refresh_from_db()
    assert user.role == "lawyer"
    assert not user.is_staff
