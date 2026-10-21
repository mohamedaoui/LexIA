import pytest
from django.core.management import call_command

from legal.models import Category, LegalArticle, LegalDocument
from legal.parsing import split_articles

SAMPLE = "قانون\nالمادة األولى\nنص المادة الأولى، انظر المادة 7\nالمادة 2\nنص الثانية.\nالفصل 3\nنص الثالثة.\n"


def test_split_articles_numbers_and_content():
    articles = split_articles(SAMPLE)
    assert [number for number, _ in articles] == ["1", "2", "3"]
    assert "نص الثانية" in articles[1][1]


def test_split_articles_ignores_cross_references():
    text = "المادة 1\nانظر\nالمادة 9\nللتفاصيل\nالمادة 2\nنص\n"
    articles = split_articles(text)
    assert len(articles) == 2
    assert "المادة 9" in articles[0][1]


def test_split_articles_without_articles():
    assert split_articles("نص بدون مواد") == []


@pytest.mark.django_db
def test_import_laws_is_idempotent(tmp_path):
    (tmp_path / "قانون تجريبي.txt").write_text(SAMPLE, encoding="utf-8")
    (tmp_path / "scan.txt").write_text("vide", encoding="utf-8")

    call_command("import_laws", folder=str(tmp_path))
    call_command("import_laws", folder=str(tmp_path))

    assert LegalDocument.objects.count() == 1
    assert LegalArticle.objects.count() == 3


@pytest.mark.django_db
def test_categories_public_read_admin_write(api, user):
    payload = {"slug": "travail", "name_fr": "Droit du travail"}
    # Lecture publique (catégories et FAQ affichées sur la page d'accueil).
    assert api.get("/api/categories/").status_code == 200
    assert api.post("/api/categories/", payload).status_code == 401
    api.force_authenticate(user)
    assert api.post("/api/categories/", payload).status_code == 403

    user.is_staff = True
    user.save()
    assert api.post("/api/categories/", payload).status_code == 201
    assert Category.objects.filter(slug="travail").exists()
