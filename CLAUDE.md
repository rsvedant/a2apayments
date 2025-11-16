# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SaleSister is a Next.js application that provides AI-powered sales assistance during live calls. It uses Convex as the backend platform, Better Auth for authentication, Moss for vector search, and integrates with HubSpot CRM and Vapi for voice AI.

## Development Commands

### Start Development Environment
```bash
bun dev
```
This starts both Next.js (`next dev`) and Convex (`convex dev`) concurrently using the `concurrently` package.

**IMPORTANT:** Convex **must** be running for the frontend to work. If you see issues where buttons don't respond or queries fail, verify that `bun x convex dev` is running in a separate terminal.

### Build and Deploy
```bash
bun run build      # Build Next.js for production
bun run start      # Start production server
```

### Testing Scripts
```bash
bun run test:crm          # Test HubSpot CRM sync
bun run test:processing   # Test call processing pipeline
bun run populate:data     # Populate test data
```

### Convex Environment Variables
Set Convex-specific env vars (not in `.env.local`):
```bash
npx convex env set SITE_URL http://localhost:3000
npx convex env set MOSS_PROJECT_ID "your-project-id"
npx convex env set MOSS_API_KEY "moss_..."
npx convex env set GOOGLE_CLIENT_ID "your-client-id"
npx convex env set GOOGLE_CLIENT_SECRET "your-secret"
```

## Architecture

### Frontend (Next.js App Router)
- **Authentication Flow**: `/auth/sign-in` → onboarding → `/dashboard`
- **Onboarding**: Multi-step flow in `/app/onboarding` with 4 steps:
  1. Sales script upload (PDF/DOCX/TXT)
  2. Company docs upload (creates Moss vector index)
  3. HubSpot connection
  4. Chrome extension connection
- **Main App**: `/dashboard` displays call history, analytics, and settings

### Backend (Convex)

#### Authentication (`convex/auth.ts`)
- Uses **@convex-dev/better-auth** with Better Auth integration
- `authComponent.getAuthUser(ctx)` - for queries and mutations
- `ctx.auth.getUserIdentity()` - for actions (returns identity with `.subject` field)
- **Critical**: Actions cannot use `authComponent.getAuthUser()` - they only have access to `ctx.auth.getUserIdentity()`

#### Database Schema (`convex/schema.ts`)
- `userSettings`: User configuration, sales scripts, company docs, HubSpot API keys, Moss index names
- `calls`: Call recordings with transcriptions, processed by cron jobs
- `sessions`: Real-time call tracking with LiveKit integration
- `suggestions`: AI suggestions generated during calls

#### Key Convex Files
- `convex/onboarding.ts`: Handles onboarding flow, creates Moss vector indexes using **direct HTTP calls** to Moss API
- `convex/calls.ts`: Call CRUD operations and processing
- `convex/crons.ts`: Background jobs for processing unprocessed calls
- `convex/http.ts`: HTTP endpoints for Chrome extension (`/api/calls/create`)

### Document Processing
**Browser-only libraries** (pdfjs-dist, pizzip):
- Must use **dynamic imports** to avoid SSR issues
- Pattern:
  ```typescript
  let pdfjsLib: any = null
  let PizZip: any = null

  if (typeof window !== 'undefined') {
    import('pdfjs-dist').then((pdfjs) => {
      pdfjsLib = pdfjs
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
    })
  }

  // In extraction function:
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'
  }
  ```
- PDF.js worker file (`pdf.worker.mjs`) must be in `/public` directory

### Moss Vector Search Integration
- **Direct HTTP API calls** (not SDK) to avoid bundling issues
- Creates per-user indexes: `user-{userId}-docs-{timestamp}`
- Documents chunked into ~500 words for semantic search
- Endpoint: `https://q65uayaa3mjrvpw5t3rwmjj4wq0npjgl.lambda-url.us-east-1.on.aws/`
- Operations: `createIndex`, `loadIndex`, `query`

### State Management
- Zustand store for onboarding flow (`stores/onboarding-store.ts`)
- **Do not persist File objects** - they cannot be serialized to localStorage

## Common Patterns

### Calling Convex from Client Components
```typescript
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'

// Queries (reactive, auto-refresh)
const data = useQuery(api.namespace.functionName, { args })

// Mutations (write to DB)
const mutate = useMutation(api.namespace.functionName)
await mutate({ args })

// Actions (can call external APIs)
const action = useAction(api.namespace.functionName)
await action({ args })
```

### Authentication in Convex Functions
```typescript
// Queries and Mutations
const user = await authComponent.getAuthUser(ctx)
if (!user?.userId) throw new Error("Not authenticated")

// Actions (DIFFERENT!)
const identity = await ctx.auth.getUserIdentity()
if (!identity?.subject) throw new Error("Not authenticated")
const userId = identity.subject  // Better Auth user ID
```

### Onboarding Data Flow
1. Client uploads files → extract text locally
2. Store extracted text in `localStorage`
3. Call `initializeMossIndex` action → creates Moss vector index
4. Store `mossIndexName` in `localStorage`
5. On completion, call `completeOnboarding` mutation → saves all to `userSettings`

## Environment Variables

### `.env.local` (Frontend)
```
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_VAPI_PUBLIC_ASSISTANT_ID=...
NEXT_PUBLIC_VAPI_PUBLIC_API_KEY=...
```

### Convex Environment (set via CLI)
```
SITE_URL
MOSS_PROJECT_ID
MOSS_API_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
BETTER_AUTH_SECRET
INTERNAL_EMAIL_PROXY_SECRET
```

## Known Issues & Workarounds

1. **Convex Must Be Running**: Frontend requires active `bun x convex dev` process
2. **PDF.js SSR Issue**: Use dynamic imports with `typeof window !== 'undefined'` checks
3. **Better Auth in Actions**: Use `ctx.auth.getUserIdentity().subject`, not `authComponent.getAuthUser()`
4. **File Serialization**: Never persist `File` objects in Zustand/localStorage
5. **Moss SDK Bundling**: Use direct HTTP API calls instead of `@inferedge/moss` SDK

## Chrome Extension Integration

The Chrome extension POSTs call data to `/api/calls/create` HTTP endpoint:
```typescript
{
  userId: string,
  title: string,
  transcription: string,
  participants: string,  // JSON array
  duration?: number,
  recordingUrl?: string
}
```

Calls are created via `internal.calls.createInternal` mutation (bypasses auth) and processed by cron jobs.
