from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from legal.models import LegalArticle, LegalDocument
from legal.parsing import split_articles


class Command(BaseCommand):
    help = "Importe les textes de loi de data/PDF_text dans la base (documents + articles)."

    def add_arguments(self, parser):
        parser.add_argument("--folder", default=str(settings.DATA_DIR / "PDF_text"))
        parser.add_argument("--limit", type=int, help="Importer seulement les N premiers fichiers.")

    def handle(self, folder, limit, **options):
        files = sorted(Path(folder).glob("*.txt"))[:limit]
        if not files:
            self.stderr.write(f"Aucun fichier .txt dans {folder}")
            return

        total_articles, skipped = 0, []
        for path in files:
            articles = split_articles(path.read_text(encoding="utf-8"))
            if not articles:
                skipped.append(path.name)
                continue

            with transaction.atomic():
                document, _ = LegalDocument.objects.update_or_create(
                    source_file=path.name,
                    defaults={"title": path.stem.strip()},
                )
                document.articles.all().delete()
                LegalArticle.objects.bulk_create(
                    LegalArticle(document=document, position=i, number=number or "", content=content)
                    for i, (number, content) in enumerate(articles, start=1)
                )
            total_articles += len(articles)
            self.stdout.write(f"{path.name}: {len(articles)} articles")

        self.stdout.write(self.style.SUCCESS(
            f"{len(files) - len(skipped)} textes importés, {total_articles} articles."
        ))
        if skipped:
            self.stdout.write(self.style.WARNING(
                f"{len(skipped)} fichiers sans article détecté : " + ", ".join(skipped)
            ))
