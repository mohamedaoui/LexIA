# LexIA — Backend (Django + DRF)

## Structure

```
backend/
├── config/      # Réglages Django, URLs racine
├── accounts/    # Utilisateurs (connexion par email, rôles), inscription, JWT
├── legal/       # Catégories, textes de loi, articles, FAQ + commande import_laws
├── chat/        # Conversations, messages, sources citées, feedback, endpoint /api/chat/
├── rag/         # Pipeline RAG : embeddings, ChromaDB, Gemini, commandes index_articles et classify_messages
├── dashboard/   # Statistiques et exports CSV pour les administrateurs
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
python manage.py import_laws      # importe data/PDF_text + catégories de data/categories.json (~1 min)
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
| GET | `/api/dashboard/stats/?days=7\|30\|90\|all` | administrateur |
| GET | `/api/dashboard/export/questions.csv`, `/api/dashboard/export/feedback.csv` | administrateur |

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

## Catégories juridiques

- `data/categories.json` définit 17 domaines (famille, travail, pénal, immobilier...) et
  classe chacune des 247 lois dans l'un d'eux. Après une modification du fichier :
  `python manage.py load_categories`.
- **Catégorie d'une question** : calculée à partir des articles trouvés par la recherche.
  Chaque article apporte son score de pertinence à la catégorie de sa loi ; la catégorie
  qui pèse le plus est retenue si elle représente au moins 40 % du total (sinon : aucune,
  par exemple pour « Bonjour »). Aucun appel supplémentaire au LLM.
- La catégorie est enregistrée sur la question et la réponse (`Message.category`), envoyée
  au frontend (événement `category` du streaming) et servira aux statistiques du dashboard.

## Tableau de bord administrateur

Réservé aux comptes `is_staff` (créer le sien : `python manage.py createsuperuser`, ou cocher
« Statut équipe » dans l'admin Django). Dans l'interface : lien **Tableau de bord** en bas de la
barre latérale, ou http://localhost:5173/dashboard.

- Chiffres clés : questions, utilisateurs actifs, satisfaction (👍 / 👎), questions non classées.
- Questions par jour, par domaine juridique (avec satisfaction par domaine), par langue,
  profils des inscrits, textes de loi les plus cités, derniers avis négatifs.
- Filtre de période (7, 30, 90 jours, tout) appliqué à toute la page et aux exports.
- Exports CSV (séparateur `;`, UTF-8 avec BOM : s'ouvrent directement dans Excel, arabe
  compris). Les utilisateurs y sont identifiés par leur numéro, sans email.
- Après une modification de `data/categories.json` : `python manage.py load_categories` puis
  `python manage.py classify_messages --all` pour reclasser l'historique.

## Limites connues

- `runserver` ne relit pas `.env` lors d'un rechargement automatique, et le rechargement
  peut rater une modification : en cas de comportement inattendu, redémarrer le serveur.
- 3 fichiers du corpus utilisent des « formes de présentation » arabes (ex. `ﺍﻟﺼﻴﻐﺔ`) :
  à normaliser (Unicode NFKC) lors d'un prochain import.

- `import_laws` ne découpe pas 36 fichiers sur 247 : PDF scannés (OCR nécessaire) ou
  articles numérotés en lettres (« الفصل الأول », « الفصل الثاني »...).
