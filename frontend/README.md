# LexIA — Frontend (React 18 + TypeScript + Tailwind)

## Démarrage

Le backend Django doit tourner sur `http://localhost:8000` (voir `backend/README.md`).

```powershell
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173. En développement, Vite redirige `/api` vers Django : pas de
configuration CORS à faire.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests (Vitest) |
| `npm run typecheck` | Vérification TypeScript |
| `npm run build` | Build de production dans `dist/` |

## Structure

```
src/
├── api/
│   ├── client.ts      # Axios + jeton JWT, renouvellement automatique sur 401
│   ├── auth.ts        # Connexion, inscription, profil
│   ├── chat.ts        # Conversations, articles, feedback, streaming de la réponse
│   ├── sse.ts         # Lecture du flux Server-Sent Events (+ sse.test.ts)
│   └── types.ts       # Types des réponses de l'API
├── components/        # Sidebar, MessageBubble, SourceList, ChatInput, LanguageSwitch...
├── pages/             # LoginPage, RegisterPage, ChatPage
├── auth.tsx           # Contexte de session + route protégée
└── i18n.tsx           # Textes FR / AR et bascule de direction (RTL)
```

## Fonctionnalités

- Inscription, connexion, déconnexion ; session conservée (jetons JWT dans `localStorage`).
- Chat avec réponse affichée **mot par mot** (`POST /api/chat/stream/`), bouton « Arrêter ».
- Historique des conversations, suppression, URL par conversation (`/c/:id`).
- Sources de chaque réponse : texte de loi, numéro d'article, pertinence, texte complet
  de l'article à la demande.
- Feedback 👍 / 👎 sur chaque réponse.
- Interface en français ou en arabe (mise en page RTL complète) ; chaque message prend
  automatiquement la direction de sa langue (`dir="auto"`).
- Questions suggérées sur l'écran d'accueil, affichage mobile avec menu latéral.
- **Tableau de bord administrateur** (`/dashboard`, comptes `is_staff`) : chiffres clés,
  graphiques avec info-bulles et vue tableau, avis négatifs, exports CSV.
