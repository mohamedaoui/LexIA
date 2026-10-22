from django.db import connection
from django.http import JsonResponse

from legal.models import LegalArticle


def health(request):
    """État du service, pour la surveillance et le healthcheck Docker (sans authentification)."""
    try:
        connection.ensure_connection()
        indexed = LegalArticle.objects.exclude(vector_id="").count()
    except Exception:
        return JsonResponse({"status": "error", "database": False}, status=503)
    return JsonResponse({"status": "ok", "database": True, "indexed_articles": indexed})
