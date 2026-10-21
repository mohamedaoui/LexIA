import time

from django.core.management.base import BaseCommand

from legal.models import LegalArticle
from rag.chunking import split_for_embedding
from rag.store import get_vectorstore

BATCH_ARTICLES = 64


class Command(BaseCommand):
    help = (
        "Indexe les articles de loi dans ChromaDB. Reprend là où il s'est arrêté : "
        "seuls les articles sans vector_id sont traités (--reset pour tout refaire)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Vide la collection et réindexe tout.")
        parser.add_argument("--limit", type=int, help="Indexer au plus N articles (pour tester).")

    def handle(self, reset, limit, **options):
        store = get_vectorstore()
        if reset:
            store.reset_collection()
            LegalArticle.objects.exclude(vector_id="").update(vector_id="")

        pending = LegalArticle.objects.filter(vector_id="").select_related("document").order_by("id")
        total = pending.count() if limit is None else min(limit, pending.count())
        if not total:
            self.stdout.write(self.style.SUCCESS("Tous les articles sont déjà indexés."))
            return

        self.stdout.write(f"{total} articles à indexer (chargement du modèle...)")
        done, chunks_total, started = 0, 0, time.monotonic()

        while done < total:
            batch = list(pending[: min(BATCH_ARTICLES, total - done)])
            texts, metadatas, ids = [], [], []
            for article in batch:
                for i, chunk in enumerate(split_for_embedding(article.content)):
                    texts.append(chunk)
                    ids.append(f"article-{article.id}-{i}")
                    metadatas.append({
                        "article_id": article.id,
                        "document_id": article.document_id,
                        "document_title": article.document.title,
                        "number": article.number,
                    })

            store.add_texts(texts=texts, metadatas=metadatas, ids=ids)
            for article in batch:
                article.vector_id = f"article-{article.id}"
            LegalArticle.objects.bulk_update(batch, ["vector_id"])

            done += len(batch)
            chunks_total += len(texts)
            elapsed = time.monotonic() - started
            remaining = elapsed / done * (total - done)
            self.stdout.write(
                f"{done}/{total} articles ({chunks_total} morceaux) — "
                f"{elapsed / 60:.1f} min écoulées, ~{remaining / 60:.0f} min restantes"
            )

        self.stdout.write(self.style.SUCCESS(f"Indexation terminée : {done} articles, {chunks_total} morceaux."))
