# Moss Integration Debug Guide

## Issues Fixed

### 1. **Import Error** ✅
**Problem**: `SyntaxError: does not provide an export named 'default'`

**Root Cause**: Tried to use default import
```typescript
import moss from '@inferedge/moss'; // ❌ Wrong
```

**Solution**: Use named export
```typescript
import { MossClient } from '@inferedge/moss'; // ✅ Correct
```

### 2. **Query Result Structure** ✅
**Problem**: Code expected array, Moss returns object

**Moss Returns**:
```typescript
{
  query: "user's query string",
  docs: [
    { score: 0.9234, id: "doc1", text: "document content" },
    { score: 0.8756, id: "doc2", text: "more content" }
  ]
}
```

**Fixed**: Access `result.docs` instead of treating result as array

### 3. **Index Name** ✅
**Fixed**: Now uses "User" (matching your test.js)

### 4. **Made Moss Optional** ✅
- Extension works without Moss
- Dynamic import doesn't block startup
- Graceful fallback to keyword matching

## How Moss Works in Extension

### Setup Flow

```
1. Extension starts
   ↓
2. ContextService.initialize()
   ↓
3. Check Chrome storage for mossProjectKey & mossProjectId
   ↓
4. If found → import('@inferedge/moss')
   ↓
5. new MossClient(projectId, apiKey)
   ↓
6. Set indexName = "User"
   ↓
7. loadIndex("User")
   ↓
8. Ready to query!
```

### Query Flow

```
User speaks → AI detects query
   ↓
ContextService.queryRAG(query)
   ↓
IF Moss enabled:
   client.query("User", query, 3)
   ↓
   Returns { query, docs: [...] }
   ↓
   Extract doc.text from each result
   ↓
   Return to AI for suggestions
ELSE:
   Keyword matching fallback
```

## Setup Instructions

### 1. Configure Moss Credentials

Open browser console on Google Meet:

```javascript
// Set your Moss credentials
await chrome.storage.local.set({
  mossProjectId: '4a2c4c42-f070-4714-8dbd-17fa6b94cbfe',
  mossProjectKey: 'moss_8FMj9dAMpXpA7XqfONExBtuGE7XUJMu5'
});

console.log('✅ Moss credentials saved!');
```

### 2. Create "User" Index

You already have this in your test.js. Make sure it's created:

```javascript
import { MossClient } from '@inferedge/moss';

const client = new MossClient(
  '4a2c4c42-f070-4714-8dbd-17fa6b94cbfe',
  'moss_8FMj9dAMpXpA7XqfONExBtuGE7XUJMu5'
);

// Example documents - replace with your actual data
const documents = [
  { 
    id: '1', 
    text: 'Our platform is SOC 2 Type II certified and ISO 27001 compliant. We use 256-bit encryption for all data.' 
  },
  { 
    id: '2', 
    text: 'Pricing: Starter $99/month (5 users), Professional $299/month (20 users), Enterprise custom pricing.' 
  },
  { 
    id: '3', 
    text: 'We integrate natively with Salesforce, HubSpot, Pipedrive, and all major CRMs via API.' 
  },
  {
    id: '4',
    text: 'Case Study: TechCorp increased their sales productivity by 40% and closed 25% more deals within 3 months.'
  },
  {
    id: '5',
    text: 'Quick answers: SOC 2 Type II, ISO 27001, SSO, SCIM, SAML 2.0, 99.9% uptime SLA, 24/7 support.'
  }
];

// Create index (only need to do once)
await client.createIndex('User', documents, 'moss-minilm');
console.log('✅ Index "User" created!');

// Load index (to test it works)
await client.loadIndex('User');
console.log('✅ Index "User" loaded!');

// Test query
const result = await client.query('User', 'SOC 2 Type II ISO 27001 SSO SCIM quick answers');
console.log('Query results:', result);
console.log(`Found ${result.docs.length} results`);
result.docs.forEach(doc => {
  console.log(`  Score: ${doc.score.toFixed(4)} - ${doc.text.substring(0, 100)}...`);
});
```

### 3. Reload Extension

After configuring credentials:
1. Go to `chrome://extensions`
2. Find your extension
3. Click reload button
4. Check console for Moss initialization logs

## Expected Console Logs

### Successful Moss Setup:
```
[ContextService] Initialization complete
[ContextService] Moss client initialized with index: User
[ContextService] Loading Moss index: User
[ContextService] Moss index loaded successfully: User
```

### During Query:
```
[ContextService] RAG query: What security certifications do you have?
[ContextService] Querying Moss index "User" with: "What security certifications do you have?"
[ContextService] Moss query result: { query: "...", docs: [...] }
[ContextService] Moss doc - Score: 0.9234, ID: 1
[ContextService] Moss doc - Score: 0.8756, ID: 5
[ContextService] Returning 2 Moss results
```

### If Moss Not Available:
```
[ContextService] Moss module not available, using fallback RAG
[ContextService] Moss not enabled, using keyword matching
```

## Troubleshooting

### Issue: "Moss client initialized" but "Error loading Moss index"

**Cause**: Index "User" doesn't exist yet

**Solution**: Create the index using the script above

### Issue: "Moss module not available"

**Possible causes**:
1. `@inferedge/moss` not installed
   ```bash
   npm install @inferedge/moss
   ```

2. Import error (should be fixed now with named export)

3. Build issue - try:
   ```bash
   npm run build
   ```

### Issue: "Moss credentials not found"

**Solution**: Set credentials in Chrome storage (see step 1 above)

### Issue: Query returns no results

**Possible causes**:
1. Index empty or not loaded
2. Query doesn't match any documents
3. Wrong index name

**Debug**:
```javascript
// Check if index exists
const client = new MossClient('project-id', 'api-key');
await client.loadIndex('User');

// Try simple query
const result = await client.query('User', 'test', 5);
console.log('Results:', result);
```

## Testing Moss Integration

### Test 1: Check Credentials
```javascript
chrome.storage.local.get(['mossProjectKey', 'mossProjectId'], (result) => {
  console.log('Moss credentials:', result);
});
```

### Test 2: Manual Query
```javascript
import { MossClient } from '@inferedge/moss';

const client = new MossClient('your-project-id', 'your-api-key');
await client.loadIndex('User');

const result = await client.query('User', 'pricing information', 3);
console.log('Query:', result.query);
console.log('Found:', result.docs.length, 'documents');
result.docs.forEach(doc => {
  console.log(`- [${doc.score.toFixed(3)}] ${doc.text.substring(0, 80)}...`);
});
```

### Test 3: Check Extension Logs

During a Google Meet call with captions:
1. Open DevTools (F12)
2. Watch console
3. Speak or have someone speak
4. Look for:
   ```
   [ContextService] RAG query: ...
   [ContextService] Querying Moss index "User"...
   [ContextService] Returning X Moss results
   ```

## Example Document Set

For a sales assistant, create documents covering:

```javascript
const salesDocs = [
  // Product info
  { id: 'prod-1', text: 'Our AI-powered sales assistant provides real-time guidance during calls with automatic note-taking and CRM sync.' },
  
  // Pricing
  { id: 'price-1', text: 'Pricing: Starter $99/mo (5 users), Pro $299/mo (20 users), Enterprise custom. 14-day free trial available.' },
  
  // Security
  { id: 'sec-1', text: 'Security: SOC 2 Type II certified, ISO 27001 compliant, GDPR ready, SSO/SAML, SCIM provisioning, 256-bit encryption.' },
  
  // Integrations
  { id: 'int-1', text: 'Integrations: Native Salesforce, HubSpot, Pipedrive connectors. REST API for custom integrations. Zapier support.' },
  
  // Features
  { id: 'feat-1', text: 'Features: Real-time transcription, AI suggestions, automatic CRM updates, deal insights, competitor tracking.' },
  
  // Support
  { id: 'sup-1', text: 'Support: 24/7 email support (all plans), live chat (Pro+), dedicated CSM (Enterprise), 99.9% uptime SLA.' },
  
  // Competitors
  { id: 'comp-1', text: 'vs Gong: 50% lower cost, better real-time AI, faster setup. vs Chorus: More accurate transcription, better CRM integration.' },
  
  // ROI
  { id: 'roi-1', text: 'Average ROI: 40% increase in sales productivity, 25% more deals closed, 3 hours/week saved per rep.' },
  
  // Case studies
  { id: 'case-1', text: 'TechCorp: Increased close rate by 35% in 3 months, reduced admin time by 50%, improved forecast accuracy by 40%.' },
  
  // Common objections
  { id: 'obj-1', text: 'Objection handling: "Too expensive" → Show ROI calculator, 90-day guarantee. "Too complex" → 15-min setup, full training included.' },
];

await client.createIndex('User', salesDocs, 'moss-minilm');
```

## Performance Tips

1. **Keep documents focused** (100-300 words each)
2. **Write like prospects ask** (natural language)
3. **Include variations** (same info, different phrasing)
4. **Update regularly** (pricing, features change)
5. **Test queries** (use real sales call questions)

## Next Steps

1. ✅ Moss credentials configured
2. ✅ "User" index created with documents
3. ✅ Extension reloaded
4. ✅ Test query in console
5. ✅ Join Google Meet
6. ✅ Enable captions
7. ✅ Speak and check logs
8. ✅ Verify AI suggestions use Moss results

## Current Status

✅ Import fixed (named export)
✅ Query result handling fixed
✅ Index name set to "User"
✅ Dynamic import (optional)
✅ Detailed logging added
✅ Fallback to keyword matching

**Ready to test!**

## Summary of Changes

### ContextService.ts
1. **initializeMoss()**: Uses dynamic import, named export `MossClient`, sets index to "User"
2. **loadMossIndex()**: Better error messages, helpful debug output
3. **queryRAG()**: Fixed to handle `{ query, docs }` structure, added detailed logging

All changes maintain backward compatibility - extension works with or without Moss!
