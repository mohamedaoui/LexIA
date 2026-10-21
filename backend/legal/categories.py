"""Catégories juridiques et classement des textes de loi, définis dans data/categories.json."""

import json
from pathlib import Path

from django.conf import settings
from django.db import transaction

from .models import Category, LegalDocument

CATEGORIES_FILE = settings.DATA_DIR / "categories.json"


@transaction.atomic
def load_categories(path: Path = CATEGORIES_FILE) -> tuple[int, int]:
    """Crée ou met à jour les catégories et rattache chaque texte de loi à la sienne.
    Retourne (nombre de catégories, nombre de textes classés)."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))

    categories = {}
    for item in data["categories"]:
        category, _ = Category.objects.update_or_create(
            slug=item["slug"],
            defaults={"name_fr": item["name_fr"], "name_ar": item["name_ar"]},
        )
        categories[item["slug"]] = category

    classified = 0
    for slug, files in data["laws"].items():
        classified += LegalDocument.objects.filter(source_file__in=files).update(category=categories[slug])
    return len(categories), classified
