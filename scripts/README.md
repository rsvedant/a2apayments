# Testing Scripts

Scripts for populating test data and testing CRM sync functionality.

## Setup

Make sure Convex is running:
```bash
npx convex dev
```

And that your `.env` or `.env.local` contains:
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

## Scripts

### 1. Populate Test Data

Populates your Convex database with test calls and actionables.

```bash
npm run populate:data
```

Or with a HubSpot API key:
```bash
HUBSPOT_API_KEY=your_key npm run populate:data
```

**What it creates:**
- User settings with HubSpot API key
- 2 test calls with full transcriptions
- 4 test actionables (tasks, follow-ups, deals)
- All linked to test user ID: `test-user-123`

### 2. Test CRM Sync

Tests syncing data to HubSpot CRM.

```bash
npm run test:crm <callId> <actionableId>
```

Example (use IDs from populate script output):
```bash
npm run test:crm jx7abc123 jx7xyz456
```

**What it does:**
- Verifies HubSpot is configured
- Syncs the call to HubSpot as a Note
- Syncs the actionable to HubSpot as a Task or Deal
- Shows you the HubSpot entity IDs

## Authentication

These scripts use **admin functions** (`convex/admin.ts`) that bypass authentication for testing purposes.

All data is associated with a test user ID: `test-user-123`

> ⚠️ **Security Note:** The admin functions should be protected or removed in production!

## Troubleshooting

### "CONVEX_URL not set"
Make sure `npx convex dev` is running and check your `.env.local` file.

### "Could not find public function"
Convex isn't running. Start it with:
```bash
npx convex dev
```

### "Unauthenticated"
The scripts now use admin functions and shouldn't require authentication. If you see this, make sure you're using the updated scripts.

## Workflow

1. **Populate data:**
   ```bash
   npm run populate:data
   ```
   
2. **Copy the IDs** from the output

3. **Test sync:**
   ```bash
   npm run test:crm <callId> <actionableId>
   ```

4. **Check HubSpot** using the URLs printed by the script

