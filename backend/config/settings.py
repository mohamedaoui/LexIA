"""Configuration Django de LexIA."""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_DIR = BASE_DIR.parent
DATA_DIR = PROJECT_DIR / "data"

load_dotenv(BASE_DIR / ".env")


def env_list(name: str, default: str = "") -> list[str]:
    return [v.strip() for v in os.environ.get(name, default).split(",") if v.strip()]


DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() == "true"
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("DJANGO_SECRET_KEY doit être défini en production.")
    SECRET_KEY = "dev-only-insecure-key"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # LexIA
    "accounts",
    "legal",
    "chat",
    "rag",
    "dashboard",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr"
TIME_ZONE = "Africa/Casablanca"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # Fichiers de l'admin Django servis par whitenoise, compressés et versionnés.
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- API ---------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Limites de requêtes : contre le vol de mot de passe par essais répétés, les inscriptions
    # en masse et l'épuisement du quota Gemini. Compteurs par IP (anonymes) ou par compte.
    "DEFAULT_THROTTLE_RATES": {
        "login": os.environ.get("THROTTLE_LOGIN", "10/min"),
        "register": os.environ.get("THROTTLE_REGISTER", "10/hour"),
        "chat": os.environ.get("THROTTLE_CHAT", "60/hour"),
    },
    # Nombre de proxys de confiance devant Django (1 avec nginx) : pour retrouver l'IP réelle.
    "NUM_PROXIES": int(os.environ.get("DJANGO_NUM_PROXIES", "0")) or None,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Chaque renouvellement donne un nouveau jeton de rafraîchissement et invalide l'ancien :
    # un jeton volé ne sert qu'une fois, et la déconnexion le révoque.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

# Taille maximale d'une requête (questions de 4 000 caractères maximum).
DATA_UPLOAD_MAX_MEMORY_SIZE = 256 * 1024

# --- Sécurité en production ----------------------------------------------------

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# À activer quand le site est servi en HTTPS (derrière un proxy qui termine le TLS).
if os.environ.get("DJANGO_HTTPS", "False").lower() == "true":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

SPECTACULAR_SETTINGS = {
    "TITLE": "LexIA API",
    "DESCRIPTION": "API de l'assistant juridique marocain LexIA.",
    "VERSION": "0.1.0",
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": "accounts.models.User.Role",
        "MessageRoleEnum": "chat.models.Message.Role",
    },
}

# --- RAG ---------------------------------------------------------------------

CHROMA_DIR = Path(os.environ.get("CHROMA_DIR", BASE_DIR / "chroma_db"))
RAG_EMBEDDING_MODEL = os.environ.get("RAG_EMBEDDING_MODEL", "intfloat/multilingual-e5-base")
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "6"))
RAG_MIN_SCORE = float(os.environ.get("RAG_MIN_SCORE", "0.0"))
RAG_HISTORY_MESSAGES = 10
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
# Essayés dans l'ordre si le modèle principal échoue (quota gratuit : ~20 requêtes/jour/modèle sur Flash).
GEMINI_FALLBACK_MODELS = env_list("GEMINI_FALLBACK_MODELS", "gemini-3.1-flash-lite,gemini-3.5-flash")
GEMINI_THINKING_LEVEL = os.environ.get("GEMINI_THINKING_LEVEL", "low")
# Charge le modèle d'embeddings au démarrage du serveur (sinon ~1 à 2 min sur la 1re question).
RAG_PRELOAD = os.environ.get("RAG_PRELOAD", "True").lower() == "true"

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
)
