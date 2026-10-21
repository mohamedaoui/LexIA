# LexIA — Backend (Django + DRF)

## Structure

```
backend/
├── config/      # Réglages Django, URLs racine
├── accounts/    # Utilisateurs (connexion par email, rôles), inscription, JWT
├── legal/       # Catégories, textes de loi, articles, FAQ + commande import_laws
├── chat/        # Conversations, messages, sources citées, feedback
├── ingestion/   # Anciens scripts du pipeline (téléchargement des PDF, extraction) — référence
└── conftest.py  # Fixtures et factories pour pytest
```

## Installation (Windows)

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # puis mettre une vraie DJANGO_SECRET_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py import_laws    # importe data/PDF_text dans la base
python manage.py runserver
```

Sans `DATABASE_URL` dans `.env`, la base est SQLite (`db.sqlite3`). Pour PostgreSQL :
`DATABASE_URL=postgres://utilisateur:motdepasse@localhost:5432/lexia`.

Avec Docker (depuis la racine du projet) : `docker compose up --build`.

## Adresses utiles

| URL | Contenu |
|---|---|
| http://localhost:8000/admin/ | Administration Django |
| http://localhost:8000/api/docs/ | Documentation Swagger de l'API |

## API

| Méthode | URL | Accès |
|---|---|---|
| POST | `/api/auth/register/` | public |
| POST | `/api/auth/login/` → `{access, refresh}` | public |
| POST | `/api/auth/refresh/` | public |
| GET / PATCH | `/api/auth/me/` | connecté |
| GET | `/api/categories/`, `/api/faqs/` | public (écriture : admin) |
| GET | `/api/laws/`, `/api/articles/` | connecté |
| CRUD | `/api/conversations/` | connecté, ses propres conversations |
| POST | `/api/messages/{id}/feedback/` | connecté, réponses de ses conversations |

Les requêtes authentifiées envoient l'en-tête `Authorization: Bearer <access>`.

## Tests

```powershell
pytest --cov=accounts --cov=legal --cov=chat
```

## À faire (Sprint 4)

- Endpoint `POST /api/chat/` : pipeline RAG (LangChain + ChromaDB + LLM).
- `import_laws` ne découpe pas 36 fichiers sur 247 : PDF scannés (OCR nécessaire) ou
  articles numérotés en lettres (« الفصل الأول », « الفصل الثاني »...).
