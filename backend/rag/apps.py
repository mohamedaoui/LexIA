import os
import sys
import threading

from django.apps import AppConfig
from django.conf import settings


class RagConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "rag"
    verbose_name = "Pipeline RAG"

    def ready(self):
        # Seulement pour le serveur web (pas pour les tests ni les autres commandes),
        # et dans le processus enfant de runserver (celui qui sert les requêtes).
        serving = "runserver" in sys.argv and os.environ.get("RUN_MAIN") == "true"
        if settings.RAG_PRELOAD and serving:
            from .store import get_embeddings, get_vectorstore

            def preload():
                get_vectorstore()
                get_embeddings().embed_query("préchargement")

            threading.Thread(target=preload, daemon=True, name="rag-preload").start()
