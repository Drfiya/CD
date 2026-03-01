# Community.md — ScienceExperts.ai Community Platform

> **Letzte Aktualisierung:** Februar 2026
> **Live-URL:** [https://www.scienceexperts.ai](https://www.scienceexperts.ai)
> **Repository:** [https://github.com/Chriss54/CommunityDesign](https://github.com/Chriss54/CommunityDesign)

---

## 1. Was ist ScienceExperts.ai?

ScienceExperts.ai ist eine **selbst-gehostete Community-Plattform** für Wissenschaftler, Forscher und Experten aus dem Life-Science-Bereich. Die Plattform ist ein Feature-vollständiger **Klon des Skool-Modells** (Community + Classroom + Gamification), jedoch vollständig selbst entwickelt und unter eigener Kontrolle — ohne Abhängigkeit von Drittanbieter-Plattformen.

### Kernmission

Die Plattform verbindet eine **globale wissenschaftliche Community** mit einem **integrierten Learning-Management-System (LMS)**, einem **Event-Kalender**, einem **Gamification-System** und **KI-gestützten Tools**. Das zentrale Alleinstellungsmerkmal ist die **vollständige Mehrsprachigkeit**: Jeder Nutzer sieht die Community automatisch in seiner Sprache — sowohl die UI als auch die Inhalte (Posts, Kommentare, Kurse) werden in Echtzeit übersetzt.

---

## 2. Technologie-Stack

| Kategorie | Technologie | Version |
|:---|:---|:---|
| **Framework** | Next.js (App Router, Turbopack) | 16.1.4 |
| **Frontend** | React | 19.2.3 |
| **Sprache** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.x |
| **Datenbank** | PostgreSQL (via Supabase) | — |
| **ORM** | Prisma (custom output) | 7.3.0 |
| **Authentifizierung** | NextAuth.js (JWT, Credentials Provider) | 4.24.x |
| **Dateispeicher** | Supabase Storage (Buckets + RLS) | — |
| **Zahlungen** | Stripe (Subscriptions + Checkout) | 20.3.x |
| **Rich-Text-Editor** | Tiptap (ProseMirror-basiert) | 3.17.x |
| **Übersetzung** | DeepL API v2 | — |
| **E-Mail** | Resend | 6.8.x |
| **Hosting** | Vercel (Serverless) | — |
| **UI-Komponenten** | Radix UI, shadcn/ui Patterns | — |
| **Drag & Drop** | dnd-kit | 6.3.x |
| **Formularvalidierung** | Zod + React Hook Form | 4.3.x / 7.71.x |
| **Theming** | next-themes (Light/Dark Mode) | 0.4.6 |

---

## 3. Architektur-Übersicht

### 3.1 Verzeichnisstruktur

```
CD/
├── prisma/
│   └── schema.prisma          # 590 Zeilen, 25+ Modelle
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, Register, Passwort vergessen
│   │   ├── (main)/             # Authentifizierter Bereich
│   │   │   ├── feed/           # Community-Feed (Hauptseite)
│   │   │   ├── classroom/      # LMS-Kursbereich
│   │   │   ├── calendar/       # Event-Kalender
│   │   │   ├── events/         # Event-Details
│   │   │   ├── members/        # Mitgliederverzeichnis
│   │   │   ├── leaderboard/    # Gamification-Rangliste
│   │   │   ├── ai-tools/       # KI-Tool-Übersicht
│   │   │   ├── admin/          # Admin-Dashboard (23 Unterseiten)
│   │   │   ├── search/         # Globale Suche
│   │   │   ├── onboarding/     # Neuer-Nutzer-Onboarding
│   │   │   └── profile/        # Nutzerprofil
│   │   ├── api/                # API-Routen (Auth, Webhooks, etc.)
│   │   ├── page.tsx            # Landing Page (öffentlich)
│   │   └── layout.tsx          # Root Layout
│   ├── components/             # 118+ Komponenten
│   ├── lib/
│   │   ├── i18n/               # Internationalisierung (UI-Strings)
│   │   │   ├── messages/       # en.ts, de.ts, es.ts, fr.ts
│   │   │   └── geolocation.ts  # IP → Sprache Mapping
│   │   ├── translation/        # Content-Übersetzung (DeepL)
│   │   │   ├── index.ts        # Core Translation API
│   │   │   ├── cache.ts        # DB-basierter Übersetzungs-Cache
│   │   │   ├── detect.ts       # Spracherkennung
│   │   │   ├── providers/      # DeepL Provider
│   │   │   └── constants.ts    # 10 unterstützte Sprachen
│   │   ├── auth.ts             # NextAuth Konfiguration
│   │   ├── db.ts               # Prisma Client Singleton
│   │   ├── permissions.ts      # RBAC (4 Rollen)
│   │   ├── *-actions.ts        # Server Actions (20+ Dateien)
│   │   └── validations/        # Zod-Schemas
│   └── types/                  # TypeScript-Typdefinitionen
├── public/                     # Statische Assets
├── scripts/                    # Admin-/Wartungsskripte
└── supabase/                   # Supabase-Konfiguration
```

### 3.2 Server Actions Architektur

Die gesamte Backend-Logik ist als **Next.js Server Actions** implementiert (`'use server'`). Es gibt kein dediziertes Backend; alle Datenbankoperationen laufen über Server Actions, die direkt von React-Komponenten aufgerufen werden.

Wichtige Server-Action-Dateien:

| Datei | Verantwortung |
|:---|:---|
| `auth-actions.ts` | Registrierung, Login-Hilfsfunktionen |
| `post-actions.ts` | CRUD für Community-Posts |
| `comment-actions.ts` | Kommentar-Erstellung und -Löschung |
| `like-actions.ts` | Like/Unlike für Posts und Kommentare |
| `course-actions.ts` | Kursverwaltung (CRUD) |
| `lesson-actions.ts` | Lektionsverwaltung mit Tiptap-Content |
| `module-actions.ts` | Kursmodul-Verwaltung (Sortierung) |
| `enrollment-actions.ts` | Kurseinschreibungen |
| `progress-actions.ts` | Lektions-Fortschritt (Mark as Done) |
| `event-actions.ts` | Kalender-Events (CRUD mit Zeitzone) |
| `settings-actions.ts` | Community-Einstellungen, Logo-Upload, Landing Page |
| `admin-actions.ts` | User-Management, Bans, Rollen |
| `search-actions.ts` | Volltextsuche (PostgreSQL tsvector) |
| `gamification-actions.ts` | Punkte-Vergabe und Level-System |
| `leaderboard-actions.ts` | Ranglisten-Abfragen |
| `profile-actions.ts` | Nutzerprofil-Updates |
| `media-actions.ts` | Medien-Upload (Supabase Storage) |
| `category-actions.ts` | Feed-Kategorien (CRUD) |
| `kanban-actions.ts` | Admin-Kanban-Board |
| `feature-idea-actions.ts` | Feature-Ideas-Board mit Upvotes |
| `ai-tool-actions.ts` | KI-Tool-Verwaltung |

---

## 4. Datenmodell (Prisma Schema)

Das komplette Schema umfasst **25+ Modelle**. Hier die wichtigsten Entitäten:

### 4.1 Kern-Modelle

```
User
├── id, email, name, image, bio
├── hashedPassword (bcrypt)
├── points (Int, default 0)
├── level (Int, default 1)
├── role: "member" | "moderator" | "admin" | "owner"
├── languageCode: String (default "en") — Bevorzugte Sprache
├── stripeCustomerId: String? — Stripe-Integration
└── searchVector: tsvector (Volltextsuche)

Post
├── id, title?, content (Tiptap JSON), plainText (Suche)
├── embeds (JSON Array: Video-Embeds)
├── authorId → User
├── categoryId → Category
├── languageCode: String? — Erkannte Sprache des Posts
├── contentHash: String? — SHA-256 für Cache-Invalidierung
└── searchVector: tsvector

Comment
├── id, content (VarChar 2000)
├── authorId → User, postId → Post
├── languageCode, contentHash
└── PostLike / CommentLike (unique [userId, entityId])

Category
├── id, name (unique), color (hex)
└── posts: Post[]
```

### 4.2 LMS-Modelle (Classroom)

```
Course
├── id, title, description, coverImage (Supabase URL)
├── status: DRAFT | PUBLISHED
├── modules: Module[]
├── enrollments: Enrollment[]
└── searchVector: tsvector

Module
├── id, title, position (Reihenfolge)
├── courseId → Course
└── lessons: Lesson[]

Lesson
├── id, title, position, status: DRAFT | PUBLISHED
├── videoUrl? (Video-Embed oben)
├── content (Tiptap JSON)
├── attachments: Attachment[]
└── progress: LessonProgress[]

Enrollment: unique [userId, courseId]
LessonProgress: unique [userId, lessonId] + completedAt
Attachment: name, url (Supabase), size, mimeType
```

### 4.3 Events & Kalender

```
Event
├── id, title, description (Tiptap JSON)
├── startTime, endTime (Timestamptz)
├── location?, locationUrl?
├── coverImage? (Supabase)
├── recurrence: NONE | WEEKLY | MONTHLY
├── recurrenceEnd?
└── createdById → User
```

### 4.4 Gamification

```
PointsEvent
├── userId → User
├── amount: Int
├── action: "POST_CREATED" (+5) | "COMMENT_CREATED" (+3) | "LIKE_RECEIVED" (+1) | "LESSON_COMPLETED"
└── createdAt

Level-System: 9 Stufen (Rookie → Legend), basierend auf Gesamtpunkten
```

### 4.5 Moderation & Admin

```
Ban
├── userId → User, reason, expiresAt? (null = permanent)
└── bannedById → User

AuditLog
├── userId → User
├── action: "BAN_USER" | "UNBAN_USER" | "DELETE_POST" | "CHANGE_ROLE" | ...
├── targetId?, targetType?: "USER" | "POST" | "COMMENT"
└── details: Json? (alter Wert, neuer Wert, Grund)
```

### 4.6 Community-Konfiguration

```
CommunitySettings (Singleton-Modell, id = "singleton")
├── communityName, communityDescription
├── communityLogo, communityLogoDark (Light/Dark Mode Logos)
├── logoSize: Int (20-80px)
├── welcomeMessage
├── registrationOpen, postingEnabled, commentsEnabled (Booleans)
│
├── Landing Page Felder:
│   ├── landingHeadline, landingSubheadline, landingDescription
│   ├── landingVideoUrls: Json[] (YouTube/Vimeo/Loom)
│   ├── landingBenefits: Json[] (Vorteilsliste)
│   ├── landingPriceUsd, landingPriceEur
│   ├── landingCtaText (CTA-Button-Text)
│   ├── landingTestimonials: Json[] ({name, text, role})
│   └── landingTranslations: Json (pro Sprache: {headline, subheadline, ...})
│
├── Sidebar Banner:
│   ├── sidebarBannerImage, sidebarBannerUrl
│   └── sidebarBannerEnabled
```

### 4.7 Zahlungen

```
Membership
├── userId → User (unique)
├── status: ACTIVE | EXPIRED | CANCELLED
├── planName, paidAt, expiresAt?
└── stripeCustomerId, stripeSubscriptionId, stripePriceId
```

### 4.8 Übersetzungs-Cache

```
Translation
├── entityType: "Post" | "Comment" | "Course" | "Lesson" | "Event"
├── entityId, fieldName: "plainText" | "title" | "content" | "description"
├── sourceLanguage, sourceHash (SHA-256)
├── targetLanguage, translatedContent
├── modelProvider: "deepl", modelVersion: "v2"
├── confidenceScore?
└── unique [entityType, entityId, fieldName, targetLanguage]
```

### 4.9 Admin-Tools

```
KanbanCard: Admin-Kanban-Board (TODO → IN_PROGRESS → DONE)
DevTrackerCard: Git-Branch-Tracking für Entwicklung
DevTrackerResource: Geteilte Prompts, Links, Notizen, Dateien
LaunchChecklistItem: Go-Live-Checkliste (auto + manuell)
AiTool: Admin-verwaltete KI-Tool-Links (Name, URL, Beschreibung)
FeatureIdea: Feature-Ideas-Board mit Upvotes und Kommentaren
```

---

## 5. Mehrsprachigkeit — Das Herzstück

Die Plattform hat **zwei getrennte Mehrsprachigkeits-Systeme**, die zusammenarbeiten:

### 5.1 UI-Lokalisierung (Static Strings)

**Technologie:** `next-intl` + eigene Message-Dateien

**Unterstützte UI-Sprachen (Static Messages):**
- 🇬🇧 Englisch (`en.ts`) — Primärsprache
- 🇩🇪 Deutsch (`de.ts`)
- 🇪🇸 Spanisch (`es.ts`)
- 🇫🇷 Französisch (`fr.ts`)

Die UI-Strings (Buttons, Labels, Navigationstext, Fehlermeldungen) sind in diesen 4 Sprachen hinterlegt.

### 5.2 Content-Übersetzung (Dynamic Content)

**Technologie:** DeepL API v2 + PostgreSQL-Cache (`Translation`-Tabelle)

**Unterstützte Content-Sprachen (10 Sprachen):**

| Code | Sprache | Richtung |
|:---|:---|:---|
| `en` | English | LTR |
| `de` | Deutsch | LTR |
| `es` | Español | LTR |
| `fr` | Français | LTR |
| `ja` | 日本語 | LTR |
| `pt` | Português | LTR |
| `zh` | 中文 | LTR |
| `ko` | 한국어 | LTR |
| `ar` | العربية | **RTL** |
| `it` | Italiano | LTR |

**Funktionsweise:**
1. Ein Nutzer erstellt einen Post auf Deutsch.
2. Die Sprache wird automatisch erkannt und als `languageCode` gespeichert.
3. Ein französischer Nutzer öffnet den Feed → die Translation API wird aufgerufen.
4. **Cache-Prüfung:** Existiert eine Übersetzung für diesen Post + Feld + Zielsprache mit aktuellem `sourceHash`?
   - **Ja:** Gecachte Übersetzung wird sofort zurückgegeben.
   - **Nein:** DeepL wird aufgerufen, die Übersetzung gespeichert und ausgeliefert.
5. Bei **Inhaltsänderung** ändert sich der SHA-256-Hash → Cache-Invalidierung → Neuübersetzung.

**Übersetzte Entitäten:**
- Posts (Titel + Fließtext)
- Kommentare
- Kurse (Titel + Beschreibung)
- Lektionen (Titel + Content)
- Events (Titel + Beschreibung)
- Landing Page (Headline, Subheadline, Description, Benefits, CTA)

### 5.3 Automatische Spracherkennung (IP-Geolocation)

**Mechanismus:** Dreistufiger Fallback

```
1. Vercel Edge Header → x-vercel-ip-country (z.B. "DE")
2. Browser Header → Accept-Language (z.B. "de-DE,de;q=0.9,en;q=0.8")
3. Fallback → Englisch ("en")
```

**Country-to-Language Mapping (Auszug):**
- 🇩🇪🇦🇹🇨🇭🇱🇮 → `de` (Deutsch)
- 🇪🇸🇲🇽🇦🇷🇨🇴🇵🇪 + 14 weitere → `es` (Spanisch)
- 🇫🇷🇧🇪🇱🇺🇲🇨🇸🇳 + 10 weitere → `fr` (Französisch)
- 🇯🇵 → `ja`, 🇰🇷 → `ko`, 🇨🇳🇹🇼🇭🇰 → `zh`, 🇸🇦🇦🇪🇪🇬 + 10 → `ar`
- 🇺🇸🇬🇧🇨🇦🇦🇺 + 8 weitere → `en` (Englisch, Default)

**Cookie-Persistenz:** `preferred-language` Cookie für manuelle Sprachwahl.

**Währungserkennung:** Europäische Länder (EU + EEA + CH) sehen EUR-Preise, Rest sieht USD.

### 5.4 Landing Page Übersetzungen

Die Landing Page hat ein **hybrides Übersetzungssystem:**
- **Basis-Content** wird auf Englisch gepflegt (in `CommunitySettings`).
- **Pro Sprache** können Übersetzungen in `landingTranslations` (JSON) gespeichert werden.
- **Auto-Translate:** Eine Admin-Funktion ruft DeepL auf, um den EN-Content in die Zielsprache zu übersetzen. Der Admin kann das Ergebnis vor dem Speichern prüfen und anpassen.

---

## 6. Authentifizierung & Autorisierung

### 6.1 Auth-System

- **Provider:** NextAuth.js mit JWT-Strategie
- **Methode:** Credentials Provider (E-Mail + Passwort)
- **Passwort-Hashing:** bcrypt
- **Session:** JWT-basiert, 30 Tage gültig
- **Adapter:** Prisma Adapter für User-Persistenz

### 6.2 RBAC (Role-Based Access Control)

4 Rollen mit hierarchischen Berechtigungen:

| Rolle | Rechte |
|:---|:---|
| `member` | Posts erstellen, kommentieren, liken, Kurse belegen |
| `moderator` | + Posts/Kommentare anderer löschen |
| `admin` | + User-Verwaltung, Rollen ändern, Community-Einstellungen, Kurs-CRUD, Event-CRUD, Kanban |
| `owner` | + Vollzugriff, Admins ernennen |

**Membership-Gate:** Neben der Rolle wird auch der Mitgliedschaftsstatus (`Membership.status === 'ACTIVE'`) in der JWT-Session gespeichert. Features können optional hinter eine aktive Membership gesperrt werden.

### 6.3 Passwort-Reset

Tokenbasierter Reset-Flow via E-Mail (Resend):
1. Nutzer gibt E-Mail ein → Token generiert mit Ablaufzeit
2. E-Mail mit Reset-Link über Resend API
3. Token-Validierung → neues Passwort setzen

---

## 7. Feature-Katalog

### 7.1 Community Feed

- **Hauptansicht:** 3-Spalten-Layout (Kategorien | Feed | Leaderboard/Mitglieder)
- **Post-Erstellung:** Tiptap Rich-Text-Editor mit Placeholder-UX
- **Medien:** YouTube, Vimeo, Loom Embeds (automatische Erkennung via `EmbedRenderer`)
- **Kategorien:** 4 Default-Kategorien (General, Announcements, Introductions, Questions) mit Farbcodes
- **Interaktion:** Likes (+1 Punkt), verschachtelte Kommentare, Drei-Punkte-Menü (Edit/Delete)
- **Moderation:** Delete-API erzwingt Berechtigungen (Autor / Owner / Admin)
- **Pagination:** Offset-basiert, 10 Posts pro Seite
- **Streaming:** `<Suspense>` mit Skeleton-Fallback für perceived performance

### 7.2 Classroom (LMS)

- **Kursstruktur:** Course → Module → Lesson (hierarchisch, sortierbar via dnd-kit)
- **Kursseite:** Grid-Layout mit Cover-Images (Supabase Storage)
- **Kurs-Status:** DRAFT / PUBLISHED
- **Lektionen:** Tiptap-Content + optionales Video-Embed + Datei-Anhänge
- **Fortschritt:** "Mark as Done" pro Lektion, Fortschrittsbalken pro Kurs
- **Einschreibung:** Expliziter Enroll-Button, getrackt in `Enrollment`-Tabelle

### 7.3 Events & Kalender

- **Event-Erstellung:** Titel, Tiptap-Beschreibung, Start-/Endzeit (Timezone-aware)
- **Zeitzonen:** `@date-fns/tz` für korrekte Darstellung
- **Wiederholung:** NONE / WEEKLY / MONTHLY mit optionalem Enddatum
- **Location:** Optionaler Ort + URL (für Zoom/Meet-Links)
- **Cover-Images:** Upload via Supabase Storage

### 7.4 Mitgliederverzeichnis

- **Grid-Layout:** Responsive Member-Cards mit Avatar, Name, Level-Badge
- **Suchbar:** Volltextsuche über `searchVector` (PostgreSQL GIN-Index)
- **Rollen-Badges:** Visuelle Unterscheidung (Admin, Mod, Member)
- **Leveling:** 9-Stufen-System angezeigt neben dem Namen

### 7.5 Leaderboard & Gamification

**Punkte-System:**
| Aktion | Punkte |
|:---|:---|
| Post erstellen | +5 |
| Kommentar schreiben | +3 |
| Like erhalten | +1 |
| Lektion abschließen | variabel |

**9-Level-System:** Rookie → Intermediate → Advanced → Expert → Master → … → Legend

**Leaderboard:** Podiumsplätze für Top-Mitglieder, sortiert nach Gesamtpunkten.

### 7.6 Globale Suche

- **PostgreSQL Volltextsuche** über `tsvector` + GIN-Indizes
- **Suchbare Entitäten:** Users (Name + Bio), Posts (plainText), Courses (Titel + Beschreibung)
- **UI:** Capsule-förmige Suchleiste im Header, aktivierbar via ⌘K

### 7.7 AI Tools

- Admin-verwaltete Liste von KI-Tool-Links (Name, URL, Beschreibung)
- Sidebar-Integration und eigene Übersichtsseite
- Jedes Tool kann als neuer Tab geöffnet werden

### 7.8 Admin-Dashboard

Das Admin-Dashboard umfasst **23+ Unterseiten**:

- **Mitgliederverwaltung:** Member-Table mit Rollen-Änderung, Ban/Unban, Suche
- **Community-Einstellungen:** Name, Beschreibung, Logo (Light + Dark), Logo-Größe
- **Landing Page Editor:** Headline, Subheadline, Benefits, Videos, Preise (USD/EUR), Testimonials, Übersetzungen
- **Sidebar Banner:** Upload, Click-URL, Enable/Disable
- **Kurs-Management:** CRUD mit Cover-Image-Upload
- **Event-Management:** CRUD mit Zeitzonen
- **Kategorie-Management:** CRUD mit Farbauswahl
- **Kanban-Board:** Drag & Drop Aufgabenverwaltung (TODO → IN_PROGRESS → DONE)
- **Dev Tracker:** Git-Branch-Tracking, Ressourcenverwaltung (Prompts, Links, Dateien)
- **Feature Ideas Board:** Ideen einreichen, Upvoten, Kommentieren, Status-Management
- **Launch Checklist:** Go-Live-Checkliste mit Auto-Check und Blocker-Markierung
- **Audit Log:** Vollständige Protokollierung aller Admin-Aktionen

### 7.9 Landing Page (Öffentlich)

- Vollständig konfigurierbar über das Admin-Dashboard
- **Adaptive Preisanzeige:** EUR für europäische Besucher, USD für Rest
- **Mehrsprachig:** Content wird basierend auf IP/Sprache automatisch in der passenden Sprache angezeigt
- Video-Embeds, Benefits-Liste, Testimonials
- CTA-Button mit konfigurierbarem Text

---

## 8. Design System

### 8.1 Visual Identity

- **Designsprache:** Minimalistisch, klinisch, Skool-inspiriert
- **Farbpalette:** Monochromes Schwarz/Weiß/Grau-Schema
  - Background: `#f8f9fa`, Foreground: `#1f2937`, Cards: `#ffffff`
- **Typografie:** Inter (Sans-serif), Medium (500) + Bold (700)
- **Dark Mode:** Vollständig implementiert via `next-themes`, separate Logos für Light/Dark

### 8.2 Komponenten-Patterns

- **Cards:** `.skool-card` — White bg, 1px border, 12px radius, subtle shadow
- **Buttons:** Pill-shaped (`rounded-full`), Primary (schwarz), Secondary (grau), Ghost
- **Navigation:** Horizontale Tabs mit monochrom SVG-Icons (Lucide/Heroicons)
- **Sticky Header:** Logo + Search bleiben fixiert, Sub-Nav versteckt sich beim Scrollen
- **3-Spalten-Layout:** `w-64 | flex-1 | w-72` mit vertikaler Ausrichtung ("Bündig")

### 8.3 Responsiveness

- **Desktop (1024px+):** Volles 3-Spalten-Layout mit beiden Sidebars
- **Mobile (<1024px):** Sidebars versteckt, Full-Width-Feed, Hamburger-Menü
- **Mathematische Zentrierung:** Fixed-Width Wings + `flex-1` für exakte Zentrierung auf Mobile

---

## 9. Infrastruktur & Deployment

### 9.1 Supabase

- **Datenbank:** PostgreSQL (Connection via `@prisma/adapter-pg`)
- **Storage:** Buckets mit Row-Level Security (RLS)
  - `community-logos` — Community-Logo-Uploads
  - `course-images` — Kurs-Cover-Bilder
  - `attachments` — Lesson-Anhänge
  - `event-images` — Event-Cover
  - `sidebar-banners` — Sidebar-Banner-Bilder
- **Bucket-Provisionierung:** Admin-Skripte für automatische Setup

### 9.2 Vercel

- **Serverless Deployment** mit automatischem Build-Pipeline
- **Edge Functions:** Geolocation-Header (`x-vercel-ip-country`) für Spracherkennung
- **Read-Only Filesystem:** Alle Uploads gehen über Supabase Storage (kein lokaler FS)

### 9.3 Stripe

- **Subscription Model:** Community Membership als wiederkehrendes Abonnement
- **Checkout:** Stripe Checkout Session für Zahlungsabwicklung
- **Webhook-Handling:** Für Subscription-Status-Updates
- **Dual-Pricing:** USD + EUR Preise konfigurierbar

---

## 10. Performance & Skalierung

- **Parallele DB-Abfragen:** `Promise.all` für Posts, Count, Categories im Feed
- **N+1 Vermeidung:** Prisma `include` / `select` für effiziente Relations
- **Offset-Pagination:** 10 Posts/Seite, leichtes DOM
- **Streaming:** Next.js `<Suspense>` mit Skeleton-Fallbacks
- **Image Optimization:** `next/image` mit CDN-Optimierung
- **Code Splitting:** Client-Logik isoliert in einzelnen Komponenten
- **Datenbank-Indizes:** GIN-Indizes auf `searchVector`, Composite-Indizes auf häufig gefilterten Feldern
- **Übersetzungs-Cache:** DB-basiert mit SHA-256-Hash-Invalidierung (keine redundanten DeepL-Calls)

---

## 11. Wichtige Konfigurationsdateien

| Datei | Zweck |
|:---|:---|
| `prisma/schema.prisma` | Komplettes Datenmodell (590 Zeilen) |
| `src/lib/auth.ts` | NextAuth + JWT + Session-Konfiguration |
| `src/lib/permissions.ts` | RBAC-Logik und Rollenhierarchie |
| `src/lib/db.ts` | Prisma Client Singleton |
| `src/lib/i18n/index.ts` | i18n-Konfiguration (next-intl) |
| `src/lib/i18n/geolocation.ts` | IP → Sprache Mapping (60+ Länder) |
| `src/lib/translation/index.ts` | DeepL Translation API + Cache-Logik |
| `src/lib/translation/constants.ts` | 10 unterstützte Content-Sprachen |
| `src/lib/settings-actions.ts` | Community-Settings Server Actions (756 Zeilen) |
| `src/middleware.ts` | Auth-Middleware (next-auth) |
| `next.config.ts` | Remote-Patterns (YouTube Thumbnails), etc. |
| `.env` | Umgebungsvariablen (DB, Supabase, Stripe, DeepL, Resend) |

---

## 12. Umgebungsvariablen

```env
# Datenbank
DATABASE_URL=           # Supabase PostgreSQL Connection String
DIRECT_URL=             # Direkter DB-Zugriff (für Prisma Migrations)

# Auth
NEXTAUTH_SECRET=        # JWT-Signaturgeheimnis
NEXTAUTH_URL=           # Basis-URL der Anwendung

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# DeepL (Übersetzung)
DEEPL_API_KEY=

# E-Mail
RESEND_API_KEY=
```

---

## 13. Zukünftige Features (Roadmap-Auszug)

Basierend auf der Marktforschung (170+ Skool-Feature-Requests analysiert):

- **Post-Scheduling:** Posts für die Zukunft planen
- **Tiered Category Access:** Kategorien nur für zahlende Mitglieder
- **DM-System:** Direkte Nachrichten mit Reactions und Threading
- **Bookmarks:** Posts speichern für später
- **Advanced Analytics:** Post-Impressionen, Kurs-Drop-off-Heatmaps
- **Native Video Recording:** Loom-artiges Aufnahme-Tool
- **Affiliate System:** Einladungs-Tracking mit Provisionen
- **Content-Dripping:** Zeitgesteuerte Kurs-Freischaltung
- **Maps:** Leaflet-basierte Mitglieder-Karte
- **Sandbox Mode:** "View as Member" für Admins

---

## 14. Zusammenfassung für KI-Kontext

> **ScienceExperts.ai** ist eine in Next.js 16 gebaute Community-Plattform (Skool-Klon) mit:
>
> - **Full-Stack TypeScript** — React 19 Frontend, Server Actions Backend, Prisma 7 ORM
> - **25+ Datenbankmodelle** — Users, Posts, Comments, Courses, Modules, Lessons, Events, Translations, etc.
> - **Echte Mehrsprachigkeit** — UI in 4 Sprachen (next-intl), Content in 10 Sprachen (DeepL + DB-Cache)
> - **IP-basierte Spracherkennung** — Automatische Sprachauswahl basierend auf Standort
> - **Gamification** — Punkte, Levels, Leaderboard
> - **LMS** — Kursmanager mit Modulen, Lektionen, Fortschritt, Anhängen
> - **Stripe Payments** — Membership-Subscriptions mit EUR/USD Dual-Pricing
> - **Admin-Dashboard** — 23+ Seiten: User-Management, Content, Kanban, Dev-Tracker, Ideas Board
> - **Supabase Storage** — Cloud-basierter Dateispeicher mit RLS
> - **Vercel Deployment** — Serverless mit Edge-Geolocation
> - **Dark/Light Mode** — Vollständiges Theming mit separaten Logos
> - **Responsive Design** — 3-Spalten Desktop, Mobile-optimiert
