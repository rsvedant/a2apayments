# 🚀 Simplified Extension Integration (Single User - Hackathon Mode)

## Overview

For the hackathon demo, we're using a **hardcoded single user approach**. This eliminates the need for user authentication and simplifies the extension implementation.

## Why Agentmail Fields?

Agentmail integration allows:
- **Automated follow-up emails** after calls
- **Email thread tracking** related to deals/tickets
- **Inbox management** for sales communications
- **Email automation** triggered by call events

Since we're hardcoding for one user, all these features will work for that demo account.

---

## 🔧 Backend Setup (Already Complete)

✅ HTTP endpoint created: `POST /api/calls/create`  
✅ Schema extended with Agentmail fields  
✅ Cron job processes unprocessed calls every minute  

---

## 📱 Extension Implementation (Simplified)

### Key Changes for Single User Mode:

1. **Hardcode userId** - No need for user ID prompt
2. **Remove authentication** - All calls attributed to same user
3. **Simplified UI** - Just capture and save

---

## 📁 Updated File Structure

### File 1: ConvexService.ts (Simplified)

**Path:** `extension/src/content/services/ConvexService.ts`

```typescript
/**
 * Simplified ConvexService for single-user hackathon demo
 * No authentication required - hardcoded user ID
 */

export interface CallData {
  title: string;
  transcription: string;
  participants: string; // JSON string
  duration?: number;
  recordingUrl?: string;
}

export interface ConvexResponse {
  success: boolean;
  callId?: string;
  message?: string;
  error?: string;
}

export class ConvexService {
  // HARDCODED USER ID FOR HACKATHON DEMO
  private readonly DEMO_USER_ID = 'demo_user_hackathon_2024';
  private readonly CONVEX_ENDPOINT = 'https://adamant-hedgehog-462.convex.site/api/calls/create';

  /**
   * Submit call data to Convex (no auth required)
   */
  public async submitCall(callData: CallData): Promise<ConvexResponse> {
    try {
      console.log('[ConvexService] Submitting call to Convex...');
      
      const payload = {
        userId: this.DEMO_USER_ID, // Hardcoded
        ...callData
      };

      const response = await fetch(this.CONVEX_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[ConvexService] Call submitted successfully:', data.callId);
        return data;
      } else {
        console.error('[ConvexService] Failed to submit call:', data);
        return {
          success: false,
          error: data.error || 'Failed to submit call'
        };
      }
    } catch (error) {
      console.error('[ConvexService] Error submitting call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

---

### File 2: FloatingCaptions.tsx (Simplified Updates)

**Path:** `extension/src/content/views/FloatingCaptions.tsx`

#### Changes from the previous implementation:

1. **Remove userId prompt** - No need to ask user for ID
2. **Remove userId state** - Not needed anymore
3. **Simplify initialization** - Just create ConvexService

#### Updated sections:

```typescript
// Remove these state variables (no longer needed):
// ❌ const [showUserIdPrompt, setShowUserIdPrompt] = useState(false);
// ❌ const [userIdInput, setUserIdInput] = useState('');

// Simplified initialization:
useEffect(() => {
  const controller = new GoogleMeetCaptionController();
  const geminiService = new GeminiService();
  const convexService = new ConvexService(); // No setup needed!
  
  controllerRef.current = controller;
  geminiServiceRef.current = geminiService;
  convexServiceRef.current = convexService;

  // Only check for API key (for suggestions)
  setTimeout(() => {
    if (!geminiService.hasApiKey()) {
      setShowApiKeyPrompt(true);
    }
  }, 3000);

  // Rest of the code remains the same...
}, []);

// Remove handleUserIdSubmit function (not needed)

// Updated handleEndMeetingAndSave (no userId checks):
const handleEndMeetingAndSave = async () => {
  if (!convexServiceRef.current || isSavingCall) return;

  setIsSavingCall(true);

  try {
    const duration = Math.floor((Date.now() - meetingStartTime) / 1000);
    const fullTranscription = fullTranscriptionRef.current.join('\n\n');
    
    if (!fullTranscription.trim()) {
      alert('No transcription to save!');
      setIsSavingCall(false);
      return;
    }

    const participantsJson = JSON.stringify(
      participants.map(name => ({ name }))
    );
    const title = getMeetingTitle();

    // Submit to Convex (userId is hardcoded in service)
    const result = await convexServiceRef.current.submitCall({
      title,
      transcription: fullTranscription,
      participants: participantsJson,
      duration,
    });

    if (result.success) {
      alert(`✅ Meeting saved!\n\nCall ID: ${result.callId}\n\nProcessing will complete within 1 minute.`);
      
      // Clear data
      fullTranscriptionRef.current = [];
      conversationHistoryRef.current = [];
      setCaptions([]);
      setSuggestions([]);
    } else {
      alert(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsSavingCall(false);
  }
};
```

#### Updated JSX (remove userId prompt):

```typescript
return (
  <>
    {/* Only API Key Prompt - No userId prompt needed */}
    {showApiKeyPrompt && (
      <div className="api-key-prompt">
        {/* ... existing API key prompt ... */}
      </div>
    )}

    {/* Floating Caption Window */}
    <div className="floating-captions">
      <div className="floating-captions-header">
        {/* ... */}
        <div className="floating-captions-controls">
          {/* Simplified Save Button - No userId check */}
          <button 
            className="caption-control-btn end-meeting-btn" 
            onClick={handleEndMeetingAndSave}
            disabled={isSavingCall}
            title="End meeting and save to Convex"
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              fontWeight: 'bold',
              marginRight: '8px'
            }}
          >
            {isSavingCall ? '⏳' : '💾'}
          </button>
          
          {/* ... rest of buttons ... */}
        </div>
      </div>
      {/* ... rest of UI ... */}
    </div>
  </>
);
```

---

## 🎯 What Changed vs Previous Version

| Feature | Previous (Multi-user) | New (Single-user) |
|---------|----------------------|-------------------|
| User ID | User prompted to enter | Hardcoded in service |
| Chrome Storage | Stores userId | Not needed |
| UI Prompts | 2 prompts (API key + userId) | 1 prompt (API key only) |
| Auth Flow | Manual setup required | None - instant use |
| Complexity | Higher | Lower |
| Demo Ready | Requires setup | Instant |

---

## 📊 Data Flow

```
User joins Google Meet
    ↓
Extension auto-starts capturing captions
    ↓
User clicks "💾 Save Meeting" button
    ↓
Extension POSTs to Convex with hardcoded userId
    ↓
Convex creates call record (processed: false)
    ↓
Cron job runs (every 1 min)
    ↓
Call is processed & synced to HubSpot
    ↓
✅ Done!
```

---

## 🧪 Testing Instructions

1. **Build extension:**
   ```bash
   cd extension
   npm run build
   ```

2. **Load in Chrome:**
   - `chrome://extensions`
   - Enable Developer mode
   - Load unpacked → select `extension/dist`

3. **Join Google Meet call**

4. **Wait for captions to accumulate**

5. **Click 💾 button** - That's it! No setup needed.

6. **Verify in Convex dashboard** - Look for calls with userId: `demo_user_hackathon_2024`

---

## 🔑 Important Notes

- **All demo calls** will be attributed to `demo_user_hackathon_2024`
- **No security** - This is for demo only, not production
- **One configuration** - Set up HubSpot/Agentmail once for the demo user
- **Easy to demo** - No user onboarding required

---

## 🚀 Post-Hackathon: Moving to Multi-User

When you're ready for production:

1. Replace hardcoded userId with actual authentication
2. Add user management system
3. Implement proper auth tokens
4. Add per-user settings storage
5. Enable user-specific API key management

But for the hackathon, this simplified version will work perfectly! 🎉

