# LexIA — Assistant juridique marocain (RAG)

Projet individuel réalisé par **Mohamed Aouijil**.

LexIA est un assistant qui répond aux questions sur le droit marocain en s'appuyant sur
les textes de loi officiels (RAG : *Retrieval-Augmented Generation*). Le plan complet
du projet est dans [docs/LexIA_Plan_Projet_v1.1.pdf](docs/LexIA_Plan_Projet_v1.1.pdf).

## Structure du dépôt

```
.
├── frontend/   # Application web (Next.js + TypeScript + Tailwind) : pages, chat, auth
├── backend/    # Pipeline IA en Python : extraction, découpage par article, embeddings, base vectorielle
├── data/       # Corpus juridique : 247 lois marocaines converties en texte (data/PDF_text)
└── docs/       # Documentation du projet (plan, cahier des charges, ...)
```

### data/
- `PDF_text/` : textes de loi en arabe, extraits des PDF publiés par le CSPJ
  (https://cspj.ma/bibliotheque/legislations).
- `PDFs/` (non versionné) : PDF bruts, re-téléchargeables avec `backend/download_data.py`.

### backend/
| Fichier | Rôle |
|---|---|
| `download_data.py` | Télécharge les PDF des lois dans `data/PDFs` |
| `extract.py` | PDF → texte (`pdftotext`), nettoyage, découpage par article |
| `main.py` | Indexation : traduction, embeddings, envoi dans la base vectorielle |
| `model.py` | Client du modèle (embeddings + génération) |
| `database.py` | Accès à la base vectorielle |
| `test_extract.py` | Tests du découpage en articles |

Installation : `cd backend && uv sync`, puis copier `.env.example` en `.env`.

### frontend/
Application Next.js (authentification JWT, sessions de chat, historique, affichage RTL arabe).

```
cd frontend
npm install
npx prisma migrate dev
npm run dev
```
Variables d'environnement (`frontend/.env`) : `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `PINECONE_API_KEY`.

## Feuille de route
Selon le plan v1.1 : migration du backend vers **Django 5 + DRF**, pipeline RAG avec
**LangChain + ChromaDB**, frontend **React 18**, et déploiement **Docker Compose**.

## Crédits
Le code de départ est basé sur le projet open source
[Moroccan-AI-Law-Assistant](https://github.com/ayoubdya/Moroccan-AI-Law-Assistant) (licence MIT).
