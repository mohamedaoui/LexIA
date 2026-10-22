"""Configuration de gunicorn (serveur de production).

Un seul processus avec plusieurs threads : le modèle d'embeddings (~1 Go en mémoire) n'est
chargé qu'une fois, et les calculs de PyTorch libèrent le GIL. Les réponses en streaming
occupent un thread pendant quelques secondes : 8 threads = 8 réponses simultanées.
"""

import os
import threading

bind = "0.0.0.0:8000"
workers = int(os.environ.get("GUNICORN_WORKERS", "1"))
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", "8"))
timeout = 180
accesslog = "-"
errorlog = "-"


def post_worker_init(worker):
    from django.conf import settings

    if settings.RAG_PRELOAD:
        from rag.store import warm_up

        threading.Thread(target=warm_up, daemon=True, name="rag-preload").start()
