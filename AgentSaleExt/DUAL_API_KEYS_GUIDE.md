# Dual Gemini API Keys Setup Guide

## Overview

The extension now supports **two separate Gemini API keys** to optimize costs and manage rate limits:

1. **Suggestions API Key** - Used for generating real-time sales suggestions (main feature)
2. **Summary API Key** - Used for generating/updating conversation summaries (background process)

## Why Two API Keys?

### **Cost Management**
- Suggestions run frequently during calls → Higher usage → Use dedicated project/key
- Summaries run less frequently → Lower usage → Use separate key or share with suggestions
- Track costs separately per feature
- Set different billing alerts

### **Rate Limit Management**
- Gemini has per-key rate limits (RPM - requests per minute)
- Suggestions are time-critical → Need dedicated capacity
- Summaries can use fallback key without affecting suggestions
- Prevents one feature from blocking the other

### **Project Organization**
- Separate keys = separate Google Cloud projects
- Different quotas per project
- Better monitoring and analytics
- Easier to debug issues

## Setup Instructions

### Option 1: Two Separate Keys (Recommended)

**Best for production use or high-volume calls**

1. **Create Two API Keys**:
   - Go to [Google AI Studio](https://aistudio.google.com/apikey)
   - Create first key → Name it "Sales Assistant - Suggestions"
   - Create second key → Name it "Sales Assistant - Summaries"

2. **Configure in Extension**:
   ```javascript
   // Open browser console on Google Meet
   await chrome.storage.local.set({
     geminiSuggestionsApiKey: 'AIza...your-suggestions-key',
     geminiSummaryApiKey: 'AIza...your-summary-key'
   });
   ```

3. **Or Use UI** (shown on first load):
   - Enter "Suggestions API Key" (required)
   - Enter "Summary API Key" (optional)
   - Click "Save"

### Option 2: Single Key (Simpler)

**Good for testing or low-volume use**

1. **Create One API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/apikey)
   - Create one key

2. **Configure in Extension**:
   ```javascript
   await chrome.storage.local.set({
     geminiSuggestionsApiKey: 'AIza...your-key'
     // Leave geminiSummaryApiKey empty
   });
   ```

3. **Automatic Fallback**:
   - Extension will use suggestions key for summaries too
   - Works perfectly fine for most use cases

## How It Works

### Suggestions Flow
```
User speaks → Caption chunk complete
   ↓
Check: hasSuggestionsApiKey() ?
   ↓ YES
Use suggestionsApiKey
   ↓
Generate 3 real-time suggestions
   ↓
Display in UI (within 2-3 seconds)
```

### Summary Flow
```
After 3+ chunks OR summary update needed
   ↓
Check: hasSummaryApiKey() ?
   ↓ YES: Use summaryApiKey
   ↓ NO: Use suggestionsApiKey (fallback)
   ↓
Generate/update summary (background)
   ↓
Store for next request context
```

## Cost Comparison

### Gemini 2.0 Flash Pricing (as of 2024)
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

### Typical Usage (30-minute sales call)

**Suggestions** (Main Feature):
- ~15 requests during call
- ~800 tokens input per request (context + current statement)
- ~150 tokens output per request (3 suggestions)
- Cost: ~$0.01 per call

**Summaries** (Background):
- ~5-6 requests during call  
- ~300 tokens input per request (recent chunks)
- ~100 tokens output per request (summary)
- Cost: ~$0.001 per call

**Total with one key**: ~$0.011 per call
**Monthly (100 calls)**: ~$1.10

### Why Separate Keys Still Makes Sense

Even though costs are low:
- **Rate limits**: 60 RPM per key → Separate keys = 120 RPM total
- **Monitoring**: See which feature uses more
- **Billing alerts**: Set different thresholds
- **Reliability**: One key failure doesn't block everything

## Console Logs

### Successful Dual Key Setup:
```
[GeminiService] Suggestions API key loaded
[GeminiService] Summary API key loaded
```

### Single Key Setup (Fallback):
```
[GeminiService] Suggestions API key loaded
[GeminiService] No API key available for summary generation
[GeminiService] Using suggestions key for summary (fallback)
```

### Missing Keys:
```
[GeminiService] No API keys found. Please set them in extension settings.
```

## Checking Current Configuration

```javascript
// Check what keys are configured
chrome.storage.local.get(['geminiSuggestionsApiKey', 'geminiSummaryApiKey'], (result) => {
  console.log('Suggestions Key:', result.geminiSuggestionsApiKey ? '✓ Set' : '✗ Not set');
  console.log('Summary Key:', result.geminiSummaryApiKey ? '✓ Set' : '✗ Not set');
});
```

## UI Changes

### API Key Prompt (New)
- Two input fields instead of one
- Labels: "Suggestions API Key (Required)" and "Summary API Key (Optional)"
- Helper text explaining fallback behavior
- Same security (password type inputs)

### Storage Keys
```javascript
// Old (deprecated)
geminiApiKey: "AIza..."

// New
geminiSuggestionsApiKey: "AIza..."
geminiSummaryApiKey: "AIza..."
```

## Migration from Single Key

If you were using the old single key system:

### Automatic Migration (Option 1)
```javascript
// If you have the old key
chrome.storage.local.get(['geminiApiKey'], async (result) => {
  if (result.geminiApiKey) {
    // Copy to suggestions key
    await chrome.storage.local.set({
      geminiSuggestionsApiKey: result.geminiApiKey
      // Leave geminiSummaryApiKey empty (will use fallback)
    });
    
    // Optional: Remove old key
    await chrome.storage.local.remove(['geminiApiKey']);
    
    console.log('✅ Migrated to dual key system');
  }
});
```

### Manual Setup (Option 2)
1. Delete old key: `chrome.storage.local.remove(['geminiApiKey'])`
2. Set new keys using UI or console (see setup instructions above)

## Best Practices

### For Development/Testing
- Use single key (simpler)
- Set suggestions key only
- Let summary use fallback

### For Production
- Use two separate keys
- Set up billing alerts for each key
- Monitor usage in Google Cloud Console
- Rotate keys periodically

### For High-Volume (Enterprise)
- Two keys from different Google Cloud projects
- Different quotas and rate limits per project
- Set up quota increase requests proactively
- Monitor with Cloud Monitoring

## Troubleshooting

### Issue: No suggestions appearing

**Check**:
```javascript
chrome.storage.local.get(['geminiSuggestionsApiKey'], (result) => {
  console.log('Suggestions Key:', result.geminiSuggestionsApiKey);
});
```

**Fix**: Set suggestions API key (required for main feature)

### Issue: Summaries not generating

**Not a problem!** Extension works fine without summaries. They're optional.

**But if you want them**: Set summary API key or rely on fallback

### Issue: Rate limit errors

**Symptoms**: Console shows "429 Too Many Requests"

**Solution with dual keys**:
- Suggestions have dedicated rate limit (60 RPM)
- Summaries have separate rate limit (60 RPM)
- Total capacity: 120 RPM
- If still hitting limits, request quota increase in Google Cloud

### Issue: High API costs

**Monitor**: Check Google Cloud Console → API usage

**Optimize**:
- Summaries are already optimized (low temp, small output)
- Suggestions use efficient prompts
- Consider increasing MIN_REQUEST_INTERVAL (currently 5 seconds)

**With dual keys**: Track costs separately to see which feature costs more

## Example: Complete Setup

```javascript
// Step 1: Create two API keys at https://aistudio.google.com/apikey

// Step 2: Configure in extension
await chrome.storage.local.set({
  // Required - for real-time suggestions
  geminiSuggestionsApiKey: 'AIzaSyD...your-suggestions-key-here',
  
  // Optional - for conversation summaries
  geminiSummaryApiKey: 'AIzaSyB...your-summary-key-here'
});

// Step 3: Verify
chrome.storage.local.get(['geminiSuggestionsApiKey', 'geminiSummaryApiKey'], (result) => {
  console.log('Suggestions Key:', result.geminiSuggestionsApiKey?.substring(0, 10) + '...');
  console.log('Summary Key:', result.geminiSummaryApiKey?.substring(0, 10) + '...');
});

// Step 4: Reload extension
// Go to chrome://extensions → Click reload

// Step 5: Join Google Meet call
// Extension will use separate keys for each feature
```

## Summary

| Feature | Key Used | Frequency | Fallback |
|---------|----------|-----------|----------|
| **Suggestions** | suggestionsApiKey | High (every 5s) | None - Required |
| **Summaries** | summaryApiKey | Low (background) | Uses suggestionsApiKey |

**Recommended Setup**:
- **Testing**: 1 key (suggestions only)
- **Production**: 2 keys (separate projects)
- **Enterprise**: 2 keys with quota increases

**Benefits**:
- ✅ Better rate limit management
- ✅ Cost tracking per feature
- ✅ Reliability (one fails, other works)
- ✅ Flexible fallback behavior

**Setup Time**: 2 minutes for both keys
**Cost**: ~$1-2/month for typical usage
