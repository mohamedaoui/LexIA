# LexIA — Backend (Django + DRF)

## Structure

```
backend/
├── config/      # Réglages Django, URLs racine
├── accounts/    # Utilisateurs (connexion par email, rôles), inscription, JWT
├── legal/       # Catégories, textes de loi, articles, FAQ + commande import_laws
├── chat/        # Conversations, messages, sources citées, feedback, endpoint /api/chat/
├── rag/         # Pipeline RAG : embeddings, ChromaDB, Gemini, commande index_articles
├── ingestion/   # Anciens scripts du pipeline (téléchargement des PDF, extraction) — référence
└── conftest.py  # Fixtures et factories pour pytest
```

## Installation (Windows)

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install torch --index-url https://download.pytorch.org/whl/cpu   # PyTorch sans GPU (léger)
pip install -r requirements.txt
copy .env.example .env      # puis remplir DJANGO_SECRET_KEY et GEMINI_API_KEY
python manage.py migrate
python manage.py createsuperuser
python manage.py import_laws      # importe data/PDF_text dans la base (~1 min)
python manage.py index_articles   # embeddings dans ChromaDB (~1 h 30 sur CPU, reprend si interrompu)
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
| POST | `/api/chat/` `{message, conversation_id?}` | connecté — question → réponse RAG avec articles cités |
| POST | `/api/messages/{id}/feedback/` | connecté, réponses de ses conversations |

Les requêtes authentifiées envoient l'en-tête `Authorization: Bearer <access>`.

## Tests

```powershell
pytest --cov=accounts --cov=legal --cov=chat --cov=rag
```

## Pipeline RAG

```
question ──► embedding (multilingual-e5-base, local) ──► ChromaDB : articles les plus proches
                                                              │
historique + articles + prompt système ──► Gemini ──► réponse + avertissement légal + sources
```

- **Embeddings** : `intfloat/multilingual-e5-base`, exécuté en local, comprend directement
  l'arabe et le français (pas de traduction intermédiaire). Les articles longs sont découpés
  en morceaux de ~1 200 caractères avec chevauchement (`rag/chunking.py`).
- **Base vectorielle** : ChromaDB persistée dans `backend/chroma_db/` (non versionnée).
- **LLM** : Gemini via LangChain (`GEMINI_MODEL` dans `.env`). Changer de fournisseur ne
  touche que `rag/store.py`.
- **Avertissement légal** : ajouté par le backend à 100 % des réponses (critère CR5), en
  arabe si la question est en alphabet arabe, sinon en français.
- **Traçabilité** : chaque réponse enregistre les articles utilisés et leur score
  (`MessageSource`), renvoyés au frontend dans `sources`.

## Limites connues

- `import_laws` ne découpe pas 36 fichiers sur 247 : PDF scannés (OCR nécessaire) ou
  articles numérotés en lettres (« الفصل الأول », « الفصل الثاني »...).
