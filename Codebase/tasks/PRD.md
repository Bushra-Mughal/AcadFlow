# AcadFlow â€” Product Requirements Document

**Version:** v58  
**Date:** 2026-05-09  
**Status:** Production-ready, actively maintained  
**Author:** Generated from the full AcadFlow codebase

---

## 1. Executive Summary

AcadFlow is a gamified academic productivity platform for university students. It unifies solo assignments, team projects, file management, AI tutoring, and analytics in a single dashboard. The application is built as a **React + TypeScript + Vite** SPA styled with **Tailwind CSS** and **shadcn/ui**, backed by **Supabase** (PostgreSQL, Auth, Storage, Edge Functions) and the **Gemini 2.5 Flash** API for AI features.

The product is intentionally playful and motivational: students earn **points**, climb a **7-tier rank ladder**, unlock **badges**, and maintain **streaks**. The UI is highly customizable through **preset themes** and **cinematic movie-inspired themes** with live canvas animations.

### 1.1 Core Value Proposition
- **One workspace for everything academic** â€” assignments, projects, files, deadlines, and notes.
- **AI tutor always available** â€” chat assistant, essay analyzer, and smart paste from emails/Teams.
- **Motivation through progress** â€” ranks, points, badges, and streaks keep students engaged.
- **Collaboration** â€” invite team members by email to shared projects with file visibility.
- **Personalization** â€” switch between clean preset themes or immersive cinematic experiences.

### 1.2 Target Users
- Undergraduate and postgraduate students.
- Student teams working on group projects.
- Power users who enjoy customizing their workspace.

---

## 2. Tech Stack

### 2.1 Frontend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18.3.1 | UI component model and state management |
| Language | TypeScript 5.9.3 | Type safety across the codebase |
| Build Tool | Vite 6.2.6 | Fast dev server and production bundling |
| Routing | React Router 7.9.5 | SPA navigation and route guards |
| Styling | Tailwind CSS 3.4.17 | Utility-first CSS |
| Animations | Tailwind Animate, Framer Motion (via shadcn), custom CSS | UI transitions and effects |
| UI Components | shadcn/ui (Radix primitives) | Accessible, composable components |
| Icons | Lucide React | Consistent iconography |
| Notifications | Sonner | Toast notifications |
| Markdown | React Markdown | AI assistant message rendering |
| Date Picker | react-day-picker | Date inputs |

### 2.2 Backend
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend-as-a-Service | Supabase | Auth, Postgres, Storage, Realtime, Edge Functions |
| Database | PostgreSQL 15+ | Relational data, RLS, triggers, RPCs |
| Functions | Supabase Edge Functions (Deno + TypeScript) | AI orchestration (Gemini) |
| Object Storage | Supabase Storage | File uploads and previews |
| AI Model | Gemini 2.5 Flash | Chat, analysis, and smart paste |

### 2.3 DevOps / Tooling
| Tool | Purpose |
|------|---------|
| Biome | Linting and formatting |
| TypeScript | Compile-time checks |
| Supabase CLI | Local dev, migrations, Edge Functions |

---

## 3. Project Structure

```
/workspace/app-biof3pfof94x
â”œâ”€â”€ index.html
â”œâ”€â”€ package.json
â”œâ”€â”€ tailwind.config.js
â”œâ”€â”€ tsconfig.json
â”œâ”€â”€ vite.config.ts
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ App.tsx                 # Router + top-level providers
â”‚   â”œâ”€â”€ main.tsx                # React root mount
â”‚   â”œâ”€â”€ routes.tsx              # Route definitions
â”‚   â”œâ”€â”€ index.css               # Global CSS variables, glassmorphism, animations
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ auth/               # LoginBackground, PasswordStrengthBar
â”‚   â”‚   â”œâ”€â”€ cinematic/          # Background engine + 5 canvas animations
â”‚   â”‚   â”œâ”€â”€ common/             # RouteGuard, IntersectObserver, PageMeta
â”‚   â”‚   â”œâ”€â”€ layouts/            # AppLayout (sidebar + mobile menu)
â”‚   â”‚   â”œâ”€â”€ shared/             # AssignmentCard, ProjectCard, Badges, RankBar
â”‚   â”‚   â””â”€â”€ ui/                 # shadcn/ui components (40+ files)
â”‚   â”œâ”€â”€ contexts/
â”‚   â”‚   â”œâ”€â”€ AuthContext.tsx     # Authentication state
â”‚   â”‚   â””â”€â”€ CinematicContext.tsx  # Cinematic theme state
â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â””â”€â”€ supabase.ts         # Supabase client singleton
â”‚   â”œâ”€â”€ hooks/                  # use-mobile, use-debounce, use-supabase-upload, etc.
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ activity.ts         # Activity tracking, relative time, status helpers
â”‚   â”‚   â”œâ”€â”€ cinematicTheme.ts   # Cinematic theme engine
â”‚   â”‚   â”œâ”€â”€ theme.ts            # Preset theme engine
â”‚   â”‚   â””â”€â”€ utils.ts            # cn() helper
â”‚   â”œâ”€â”€ pages/                  # 16 route-level pages
â”‚   â”œâ”€â”€ types/
â”‚   â”‚   â””â”€â”€ index.ts            # Domain TypeScript types
â”‚   â””â”€â”€ vite-env.d.ts
â”œâ”€â”€ supabase/
â”‚   â”œâ”€â”€ migrations/00001_â€¦sql   # 34 sequential migrations
â”‚   â””â”€â”€ functions/              # 3 Edge Functions
â”‚       â”œâ”€â”€ _shared/cors.ts
â”‚       â”œâ”€â”€ ai-assistant/index.ts
â”‚       â”œâ”€â”€ ai-analyzer/index.ts
â”‚       â””â”€â”€ smart-paste/index.ts
â””â”€â”€ docs/
    â””â”€â”€ PRD.md
```

---

## 4. Domain Model & Database Schema

### 4.1 Entity Overview

```
User (auth.users)
  â””â”€â”€ Profile (profiles)
        â”œâ”€â”€ Assignments
        â”œâ”€â”€ Projects
        â”‚     â””â”€â”€ ProjectMembers
        â”œâ”€â”€ Files
        â”‚     â””â”€â”€ FileFolders
        â”œâ”€â”€ Activities
        â”œâ”€â”€ ChatMessages
        â”œâ”€â”€ AnalysisHistory
        â”œâ”€â”€ UserStats
        â””â”€â”€ UserBadges -> Badges
```

### 4.2 Core Tables

#### `assignments`
```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  course TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  weightage INTEGER CHECK (weightage >= 0 AND weightage <= 100),
  status TEXT CHECK (status IN ('queue', 'in_progress', 'review', 'completed')) DEFAULT 'queue',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `projects`
Mirrors `assignments` but with `creator_id` instead of `user_id` and membership via `project_members`.

#### `project_members`
```sql
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);
```

#### `files`
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  folder_id UUID REFERENCES file_folders(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `file_folders` (migration 00027)
```sql
CREATE TABLE file_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES file_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `activities`
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('viewed', 'opened', 'edited', 'created', 'deleted', 'status_changed')),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `chat_messages`
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `analysis_history`
```sql
CREATE TABLE analysis_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_preview TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `profiles`
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text UNIQUE,
  gmail text,
  role public.user_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### `user_stats`
```sql
CREATE TABLE user_stats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 1,
  on_time_submissions integer NOT NULL DEFAULT 0,
  total_submissions integer NOT NULL DEFAULT 0,
  file_edits integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_submission_date date,
  projects_completed integer NOT NULL DEFAULT 0,
  assignments_completed integer NOT NULL DEFAULT 0,
  team_members_invited integer NOT NULL DEFAULT 0,
  files_uploaded integer NOT NULL DEFAULT 0,
  ai_sessions integer NOT NULL DEFAULT 0,
  on_time_projects integer NOT NULL DEFAULT 0,
  last_rank_update timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);
```

#### `badges` and `user_badges`
- `badges` stores 14 unlockable achievements with `criteria_type`, `criteria_value`, `icon`, and `display_order`.
- `user_badges` records which user unlocked which badge and when.

---

## 5. Authentication & Authorization

### 5.1 Auth Strategy

AcadFlow supports two auth paths:

1. **Email/Password via username** â€” The app creates a synthetic email address `username@miaoda.com` and registers the user with Supabase Auth. The username is stored in `profiles.username`.
2. **Google SSO** â€” The app uses `signInWithSSO` with `domain: 'miaoda-gg.com'`. The user's Gmail can be optionally linked during signup to allow the same username to be recognized when logging in with Google.

### 5.2 Key Engineering Pitfall: Username Availability Check

**Problem:** The real-time username availability check in the signup form initially returned false positives. The frontend queried `profiles` directly, but RLS policies prevented unauthenticated users from reading existing rows, so the query returned `null` and reported the username as available.

**Solution:** A `SECURITY DEFINER` RPC function `is_username_available(p_username text)` was created. It bypasses RLS and returns the true occupancy status.

```sql
-- Migration 00034_add_is_username_available_rpc.sql
CREATE OR REPLACE FUNCTION is_username_available(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE lower(username) = lower(p_username)
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;

GRANT EXECUTE ON FUNCTION is_username_available TO anon, authenticated;
```

Frontend usage in `AuthContext.tsx`:
```typescript
async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!username || username.length < 3) return false;
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) {
    console.error('checkUsernameAvailable error:', error);
    return false; // fail-closed: treat as taken on error
  }
  return data === true;
}
```

### 5.3 AuthContext API

```typescript
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, gmail?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  resetPassword: (username: string) => Promise<void>;
}
```

### 5.4 RouteGuard

`src/components/common/RouteGuard.tsx` checks `useAuth` and redirects unauthenticated users to `/login`. Public routes (login, signup, forgot-password, reset-password) bypass this check.

```typescript
export default function RouteGuard({ children, isPublic }: { children: ReactNode; isPublic?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loadingâ€¦</div>;
  if (!user && !isPublic) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
```

---

## 6. Application Architecture & Data Flow

### 6.1 Provider Hierarchy

```tsx
// src/App.tsx
<CinematicProvider>
  <AuthProvider>
    <Router>
      <AppContent />
    </Router>
  </AuthProvider>
</CinematicProvider>
```

- `CinematicProvider` is outermost so it can apply global CSS variables before React renders the main layout.
- `AuthProvider` wraps the router so any route can access auth state.

### 6.2 Routing

`src/routes.tsx` defines 16 routes:

```typescript
export const routes = [
  { path: '/login', element: <Login />, isPublic: true },
  { path: '/signup', element: <Signup />, isPublic: true },
  { path: '/forgot-password', element: <ForgotPassword />, isPublic: true },
  { path: '/reset-password', element: <ResetPassword />, isPublic: true },
  { path: '/', element: <Dashboard /> },
  { path: '/assignments', element: <Assignments /> },
  { path: '/assignments/:id', element: <AssignmentDetail /> },
  { path: '/projects', element: <Projects /> },
  { path: '/projects/:id', element: <ProjectDetail /> },
  { path: '/files', element: <Files /> },
  { path: '/ai-assistant', element: <AIAssistant /> },
  { path: '/ai-analyzer', element: <AIAnalyzer /> },
  { path: '/activity', element: <ActivityLog /> },
  { path: '/achievements', element: <Achievements /> },
  { path: '/theme', element: <ThemeCustomization /> },
  { path: '*', element: <NotFound /> },
];
```

### 6.3 General Data Flow

1. **User action** triggers a Supabase query, Storage operation, or Edge Function call.
2. **RLS policies** enforce row-level access.
3. **Triggers / RPCs** update `user_stats`, `badges`, `activities`, etc.
4. **Frontend state** updates via React `useState`/`useEffect` after the awaited response.
5. **Sonner toasts** provide success/error feedback.

### 6.4 Activity Tracking

Every meaningful action is recorded via `trackActivity` in `src/lib/activity.ts`. The function reads the current user and profile, builds a canonical display email `username@acadflow`, and inserts into `activities`.

```typescript
export async function trackActivity(
  actionType: ActionType,
  assignmentId?: string,
  projectId?: string,
  details?: Record<string, any>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, username')
    .eq('id', user.id)
    .single();

  let userEmail = 'Unknown';
  if (profile?.username) {
    userEmail = `${profile.username}@acadflow`;
  } else if (profile?.email) {
    const localPart = profile.email.split('@')[0];
    userEmail = `${localPart}@acadflow`;
  }

  await supabase.from('activities').insert({
    user_id: user.id,
    user_email: userEmail,
    action_type: actionType,
    assignment_id: assignmentId,
    project_id: projectId,
    details,
  });
}
```

---

## 7. Feature Pages

### 7.1 Dashboard

**File:** `src/pages/Dashboard.tsx` (~224 lines)

The dashboard is the landing page after login. It shows:
- **RankBar** component at the top.
- **Quick Stats**: Total tasks, completed, in-progress, overdue.
- **Progress Overview**: Solo assignment completion vs. team project completion.
- **Upcoming Deadlines**: Next 5 non-overdue, non-completed items.

Key logic:
```typescript
const upcomingDeadlines = [...assignments, ...projects]
  .filter(item => item.due_date && !isOverdue(item.due_date) && item.status !== 'completed')
  .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
  .slice(0, 5);
```

### 7.2 Assignments

**File:** `src/pages/Assignments.tsx` (~483 lines)

- Lists all assignments belonging to the current user.
- Supports creating, editing, deleting, and status changes.
- **Smart Paste**: Opens a modal where users paste text from Teams/Email/Slack. The text is sent to the `smart-paste` Edge Function, which returns a JSON object with `title`, `description`, `dueDate`, `course`, and `priority`.
- Status changes to `completed` trigger `award_points()` RPC and badge checks.

### 7.3 Assignment Detail

**File:** `src/pages/AssignmentDetail.tsx` (~621 lines)

- Shows full assignment metadata, editable fields, status selector, and notes.
- Lists files attached to the assignment.
- Tracks `viewed` and `status_changed` activities.

### 7.4 Projects

**File:** `src/pages/Projects.tsx` (~662 lines)

- Lists projects where the user is either the creator or a member.
- Supports team member invitation by email.
- Invitation flow uses the `find_user_by_email` SECURITY DEFINER RPC to locate the user by their Gmail/username and then inserts into `project_members`.
- Completing a project awards points via `award_points()`.

### 7.5 Project Detail

**File:** `src/pages/ProjectDetail.tsx` (~804 lines)

- Full project view with metadata, member list, file uploads, and status tracking.
- Creator can remove members.
- Members can see project files.

### 7.6 Files

**File:** `src/pages/Files.tsx` (~594 lines)

- Nested folder tree using `file_folders`.
- File upload via Supabase Storage.
- Download and preview support.
- Move files between folders.
- File type categorization (document, image, code, etc.).

### 7.7 AI Assistant

**File:** `src/pages/AIAssistant.tsx` (~560 lines)

- Chat interface with streaming responses.
- Sends `message`, `conversationHistory`, `fileContext`, `assignmentContext`, `projectContext`, and `sessionId` to the `ai-assistant` Edge Function.
- Persists messages in `chat_messages`.
- Supports Markdown rendering.
- Awards `ai_session` points once per session.

### 7.8 AI Analyzer

**File:** `src/pages/AIAnalyzer.tsx` (~463 lines)

- Accepts student work (essay, report, code) and returns a structured JSON analysis.
- Saves history to `analysis_history`.
- Sidebar shows past analyses with scores and delete actions.
- Result sections: Grammar & Spelling, Structure, Content Quality, Clarity & Flow, Plagiarism Risk, Summary, Recommended Tools.

### 7.9 Activity Log

**File:** `src/pages/ActivityLog.tsx` (~186 lines)

- Filterable list of all activities for the current user.
- Normalizes legacy `@miaoda.com` emails to `@acadflow` for display consistency.
- Shows action icons and relative timestamps.

### 7.10 Achievements

**File:** `src/pages/Achievements.tsx` (~252 lines)

- Displays all badges and user progress.
- Unlocked badges are highlighted; locked ones show progress percentage.
- Reads `user_stats` and `user_badges`.

### 7.11 Theme Customization

**File:** `src/pages/ThemeCustomization.tsx` (~421 lines)

- Two tabs: **Basic** and **Cinematic**.
- Basic: 4 preset themes + custom color builder.
- Cinematic: 5 movie-inspired themes with live preview, accent, intensity, speed, and font overrides.

---

## 8. Gamification System

### 8.1 Ranks

**File:** `src/components/RankBar.tsx`

There are 7 ranks with point thresholds:

```typescript
export const RANKS: RankInfo[] = [
  { rank: 1, title: 'Beginner',  minPoints: 0,    maxPoints: 99 },
  { rank: 2, title: 'Learner',   minPoints: 100,  maxPoints: 249 },
  { rank: 3, title: 'Achiever',  minPoints: 250,  maxPoints: 499 },
  { rank: 4, title: 'Expert',    minPoints: 500,  maxPoints: 999 },
  { rank: 5, title: 'Master',    minPoints: 1000, maxPoints: 1999 },
  { rank: 6, title: 'Champion',  minPoints: 2000, maxPoints: 3999 },
  { rank: 7, title: 'Legend',    minPoints: 4000, maxPoints: null },
];
```

Rank progress is calculated as:
```typescript
export function getRankProgress(points: number, rank: number) {
  const info = getRankInfo(rank);
  const next = RANKS.find(r => r.rank === rank + 1);
  if (!next) return { pct: 100, needed: 0, current: points - info.minPoints };
  const span = next.minPoints - info.minPoints;
  const done = Math.max(0, points - info.minPoints);
  return { pct: Math.min(100, (done / span) * 100), needed: next.minPoints - points, current: done };
}
```

### 8.2 Points System

**File:** `supabase/migrations/00026_overhaul_rank_points_system.sql`

The `award_points(p_user_id, p_action, p_points)` RPC handles all point awards. It also increments relevant counters and auto-updates the user's rank.

| Action | Points |
|--------|--------|
| `assignment_completed_ontime` | 50 |
| `assignment_completed_onday` | 30 |
| `assignment_completed_late` | 10 |
| `assignment_status_progress` | 5 |
| `assignment_status_review` | 10 |
| `project_completed_ontime` | 70 |
| `project_completed_onday` | 50 |
| `project_completed_late` | 15 |
| `project_status_progress` | 5 |
| `project_status_review` | 10 |
| `team_member_invited` | 15 |
| `file_uploaded` | 5 |
| `file_edited` | 5 |
| `ai_session` | 10 |

The RPC is `SECURITY DEFINER` so the frontend can call it directly without needing table UPDATE privileges.

### 8.3 Badges

There are 14 badges across five criteria types:
- `on_time_submissions`: 1, 5, 10, 25
- `rank`: 3, 5, 10
- `file_edits`: 10, 50, 100
- `streak`: 7, 30
- `total_submissions`: 50, 100

The `check_and_award_badges()` function is invoked after point awards to unlock new badges.

---

## 9. Theme System

### 9.1 Basic Preset Themes

**File:** `src/lib/theme.ts`

Four preset themes are defined as HSL color values:
- Modern Purple (default)
- Ocean Blue
- Forest Green
- Sunset Orange

`applyTheme()` injects CSS variables into `:root`:
```typescript
export function applyTheme(theme: Theme, mode: 'light' | 'dark' = 'light') {
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--success', theme.colors.success);
  root.style.setProperty('--warning', theme.colors.warning);
  root.style.setProperty('--info', theme.colors.info);
  // ...
}
```

### 9.2 Cinematic Themes

**File:** `src/lib/cinematicTheme.ts`

Five movie-inspired themes:
1. **The Matrix** (1999) â€” green code rain.
2. **Interstellar** (2014) â€” golden star field with wormhole glow.
3. **Tron: Legacy** (2010) â€” cyan grid with data pulses.
4. **Blade Runner 2049** (2017) â€” orange dust particles.
5. **Inception** (2010) â€” blue geometric spin.

Each theme defines a full palette (background, foreground, card, primary, secondary, muted, accent, border, ring, sidebar), `buttonRadius`, `fontFamily`, `animationType`, `glowColor`, `previewColors`, and `defaultCustomization`.

`applyCinematicTheme()` sets `data-cinematic="matrix"` on the root and overrides all CSS variables. The `CinematicBackground` component renders the correct canvas.

### 9.3 Canvas Animations

**Files:** `src/components/cinematic/*.tsx`

- **MatrixRainCanvas**: falling katakana + alphanumeric characters.
- **StarFieldCanvas**: twinkling stars, wormhole glow, occasional shooting stars.
- **TronGridCanvas**: perspective grid with glowing pulses.
- **DustParticlesCanvas**: rising particles with ambient haze.
- **GeometricSpinCanvas**: slow-drifting polygons.

All canvases read `intensity`, `speedMult`, and `accentColor` from the cinematic theme. They use `requestAnimationFrame` and resize on `window.innerWidth`/`window.innerHeight`.

### 9.4 CSS Variables & Tailwind

**File:** `tailwind.config.js`

Tailwind maps semantic colors to CSS variables:
```js
colors: {
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
  // ...
}
```

**File:** `src/index.css`

Contains premium background gradients, glassmorphism, card hover effects, status badges, and cinematic overrides:
```css
[data-cinematic] .card {
  background-color: hsl(var(--card) / 0.88);
  backdrop-filter: blur(8px);
}

[data-cinematic] [data-sidebar="sidebar"] {
  background-color: hsl(var(--sidebar-background) / 0.95);
  backdrop-filter: blur(12px);
}
```

---

## 10. AI Integration

### 10.1 Edge Functions

All AI calls go through Supabase Edge Functions (Deno + TypeScript). They share `cors.ts` and read `INTEGRATIONS_API_KEY` from environment variables.

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
```

**API URL pattern:**
```
https://app-biof3pfof94x-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse
```

### 10.2 AI Assistant

- Builds a system prompt with the user's assignments, projects, and files.
- Adds rolling conversation history (last 20 messages) and the current user message.
- Streams the Gemini response back to the client as Server-Sent Events.

```typescript
const contents = [];
contents.push({ role: 'user', parts: [{ text: systemPrompt }] });
contents.push({ role: 'model', parts: [{ text: 'Understood. I am AcadFlow AI Assistant...' }] });
// ... append history
contents.push({ role: 'user', parts: [{ text: message }] });
```

### 10.3 AI Analyzer

- Sends a single prompt requesting JSON output.
- Parses the JSON from the streamed response.
- Returns `AnalysisResult` to the frontend.

### 10.4 Smart Paste

- Extracts `title`, `description`, `dueDate`, `course`, `priority` from pasted text.
- Returns JSON used to pre-fill the create-assignment form.

---

## 11. Engineering Decisions & Pitfalls

### 11.1 Synthetic Email Strategy

**Decision:** Use `username@miaoda.com` as the internal Supabase Auth email for username/password users. This lets us treat usernames as first-class identities while using Supabase's email/password provider.

**Pitfall:** Activity logs and UI exposed `@miaoda.com` to users. Fixed by normalizing display to `@acadflow`.

### 11.2 RLS & SECURITY DEFINER Functions

**Decision:** Heavy use of `SECURITY DEFINER` functions for cross-row checks and statistics updates. This keeps the data model relational while allowing RLS to remain simple and performant.

**Key functions:**
- `is_project_member(project_uuid, user_uuid)`
- `is_project_creator(project_uuid, user_uuid)`
- `award_points(p_user_id, p_action, p_points)`
- `is_username_available(p_username)`
- `find_user_by_email(p_email)`
- `check_and_award_badges(p_user_id)`

### 11.3 File Upload Flow

**Decision:** Files are stored in Supabase Storage and metadata is written to the `files` table. The `files` table had a complex policy evolution (migrations 00001â€“00023) due to RLS recursion and insert timing issues. The final state uses direct inserts with the user_id from the authenticated client.

### 11.4 Points vs Coins

**Decision:** Originally gamification used only coins. A later migration added a `points` column and `award_points()` RPC. Coins are kept for legacy compatibility and updated alongside points.

### 11.5 Username Uniqueness

**Pitfall:** A duplicate `UNIQUE` constraint on `profiles.username` was created (migration 00031) and later removed (migration 00033) because the original trigger already created a unique index. The schema now has a single unique constraint on `username`.

### 11.6 Cinematic Theme Performance

**Decision:** Canvas backgrounds are rendered as `fixed` full-screen layers with `pointer-events-none` and `z-0`. They use `requestAnimationFrame` with `requestAnimationFrame` scheduling and `setProperty('--cinematic-speed')` to control frame pacing. This keeps the main UI thread responsive.

### 11.7 Google OAuth Linkage

**Decision:** Users can optionally provide their Gmail during signup. The `gmail` column in `profiles` stores this. When signing in via Google, the system can match the Google email to `profiles.gmail` and therefore preserve the username. This is handled by `find_user_by_email` RPC.

---

## 12. Environment Variables

```env
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

Edge Function environment (managed by Supabase):
```env
INTEGRATIONS_API_KEY=...
```

Note: `INTEGRATIONS_API_KEY` is **never** exposed to the frontend; it is only read inside Edge Functions.

---

## 13. Key Code Snippets

### 13.1 App Entry Point

```tsx
// src/App.tsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CinematicProvider } from '@/contexts/CinematicContext';
import { AppRoutes } from '@/routes';

export default function App() {
  return (
    <CinematicProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </CinematicProvider>
  );
}
```

### 13.2 Applying a Cinematic Theme

```typescript
// src/lib/cinematicTheme.ts
export function applyCinematicTheme(theme: CinematicTheme, customization: CinematicCustomization) {
  const root = document.documentElement;
  root.setAttribute('data-cinematic', theme.id);
  const p = theme.palette;
  root.style.setProperty('--background', p.background);
  root.style.setProperty('--foreground', p.foreground);
  // ... all other variables

  if (customization.accentColor) {
    const hsl = hexToHslValues(customization.accentColor);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--ring', hsl);
      root.style.setProperty('--sidebar-primary', hsl);
    }
  }

  root.style.setProperty('--radius', theme.buttonRadius);
  root.style.setProperty('--cinematic-font', getFontStack(customization.fontStyle, theme.fontFamily));
  root.style.setProperty('--cinematic-intensity', String(customization.bgIntensity / 100));
  root.style.setProperty('--cinematic-speed', speedMultiplier(customization.animationSpeed));
}
```

### 13.3 Status Badges

```tsx
// src/components/shared/Badges.tsx
export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant="outline" className={cn(
      'border',
      status === 'queue' && 'status-queue',
      status === 'in_progress' && 'status-in-progress',
      status === 'review' && 'status-review',
      status === 'completed' && 'status-completed',
    )}>
      {getStatusLabel(status)}
    </Badge>
  );
}
```

### 13.4 Awarding Points

```typescript
// Frontend usage
await supabase.rpc('award_points', {
  p_user_id: user.id,
  p_action: 'assignment_completed_ontime',
});
```

### 13.5 Smart Paste Invocation

```typescript
const { data, error } = await supabase.functions.invoke('smart-paste', {
  body: { text: pastedText },
});
// data = { title, description, dueDate, course, priority }
```

---

## 14. Out of Scope

- Real-time collaboration (no concurrent editing).
- Email notifications (password reset uses Supabase emails).
- Mobile native apps (web-only responsive PWA).
- Payment/subscription flows.
- Institution-wide admin dashboards.

---

## 15. Future Roadmap

- Add due-date reminders and push notifications.
- Support calendar integration (Google/Outlook).
- Expand AI to generate outlines and flashcards.
- Add peer review and comments on projects.
- Introduce challenges and weekly leaderboards.


## 16. Detailed Feature Implementation

### 16.1 Authentication Flows

#### 16.1.1 Login Page

**File:** `src/pages/Login.tsx`

The login page uses the synthetic email strategy:

```tsx
const { signIn, signInWithGoogle } = useAuth();
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);

async function handleSubmit(e: FormEvent) {
  e.preventDefault();
  setLoading(true);
  try {
    await signIn(username.trim(), password);
    navigate('/');
  } catch (err) {
    toast.error('Login failed: ' + extractError(err));
  } finally {
    setLoading(false);
  }
}
```

UI features:
- Password visibility toggle with `Eye`/`EyeOff` icons.
- "Continue with Google" button calling `signInWithGoogle()`.
- "Forgot password?" link.
- Animated gradient background via `LoginBackground`.

#### 16.1.2 Signup Page

**File:** `src/pages/Signup.tsx`

- Real-time username availability via `checkUsernameAvailable()`.
- Debounced input validation (3â€“30 chars, alphanumeric + underscore).
- Optional Gmail field for Google linkage.
- Password strength indicator.
- Confirm password matching.

```tsx
useEffect(() => {
  if (!username || username.length < 3) {
    setUsernameStatus('invalid');
    return;
  }
  setUsernameStatus('checking');
  const timer = setTimeout(async () => {
    const available = await checkUsernameAvailable(username);
    setUsernameStatus(available ? 'available' : 'taken');
  }, 400);
  return () => clearTimeout(timer);
}, [username, checkUsernameAvailable]);
```

#### 16.1.3 Forgot Password

**File:** `src/pages/ForgotPassword.tsx`

Calls `resetPassword(username)` which constructs `username@miaoda.com` and invokes Supabase's `resetPasswordForEmail` with redirect to `/reset-password`.

#### 16.1.4 Reset Password

**File:** `src/pages/ResetPassword.tsx`

- Validates new password and confirmation.
- Calls `supabase.auth.updateUser({ password })`.
- Redirects to `/login` on success.

### 16.2 App Layout & Navigation

**File:** `src/components/layouts/AppLayout.tsx`

The layout provides:
- Fixed left sidebar with 9 navigation items (Dashboard, Assignments, Projects, Files, AI Assistant, AI Analyzer, Activity Log, Achievements, Theme).
- Mobile sheet menu using shadcn `Sheet`.
- Theme toggle (dark/light) via `useTheme` from `next-themes`.
- Logout button and user profile display.

```tsx
const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/assignments', icon: BookOpen, label: 'Assignments' },
  { to: '/projects', icon: Users, label: 'Projects' },
  { to: '/files', icon: FolderOpen, label: 'Files' },
  { to: '/ai-assistant', icon: Bot, label: 'AI Assistant' },
  { to: '/ai-analyzer', icon: ScanSearch, label: 'AI Analyzer' },
  { to: '/activity', icon: Activity, label: 'Activity Log' },
  { to: '/achievements', icon: Trophy, label: 'Achievements' },
  { to: '/theme', icon: Palette, label: 'Theme' },
];
```

### 16.3 Assignments with Smart Paste

**File:** `src/pages/Assignments.tsx`

The page fetches assignments and renders them in a responsive grid using `AssignmentCard`. The Smart Paste flow:

1. User opens a dialog and pastes raw text.
2. Frontend invokes `smart-paste` Edge Function.
3. Extracted data is used to pre-fill the create form.

```tsx
const { data, error } = await supabase.functions.invoke('smart-paste', { body: { text } });
if (error) throw error;
setNewAssignment({
  title: data.title || '',
  description: data.description || '',
  course: data.course || '',
  due_date: data.dueDate || '',
  priority: data.priority || 'medium',
  weightage: '',
  status: 'queue',
});
```

When an assignment is marked completed:
```tsx
const onTime = assignment.due_date && new Date(assignment.due_date) >= new Date();
await supabase.rpc('award_points', {
  p_user_id: user.id,
  p_action: onTime ? 'assignment_completed_ontime' : 'assignment_completed_late',
});
await supabase.rpc('check_and_award_badges', { p_user_id: user.id });
```

### 16.4 Projects & Member Invitation

**File:** `src/pages/Projects.tsx`

Project visibility is controlled by RLS: users see projects they created or are members of. Member invitation uses the `find_user_by_email` RPC.

```tsx
const { data: foundUser, error: findError } = await supabase.rpc('find_user_by_email', {
  p_email: email.trim().toLowerCase(),
});

if (findUser) {
  await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: foundUser,
    email: email.trim().toLowerCase(),
  });
  await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'team_member_invited' });
}
```

### 16.5 Files & Folder Tree

**File:** `src/pages/Files.tsx`

The page builds a nested folder tree from flat `file_folders` rows. Each folder can contain files and subfolders. The `buildTree` helper recursively attaches `children` and `files`.

```tsx
function buildTree(folders: FileFolder[], files: FileRecord[], parentId: string | null = null): FileFolder[] {
  return folders
    .filter(f => f.parent_id === parentId)
    .map(f => ({
      ...f,
      children: buildTree(folders, files, f.id),
      files: files.filter(file => file.folder_id === f.id),
    }));
}
```

Upload flow:
1. User selects file via `input[type="file"]` or `dropzone`.
2. File is uploaded to Supabase Storage bucket `files` under `userId/filename`.
3. On success, a row is inserted into `files` table with `file_path`, `file_type`, `file_size`, `mime_type`, and optional `folder_id`.
4. `award_points` is called with `file_uploaded`.

### 16.6 AI Assistant Streaming

**File:** `src/pages/AIAssistant.tsx`

The frontend sends a request to the `ai-assistant` Edge Function and reads the SSE stream:

```tsx
const response = await supabase.functions.invoke('ai-assistant', {
  body: {
    message,
    conversationHistory,
    fileContext,
    assignmentContext,
    projectContext,
    sessionId,
  },
});

const reader = response.data?.getReader();
const decoder = new TextDecoder();
let assistantText = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value);
  // parse SSE lines
  for (const line of chunk.split('\n')) {
    if (line.startsWith('data: ')) {
      const text = parseSSELine(line);
      if (text) {
        assistantText += text;
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: assistantText }]);
      }
    }
  }
}

// Save to chat_messages
await supabase.from('chat_messages').insert({
  user_id: user.id,
  role: 'assistant',
  content: assistantText,
  session_id: sessionId,
});

await supabase.rpc('award_points', { p_user_id: user.id, p_action: 'ai_session' });
```

### 16.7 Achievements Page

**File:** `src/pages/Achievements.tsx`

The page loads all badges and the user's unlocked badges, then computes progress:

```tsx
const badgeProgress = badges.map(badge => {
  const unlocked = userBadges.some(ub => ub.badge_id === badge.id);
  const current = getCriteriaValue(stats, badge.criteria_type);
  const progress = Math.min(100, (current / badge.criteria_value) * 100);
  return { ...badge, unlocked, progress, unlocked_at: ... };
});
```

Locked badges show a progress bar; unlocked ones show a checkmark.

### 16.8 RLS Policy Summary

| Table | Policy |
|-------|--------|
| `assignments` | Users own their rows. |
| `projects` | Creator or member can select/update; only creator can delete. |
| `project_members` | Creator can insert/delete; members can view. |
| `files` | Owner can select; project members can view project files. |
| `activities` | User can view own activities or activities for their items/projects. |
| `chat_messages` | User can view/insert own messages. |
| `analysis_history` | User can view/insert own history. |
| `profiles` | User can view/update own profile; admins have full access. |

---

*End of AcadFlow PRD v58*


