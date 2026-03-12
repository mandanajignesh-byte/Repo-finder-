<div align="center">

<img src="public/logo-192.png" alt="RepoVerse Logo" width="96" height="96" />

# RepoVerse · RepoFinder

**Discover GitHub repositories you'll actually love — swipe, save, and explore.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Flutter](https://img.shields.io/badge/Flutter-3-02569B?logo=flutter&logoColor=white)](https://flutter.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-000?logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

<br/>

<img src="public/og-image.png" alt="RepoVerse App Screenshot" width="700" />

</div>

---

## What is this?

**RepoVerse** (web) and **RepoFinder** (iOS) are two connected apps that help developers discover hidden-gem GitHub repositories tailored to their interests — through a Tinder-style swipe interface, personalized recommendations, and a real-time trending feed.

- **Web app** → Runs in any browser as a PWA, sign in with GitHub OAuth
- **iOS app** → Native Flutter app, sign in with Apple, published to the App Store

Both apps share the same Supabase backend and a master repository database of curated GitHub repos.

---

## Features

| Feature | Web (RepoVerse) | iOS (RepoFinder) |
|---|:---:|:---:|
| Swipe-to-discover repos | ✅ | ✅ |
| Personalized recommendations | ✅ | ✅ |
| Trending repos feed | ✅ | ✅ |
| Save & like repos | ✅ | ✅ |
| Onboarding preference quiz | ✅ | ✅ |
| AI-powered discovery agent | ✅ | — |
| GitHub OAuth sign-in | ✅ | — |
| Apple Sign-In | — | ✅ |
| PayPal subscriptions | ✅ | — |
| RevenueCat in-app purchases | — | ✅ |
| PWA (installable) | ✅ | — |

---

## Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["🌐 RepoVerse Web\nReact 18 · TypeScript · Vite\nTailwindCSS · shadcn/ui · PWA"]
        IOS["📱 RepoFinder iOS\nFlutter · Dart\nMaterial Design"]
    end

    subgraph "Auth"
        GHAUTH["GitHub OAuth"]
        AAPL["Apple Sign-In"]
    end

    subgraph "Backend (Supabase)"
        AUTH["Auth Service\n(JWT sessions)"]
        DB[("PostgreSQL\nDatabase")]
        RLS["Row-Level Security\nPolicies"]
        EDGE["Edge Functions\n(Deno)"]
    end

    subgraph "Database Tables"
        REPOS["repos_master\n(shared repo catalog)"]
        AUSERS["app_users\napp_user_preferences"]
        INTER["app_user_interactions\napp_saved_repos\napp_liked_repos"]
        TREND["trending_repos\nrepo_clusters"]
    end

    subgraph "Monetization"
        PAYPAL["PayPal\nSubscriptions"]
        RCAT["RevenueCat\nIn-App Purchases"]
    end

    subgraph "Data Pipeline"
        INGEST["Node.js Ingestion Scripts\n(GitHub API → repos_master)"]
        RECO["Recommendation Engine\n(cluster-based scoring)"]
        CRON["Vercel Cron Jobs\n(daily trending updates)"]
    end

    WEB -->|"GitHub OAuth"| GHAUTH
    IOS -->|"Apple Sign-In"| AAPL
    GHAUTH --> AUTH
    AAPL --> AUTH
    WEB <-->|"Supabase JS SDK"| DB
    IOS <-->|"Supabase Dart SDK"| DB
    DB --- RLS
    DB --- REPOS
    DB --- AUSERS
    DB --- INTER
    DB --- TREND
    WEB --> PAYPAL
    IOS --> RCAT
    INGEST -->|"batch upsert"| REPOS
    RECO -->|"score & rank"| AUSERS
    CRON --> INGEST
    EDGE --> RECO
```

---

## Database Schema

```mermaid
erDiagram
    repos_master {
        bigint github_id PK
        text full_name
        text description
        text language
        int stargazers_count
        int forks_count
        text[] topics
        float quality_score
        float trending_score
        timestamptz updated_at
    }
    app_users {
        uuid id PK
        text apple_user_id
        text email
        boolean is_pro
        timestamptz created_at
    }
    app_user_preferences {
        uuid user_id FK
        text[] languages
        text[] topics
        text coding_level
        timestamptz updated_at
    }
    app_user_interactions {
        uuid user_id FK
        bigint repo_github_id FK
        text action
        timestamptz created_at
    }
    app_saved_repos {
        uuid user_id FK
        bigint repo_github_id FK
        timestamptz saved_at
    }

    app_users ||--|| app_user_preferences : "has"
    app_users ||--o{ app_user_interactions : "makes"
    app_users ||--o{ app_saved_repos : "saves"
    repos_master ||--o{ app_user_interactions : "receives"
    repos_master ||--o{ app_saved_repos : "in"
```

---

## Project Structure

```
Repo-finder/
├── src/                        # Web app source
│   ├── app/
│   │   └── components/         # React components
│   │       ├── DiscoveryScreen.tsx   # Swipe card UI
│   │       ├── TrendingScreen.tsx    # Trending feed
│   │       ├── ProfileScreen.tsx     # User profile
│   │       ├── PaywallModal.tsx      # Subscription gate
│   │       └── AgentScreen.tsx       # AI discovery agent
│   ├── services/               # API & business logic
│   │   ├── supabase.service.ts
│   │   ├── recommendation.service.ts
│   │   ├── github.service.ts
│   │   └── payment.service.ts
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Supabase client, types
├── RepoFinderMobile/           # Flutter iOS app
│   └── lib/
│       ├── screens/            # App screens
│       │   ├── discovery_screen.dart
│       │   ├── trending_screen.dart
│       │   ├── saved_screen.dart
│       │   └── paywall_screen.dart
│       └── services/           # Flutter services
│           ├── app_supabase_service.dart
│           ├── auth_service.dart
│           ├── repo_service.dart
│           └── revenuecat_service.dart
├── scripts/                    # Data ingestion pipeline
│   └── ingest-*.js
├── server/                     # API server
└── public/                     # Static assets
```

---

## Screenshots

<div align="center">
<table>
  <tr>
    <td align="center"><img src="public/screenshots/discover-feed.png" width="220" alt="Discover Feed"/><br/><sub>Swipe Discovery</sub></td>
    <td align="center"><img src="public/screenshots/trending.png" width="220" alt="Trending"/><br/><sub>Trending Repos</sub></td>
    <td align="center"><img src="public/screenshots/filter-preferences.png" width="220" alt="Preferences"/><br/><sub>Preferences</sub></td>
    <td align="center"><img src="public/screenshots/coding-level.png" width="220" alt="Coding Level"/><br/><sub>Coding Level</sub></td>
  </tr>
</table>
</div>

---

## Getting Started

### Web App

**Prerequisites:** Node.js 18+, a Supabase project, GitHub OAuth app, PayPal app

```bash
# Clone the repo
git clone https://github.com/mandanajignesh-byte/Repo-finder-.git
cd Repo-finder-

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_PAYPAL_CLIENT_ID

# Start dev server
npm run dev
```

### iOS App (Flutter)

**Prerequisites:** Flutter 3.x, Xcode 15+, RevenueCat account, Supabase project

```bash
cd RepoFinderMobile

# Install Flutter packages
flutter pub get

# Run on iOS simulator
flutter run -d ios

# Build for release
flutter build ios --release
```

### Data Ingestion Pipeline

The `scripts/` directory contains Node.js scripts to populate `repos_master` from the GitHub API.

```bash
# Ingest repos by keyword/language clusters
node scripts/ingest-balanced.js

# Fetch and update daily trending
node scripts/fetch-daily-trending.js

# Compute recommendation scores
node scripts/compute-recommendations.js
```

---

## Tech Stack

### Web (RepoVerse)
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| UI | TailwindCSS + shadcn/ui + Radix UI |
| Auth | GitHub OAuth via Supabase |
| Backend | Supabase (PostgreSQL + RLS) |
| Payments | PayPal Subscriptions |
| Deployment | Vercel + Cron Jobs |
| Analytics | Vercel Analytics |

### Mobile (RepoFinder iOS)
| Layer | Technology |
|---|---|
| Framework | Flutter 3 + Dart |
| Auth | Apple Sign-In |
| Backend | Supabase Dart SDK |
| Payments | RevenueCat |
| Swipe UI | appinio_swiper |
| CI/CD | Codemagic |

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push and open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/mandanajignesh-byte">mandanajignesh-byte</a></sub>
</div>
