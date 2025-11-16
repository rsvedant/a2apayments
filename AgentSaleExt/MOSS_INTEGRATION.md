# Moss RAG Integration Guide

## Overview

The extension now uses [Moss](https://moss.inferedge.com) for semantic vector search to retrieve relevant company documentation during sales calls.

## Features

✅ **Vector Search** - Semantic similarity matching instead of keyword search  
✅ **Personalized Indexes** - Each user has their own index based on first name  
✅ **Automatic Fallback** - Falls back to keyword matching if Moss unavailable  
✅ **Real-time Retrieval** - Queries during conversation for relevant docs  

## Setup

### 1. Get Moss Credentials

1. Sign up at [Moss](https://moss.inferedge.com)
2. Get your Project ID and API Key
3. Note them down for configuration

### 2. Configure Moss in Extension

Open browser console on Google Meet and run:

```javascript
// Set Moss credentials
await chrome.storage.local.set({
  mossProjectId: 'your-project-id-here',
  mossProjectKey: 'moss_your-api-key-here'
});
```

### 3. Create Your Index

The index name will be your **first name in lowercase** (e.g., "john" from "John Smith").

You can create an index programmatically or via Moss console:

```javascript
// Option 1: Using Moss SDK directly
import moss from '@inferedge/moss';

const client = new moss.MossClient('your-project-id', 'your-api-key');

// Create index with your documents
await client.createIndex('john', [
  { id: '1', text: 'Our platform offers SOC 2 Type II compliance and ISO 27001 certification.' },
  { id: '2', text: 'Pricing starts at $99/month for Starter, $299/month for Professional.' },
  { id: '3', text: 'We integrate with Salesforce, HubSpot, and all major CRMs.' },
  { id: '4', text: 'Case study: TechCorp increased sales productivity by 40%.' },
  // ... add your company docs
], 'moss-minilm');
```

### 4. Add Your Documents

Upload your company documentation as text chunks:

```javascript
const documents = [
  // Product information
  {
    id: 'product-1',
    text: 'Our AI-powered sales assistant helps teams close deals faster with real-time guidance.'
  },
  
  // Pricing
  {
    id: 'pricing-1',
    text: 'Starter: $99/month (up to 5 users). Professional: $299/month (up to 20 users). Enterprise: Custom pricing.'
  },
  
  // Technical specs
  {
    id: 'tech-1',
    text: 'Cloud-based SaaS platform. 99.9% uptime SLA. SOC 2 Type II certified. GDPR compliant. Data encrypted at rest and in transit.'
  },
  
  // Competitor info
  {
    id: 'competitor-1',
    text: 'vs Competitor A: We offer better CRM integration, 50% lower price, and 24/7 support.'
  },
  
  // Case studies
  {
    id: 'case-1',
    text: 'TechCorp Case Study: Increased close rate by 35% within 3 months using our platform.'
  },
  
  // Sales playbook
  {
    id: 'playbook-1',
    text: 'Objection: "Too expensive" → Response: Ask about current costs, show ROI calculator, mention 90-day guarantee.'
  }
];

await client.createIndex('john', documents, 'moss-minilm');
```

## How It Works

### Conversation Flow

```
1. Prospect mentions: "What about security compliance?"
         ↓
2. Extension queries Moss with semantic search
         ↓
3. Moss returns: "SOC 2 Type II, ISO 27001, GDPR compliant..."
         ↓
4. AI receives relevant context in prompt
         ↓
5. Suggestions reference actual compliance certifications
         ↓
6. You give accurate, specific response
```

### Example Query

**Prospect says**: "How does this integrate with our CRM?"

**Moss Query**: "How does this integrate with our CRM?"

**Moss Returns**:
1. "We integrate with Salesforce, HubSpot, and all major CRMs."
2. "Native Salesforce integration with bi-directional sync."
3. "Setup takes 15 minutes with our guided wizard."

**AI Suggestion**: "We have native Salesforce integration with bi-directional sync. Setup takes just 15 minutes."

## Index Name Convention

The index name is automatically set to your **first name in lowercase**:

```javascript
// User profile
{
  name: "John Smith",
  email: "john@company.com"
}

// Index name → "john"
```

This allows:
- Personalized document sets per sales rep
- Easy index management
- Simple reference in queries

## Document Best Practices

### 1. Chunk Size
Keep documents focused (100-300 words each):
```javascript
// Good
{ id: '1', text: 'Starter tier: $99/month, 5 users, basic features.' }

// Too long
{ id: '1', text: 'Here is all our pricing...' } // 1000+ words
```

### 2. Semantic Clarity
Write documents the way prospects ask questions:
```javascript
// Good - matches "what's your pricing"
{ text: 'Pricing: Starter $99/month, Pro $299/month, Enterprise custom.' }

// Less effective
{ text: 'Revenue models available in three tiers...' }
```

### 3. Overlap is OK
Similar documents with different phrasing help matching:
```javascript
{ text: 'SOC 2 Type II certified, ISO 27001 compliant.' }
{ text: 'We meet all major security standards including SOC 2 and ISO 27001.' }
```

### 4. Organize by Topic
```javascript
// Security docs
{ id: 'sec-1', text: 'SOC 2 Type II...' }
{ id: 'sec-2', text: 'Penetration testing quarterly...' }

// Pricing docs
{ id: 'price-1', text: 'Starter: $99/month...' }
{ id: 'price-2', text: 'Volume discounts available...' }
```

## Fallback System

If Moss is unavailable, the system automatically falls back to keyword matching:

```
Moss Available → Semantic vector search
Moss Unavailable → Keyword matching with company docs
```

You can still configure company docs in Chrome storage:

```javascript
await chrome.storage.local.set({
  companyDocs: {
    productInfo: "Product description...",
    pricing: "Pricing information...",
    technicalSpecs: "Technical specifications...",
    salesPlaybook: "Sales objection handling...",
    competitorInfo: "Competitor comparisons...",
    caseStudies: "Customer success stories..."
  }
});
```

## Querying Moss

### Automatic Queries

The extension automatically queries Moss when:
1. Prospect/client speaks (detected via smart speech detection)
2. Statement contains potential questions or topics
3. Query sent to Moss with speaker's statement

### Manual Testing

Test your Moss index:

```javascript
import moss from '@inferedge/moss';

const client = new moss.MossClient('project-id', 'api-key');
await client.loadIndex('john');

// Test queries
const results = await client.query('john', 'What security certifications do you have?');
console.log(results);
```

## Advanced Configuration

### Update Index

Add new documents without recreating:

```javascript
// Note: Check Moss SDK docs for append/update operations
// Current version requires recreating index with all docs
```

### Multiple Indexes

Different indexes for different contexts:

```javascript
// Personal knowledge
await client.createIndex('john', personalDocs, 'moss-minilm');

// Team knowledge
await client.createIndex('john-team', teamDocs, 'moss-minilm');

// Update ContextService to query both
```

### Model Selection

Moss supports different embedding models:
- `moss-minilm` - Fast, good for general use (default)
- Other models - Check Moss documentation

## Troubleshooting

### Moss Not Working

Check console for errors:
```javascript
// Look for:
[ContextService] Moss client initialized
[ContextService] Moss index loaded: john
[ContextService] Moss results: [...]
```

### No Results Returned

1. **Check index exists**: Verify index name matches your first name (lowercase)
2. **Check documents**: Ensure documents were uploaded successfully
3. **Test query**: Try simple query in Moss console
4. **Check credentials**: Verify Project ID and API Key are correct

### Fallback to Keywords

If you see:
```
[ContextService] Moss query error: ...
```

System is falling back to keyword matching. Check:
- Moss credentials configured
- Index loaded successfully
- Network connectivity

## Cost Considerations

Moss pricing (check current rates):
- **Index Creation**: One-time cost per index
- **Queries**: Per query cost
- **Storage**: Per document/month

Optimization tips:
- Reuse indexes across sessions
- Batch document uploads
- Cache common queries (future feature)

## Security

- ✅ API keys stored in Chrome local storage (not synced)
- ✅ Credentials never leave browser except to Moss API
- ✅ Documents stored in your Moss account
- ✅ No data sent to third parties

## Migration from Keyword Matching

Old system:
```javascript
// Simple keyword matching
if (query.includes('price')) return pricingDoc;
```

New system:
```javascript
// Semantic search
const results = await mossClient.query(indexName, query);
// Returns relevant docs even if exact keywords don't match
```

Benefits:
- Understands intent, not just keywords
- Finds relevant docs even with different phrasing
- Handles synonyms and related concepts
- More accurate context for AI

## Example Complete Setup

```javascript
// 1. Install Moss (already in package.json)
npm install @inferedge/moss

// 2. Configure credentials
await chrome.storage.local.set({
  mossProjectId: '4a2c4c42-f070-4714-8dbd-17fa6b94cbfe',
  mossProjectKey: 'moss_8FMj9dAMpXpA7XqfONExBtuGE7XUJMu5'
});

// 3. Set user profile
await chrome.storage.local.set({
  userProfile: {
    name: 'John Smith',
    email: 'john@company.com'
  }
});

// 4. Create index with documents
import moss from '@inferedge/moss';
const client = new moss.MossClient('project-id', 'api-key');

await client.createIndex('john', [
  { id: '1', text: 'Security: SOC 2, ISO 27001, GDPR compliant' },
  { id: '2', text: 'Pricing: $99-299/month based on tier' },
  { id: '3', text: 'Integrations: Salesforce, HubSpot native' },
  // ... more docs
], 'moss-minilm');

// 5. Extension automatically loads and queries
```

## Next Steps

1. ✅ Configure Moss credentials
2. ✅ Set user profile (first name used for index)
3. ✅ Create your index with company docs
4. ✅ Test queries in Moss console
5. ✅ Use extension in Google Meet
6. ✅ Monitor console for Moss query results

## Support

- Moss Documentation: https://moss.inferedge.com/docs
- Extension Issues: Check browser console logs
- RAG not working: Verify fallback to keyword matching works
