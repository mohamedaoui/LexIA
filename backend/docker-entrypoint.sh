#!/bin/sh
# Prépare la base avant de lancer le serveur : migrations, puis corpus juridique au premier
# démarrage. L'indexation (longue) se lance à part : voir docs/deploiement.md.
set -e
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings}"

python manage.py migrate --noinput

has_laws=$(python -c "
import django
django.setup()
from legal.models import LegalDocument
print(LegalDocument.objects.exists())
")

if [ "$has_laws" = "False" ]; then
    echo "Base juridique vide : import des lois de /app/data..."
    python manage.py import_laws
else
    python manage.py load_categories
fi

exec "$@"
