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
        # Seulement pour le serveur de développement (pas pour les tests ni les autres commandes),
        # dans le processus enfant de runserver. En production : voir gunicorn.conf.py.
        serving = "runserver" in sys.argv and os.environ.get("RUN_MAIN") == "true"
        if settings.RAG_PRELOAD and serving:
            from .store import warm_up

            threading.Thread(target=warm_up, daemon=True, name="rag-preload").start()
