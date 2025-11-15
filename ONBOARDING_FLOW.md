# Onboarding Flow Implementation

## Overview

A comprehensive, per-user onboarding system that collects sales scripts, company documentation, and integrates with Moss vector search for semantic retrieval during sales calls.

## Architecture

### Frontend Components
- **[sales-script-upload.tsx](components/onboarding/sales-script-upload.tsx:1)** - Upload sales scripts (.txt files)
- **[company-docs-upload.tsx](components/onboarding/company-docs-upload.tsx:1)** - Upload company docs with Moss indexing
- **[hubspot-connect.tsx](components/onboarding/hubspot-connect.tsx:1)** - HubSpot integration (demo mode)
- **[extension-connect.tsx](components/onboarding/extension-connect.tsx:1)** - Chrome extension connection (demo mode)

### Backend (Convex)
- **[convex/onboarding.ts](convex/onboarding.ts:1)** - Core onboarding logic with Moss API integration

## User Flow

### Step 1: Sales Scripts (Optional)
- User uploads .txt files containing sales scripts
- Files are read client-side using `file.text()`
- Text is stored in localStorage temporarily
- Maximum 3 files, 5MB each

### Step 2: Company Documentation (Required)
- User uploads .txt files with company information
- Files are processed client-side
- Text is sent to Convex action `initializeMossIndex`
- Moss creates a semantic search index:
  - Documents are chunked into 500-word segments
  - Each chunk gets embedded using `moss-minilm` model
  - Index name format: `user-{userId}-docs-{timestamp}`
  - Index name stored in `userSettings.mossIndexName`

### Step 3: HubSpot Connection (Demo)
- Simulated connection flow
- In production, would implement OAuth flow
- API key stored in `userSettings.hubspotApiKey` (currently plaintext - needs encryption)

### Step 4: Extension Installation (Demo)
- Simulated extension installation
- Shows connection animation

### Completion
- All data saved to Convex via `completeOnboarding` mutation
- User redirected to dashboard
- localStorage cleaned up

## Data Storage

### Convex Database Schema

```typescript
userSettings: {
  userId: string                    // Better Auth user ID
  systemPrompt?: string            // Custom AI instructions
  salesScript?: string             // Uploaded sales scripts (concatenated)
  companyDocs?: string             // Company documentation (concatenated)
  hubspotApiKey?: string           // HubSpot API key (PLAINTEXT - needs encryption!)
  hubspotEnabled: boolean          // Is HubSpot sync active?
  mossIndexName?: string           // Reference to Moss vector index
}
```

### Moss Vector Search

**Index Structure:**
- Index per user: `user-{userId}-docs-{timestamp}`
- Documents chunked into 500-word segments
- Metadata per chunk:
  - `fileName` - Original filename
  - `chunkIndex` - Position in document
  - `totalChunks` - Total chunks from file
  - `category` - Always "company_docs"
  - `userId` - Owner's user ID

**Querying:**
```typescript
// Example: Retrieve relevant docs for a sales call
const results = await ctx.runAction(api.onboarding.queryCompanyDocs, {
  query: "What are our pricing tiers?",
  limit: 5
});

// Returns: Top 5 most semantically similar document chunks
```

## Security Considerations

### Current Issues
1. **HubSpot API Key** - Stored in plaintext in database
   - ⚠️  **TODO:** Encrypt before storing
   - Recommended: Use Convex environment variables or external secrets manager

2. **File Upload** - No server-side validation
   - ⚠️  **TODO:** Add file type validation in Convex actions
   - ⚠️  **TODO:** Add virus scanning for production
   - ⚠️  **TODO:** Implement size limits on server-side

3. **Moss API Credentials** - Stored in Convex environment
   - ✅ Correct approach using `process.env`
   - Set via: `npx convex env set MOSS_PROJECT_ID <id>`

### Implemented Security
- ✅ Authentication check - Only signed-in users can onboard
- ✅ Per-user isolation - Each user has their own Moss index
- ✅ Authorization - All mutations check `authComponent.getAuthUser(ctx)`

## API Reference

### Convex Functions

#### `initializeMossIndex` (Action)
Creates a Moss vector search index for the user's company documentation.

**Args:**
```typescript
{
  companyDocs: Array<{
    fileName: string
    text: string
  }>
}
```

**Returns:**
```typescript
{
  indexName: string          // Moss index identifier
  documentCount: number      // Total chunks created
  sourceFiles: string[]      // Original filenames
}
```

**Flow:**
1. Validates user authentication
2. Retrieves Moss credentials from environment
3. Chunks documents into 500-word segments
4. Calls Moss API via HTTP POST
5. Returns index reference for storage

#### `queryCompanyDocs` (Action)
Performs semantic search on the user's company documentation.

**Args:**
```typescript
{
  query: string              // Search query
  limit?: number             // Max results (default: 5)
}
```

**Returns:**
```typescript
{
  query: string
  timeTakenInMs: number
  results: Array<{
    id: string
    text: string
    score: number
    metadata: Record<string, string>
  }>
}
```

#### `completeOnboarding` (Mutation)
Saves all onboarding data to the database.

**Args:**
```typescript
{
  salesScript?: string
  companyDocs?: string
  mossIndexName?: string
  hubspotApiKey?: string
  hubspotEnabled: boolean
}
```

**Returns:**
```typescript
{
  success: boolean
  settingsId: Id<"userSettings">
}
```

#### `hasCompletedOnboarding` (Mutation)
Checks if user has completed onboarding.

**Returns:** `boolean`

## Moss API Integration

### Direct HTTP Approach
Instead of using the `@inferedge/moss` SDK (which caused Convex bundling issues due to Node.js dependencies), we make direct HTTP calls to the Moss API.

**Endpoint:** `https://q65uayaa3mjrvpw5t3rwmjj4wq0npjgl.lambda-url.us-east-1.on.aws/`

**Request Format:**
```typescript
{
  action: "createIndex" | "loadIndex" | "query",
  projectId: string,
  projectKey: string,
  // Action-specific parameters
}
```

### Example: Create Index
```typescript
await fetch(MOSS_API_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "createIndex",
    projectId: process.env.MOSS_PROJECT_ID,
    projectKey: process.env.MOSS_API_KEY,
    indexName: "user-abc123-docs-1234567890",
    docs: [
      {
        id: "doc-chunk-0",
        text: "Our product offers...",
        metadata: { fileName: "product.txt", chunkIndex: "0" }
      }
    ],
    modelId: "moss-minilm"
  })
});
```

## Testing

### Manual Test Flow
1. Navigate to `/onboarding`
2. Upload a .txt file with sales script (optional)
3. Upload 1-3 .txt files with company info (required)
   - Watch for toast notifications
   - Should see "Creating search index..." message
4. Click through HubSpot and Extension steps (both simulated)
5. Complete onboarding
6. Verify redirect to dashboard

### Verify Data
```javascript
// In Convex Dashboard
db.query("userSettings")
  .withIndex("by_userId", q => q.eq("userId", "YOUR_USER_ID"))
  .first()

// Should see:
// - salesScript: concatenated text
// - companyDocs: concatenated text
// - mossIndexName: "user-{id}-docs-{timestamp}"
```

### Test Semantic Search
```javascript
// In Convex Dashboard Functions tab
await ctx.runAction(api.onboarding.queryCompanyDocs, {
  query: "What does our product do?",
  limit: 3
});

// Should return relevant chunks from uploaded docs
```

## Environment Variables

Required in Convex:
```bash
MOSS_PROJECT_ID="your-moss-project-id"
MOSS_API_KEY="moss_your-api-key"
```

Set via:
```bash
npx convex env set MOSS_PROJECT_ID "4a2c4c42-f070-4714-8dbd-17fa6b94cbfe"
npx convex env set MOSS_API_KEY "moss_8FMj9dAMpXpA7XqfONExBtuGE7XUJMu5"
```

## File Limitations

### Current Support
- **Accepted:** .txt files only
- **Max Files:** 3 for sales scripts, 10 for company docs
- **Max Size:** 5MB for sales scripts, 10MB for company docs

### Why Only .txt?
- Avoids need for PDF/DOCX parsing libraries (pdf-parse, mammoth)
- Prevents Convex bundling issues with Node.js-specific modules
- Simplifies client-side processing (uses native `file.text()`)

### Adding PDF/DOCX Support
If needed in the future:
1. Process files client-side using browser-compatible libraries
2. Extract text before sending to Convex
3. Or use a separate file processing microservice

## Integration with Sales Calls

When a sales call is active, the system can retrieve relevant company information:

```typescript
// In your call handler
const userSettings = await ctx.db
  .query("userSettings")
  .withIndex("by_userId", q => q.eq("userId", userId))
  .first();

if (userSettings?.mossIndexName) {
  // Get relevant docs based on conversation context
  const relevantDocs = await ctx.runAction(api.onboarding.queryCompanyDocs, {
    query: "Current conversation topic or question",
    limit: 3
  });

  // Add to AI prompt context
  const context = relevantDocs.results
    .map(r => r.text)
    .join("\n\n");

  const systemPrompt = `${userSettings.systemPrompt}

Relevant company information:
${context}

${userSettings.salesScript}`;
}
```

## Future Improvements

### Short Term
- [ ] Add loading states during Moss indexing
- [ ] Show indexing progress (chunking, embedding, etc.)
- [ ] Add ability to re-upload/update documents
- [ ] Implement document preview before uploading

### Medium Term
- [ ] Add PDF/DOCX support with client-side processing
- [ ] Implement real HubSpot OAuth flow
- [ ] Encrypt HubSpot API keys at rest
- [ ] Add document management dashboard
- [ ] Allow editing/deleting individual docs

### Long Term
- [ ] Support multiple file formats (CSV, JSON, Markdown)
- [ ] Implement document versioning
- [ ] Add collaborative team document sharing
- [ ] Build custom embedding model fine-tuned for sales
- [ ] Implement RAG (Retrieval Augmented Generation) pipeline

## Troubleshooting

### Moss Index Creation Fails
**Error:** "Moss API error (500)"
- Check environment variables are set correctly
- Verify Moss API key is valid
- Check document text is not empty
- Ensure documents contain actual content (not just whitespace)

### TypeScript Errors in IDE
**Issue:** `Property 'onboarding' does not exist on type...`
- Wait for Convex dev server to regenerate types
- Check `convex/_generated/api.d.ts` for onboarding exports
- Restart Convex dev server: `npx convex dev`

### Files Not Processing
**Issue:** No toast notifications after file selection
- Check browser console for errors
- Verify files are .txt format
- Check file size is under limits
- Ensure text content is UTF-8 encoded

## Code Locations

**Frontend:**
- Onboarding page: [app/onboarding/page.tsx](app/onboarding/page.tsx:1)
- Upload components: [components/onboarding/](components/onboarding/)
- State management: [stores/onboarding-store.ts](stores/onboarding-store.ts:1)

**Backend:**
- Onboarding logic: [convex/onboarding.ts](convex/onboarding.ts:1)
- User settings: [convex/userSettings.ts](convex/userSettings.ts:1)
- Schema: [convex/schema.ts](convex/schema.ts:1)

## Resources

- Moss Documentation: https://inferedge.com/moss
- Convex Actions: https://docs.convex.dev/functions/actions
- Better Auth: https://www.better-auth.com/docs
