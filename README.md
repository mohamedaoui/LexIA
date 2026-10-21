# LexIA — Assistant juridique marocain (RAG)

Projet individuel réalisé par **Mohamed Aouijil**.

LexIA est un assistant qui répond aux questions sur le droit marocain en s'appuyant sur
les textes de loi officiels (RAG : *Retrieval-Augmented Generation*). Le plan complet
du projet est dans [docs/LexIA_Plan_Projet_v1.1.pdf](docs/LexIA_Plan_Projet_v1.1.pdf).

## Structure du dépôt

```
.
├── backend/             # API Django 5 + DRF (auth JWT, conversations, base juridique) — voir backend/README.md
├── frontend/            # Interface web (actuellement Next.js, migration vers React prévue)
├── data/                # Corpus juridique : 247 lois marocaines en texte (data/PDF_text)
├── docs/                # Plan du projet, conception (architecture, ERD, API)
└── docker-compose.yml   # PostgreSQL + backend
```

### Démarrage rapide du backend

```powershell
cd backend
py -3.12 -m venv .venv; .venv\Scriptsctivate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py import_laws
python manage.py runserver
```

Documentation de l'API : http://localhost:8000/api/docs/ — Conception : [docs/conception.md](docs/conception.md).

### data/
- `PDF_text/` : textes de loi en arabe, extraits des PDF publiés par le CSPJ
  (https://cspj.ma/bibliotheque/legislations).
- `PDFs/` (non versionné) : PDF bruts, re-téléchargeables avec `backend/ingestion/download_data.py`.

## Feuille de route
Selon le plan v1.1 : migration du backend vers **Django 5 + DRF**, pipeline RAG avec
**LangChain + ChromaDB**, frontend **React 18**, et déploiement **Docker Compose**.

## Crédits
Le code de départ est basé sur le projet open source
[Moroccan-AI-Law-Assistant](https://github.com/ayoubdya/Moroccan-AI-Law-Assistant) (licence MIT).
