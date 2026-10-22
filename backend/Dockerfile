FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/hf-cache \
    CHROMA_DIR=/app/chroma_db

WORKDIR /app/backend

# PyTorch sans GPU (≈ 200 Mo au lieu de plusieurs Go pour la version CUDA).
COPY requirements.txt .
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Utilisateur sans privilèges ; dossiers persistants (index, cache du modèle) montés en volumes.
RUN useradd --create-home --uid 1000 lexia \
    && mkdir -p /app/chroma_db /app/hf-cache /app/backend/staticfiles \
    && chown -R lexia:lexia /app \
    && chmod +x docker-entrypoint.sh
USER lexia

RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi", "-c", "gunicorn.conf.py"]
