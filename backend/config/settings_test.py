"""Réglages pour pytest : base SQLite en mémoire, clé de test, hash de mot de passe rapide."""

import os

os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-key-not-for-production-use-0123456789")

from .settings import *  # noqa: E402,F401,F403

DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
