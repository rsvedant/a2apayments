# Google Meet Caption Customizer

This extension customizes Google Meet's caption window with a floating, simplified design.

## Features

- **Auto-enable Captions**: Automatically clicks the "Turn on captions" button when you join a Google Meet
- **Floating Window**: Draggable caption window that you can position anywhere on the screen
- **Simplified Design**: Clean, modern UI with a dark theme
- **Real-time Updates**: Captions update in real-time as people speak
- **AI-Powered Sales Assistant**: Strategic guidance powered by Google Gemini 2.5 Flash
  - **Smart Detection**: Triggers only on speaker changes + duration thresholds (70-80% fewer API calls)
  - **Context-Aware**: Uses your profile, meeting agenda, and company documentation
  - **Sales-Focused**: Objection handling, value reinforcement, closing techniques
  - **RAG Integration**: Automatically retrieves relevant company docs during conversation
  - **3 Strategic Suggestions**: Click to copy and use in your response
  - **Conversation History**: Builds on last 10 caption chunks for context
- **Controls**:
  - 🗑️ Clear all captions
  - ⬇️ Minimize/Maximize window
  - Drag by the header to reposition

## How It Works

1. **CSS Injection**: The extension immediately injects CSS rules to hide the original caption UI and caption toggle button
2. **Auto-detection**: Detects when you're on `meet.google.com`
3. **Auto-enable**: Automatically looks for the caption button (aria-label="Turn on captions") and clicks it when the meeting starts
4. **Hidden Original UI**: The original Google Meet caption display is moved off-screen (but kept in DOM for text extraction)
5. **Button Removal**: The caption toggle button is completely hidden from the UI
6. **Floating Window**: A custom floating caption window appears in the bottom-left corner
7. **Real-time Extraction**: Captions are extracted in real-time from Google Meet's hidden caption container

## Development

### Build the extension

```bash
npm install
npm run dev
```

For production build:
```bash
npm run build
```

### Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### Test

1. Go to [meet.google.com](https://meet.google.com)
2. Join or create a meeting
3. The extension will automatically enable captions
4. You should see a floating caption window in the bottom-left corner
5. If you haven't configured a Gemini API key, you'll see a prompt after 3 seconds
6. Once configured, AI suggestions will appear below captions when someone finishes speaking

## AI Suggestions Setup

### Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key" or "Get API Key"
4. Copy the generated key

### Configure in Extension

When you first join a Google Meet with the extension:
1. Wait 3 seconds for the API key prompt to appear
2. Paste your Gemini API key
3. Click "Save"

The key is stored securely in Chrome's local storage and never leaves your browser.

### Configure Sales Assistant (Optional but Recommended)

For best results, configure your sales context. Open browser console on Google Meet and run:

```javascript
// Set your profile
await chrome.storage.local.set({ 
  userProfile: {
    name: "Your Name",
    email: "you@company.com",
    role: "Sales Executive",
    company: "Your Company"
  }
});

// Set meeting context
await chrome.storage.local.set({
  meetingContext: {
    agenda: "Product demo and Q&A",
    callType: "demo" // sales | demo | discovery | followup
  }
});

// Add company documentation
await chrome.storage.local.set({
  companyDocs: {
    productInfo: "Brief description of your product...",
    pricing: "Pricing tiers and packages...",
    technicalSpecs: "Key technical capabilities...",
    salesPlaybook: "Common objections and responses..."
  }
});
```

See `SALES_ASSISTANT_GUIDE.md` for detailed configuration options.

### How AI Suggestions Work

1. **Smart Speech Detection**: The extension triggers AI suggestions only when:
   - **Speaker Changes**: New person starts talking (requires 4+ seconds from previous speaker)
   - **Extended Speaking**: Same speaker talks continuously for 8+ seconds
   - **Sentence Completion**: Natural sentence ending (`.`, `!`, `?`) after 4+ seconds
   - **Silence**: 5 seconds of quiet after 4+ seconds of speaking
   
2. **Context Loading**: Gathers comprehensive context:
   - Your profile (name, email, role, company)
   - Meeting details (title, agenda, call type)
   - Company documentation (product info, pricing, technical specs)
   - Conversation history (last 10 caption chunks)

3. **RAG Retrieval**: Automatically searches company docs for relevant information based on what was just said

4. **Sales Analysis**: AI analyzes:
   - Hidden objections or concerns
   - Current sales stage
   - Best response strategy
   - Value propositions to emphasize

5. **Strategic Suggestions**: Generates 3 sales-focused responses that:
   - Address the prospect's statement directly
   - Move conversation toward closing
   - Apply proven sales techniques
   - Reference your specific product/pricing when relevant

6. **Display & Use**: Shows suggestions below captions, click to copy

7. **Rate Limiting**: Maximum 1 request every 5 seconds (70-80% fewer API calls than before)

## Technical Details

### Files Created

- **`src/content/views/GoogleMeetCaptionController.ts`**: Core logic for finding and enabling captions, monitoring caption updates, smart speech detection with speaker tracking
- **`src/content/services/GeminiService.ts`**: Service for interacting with Google Gemini API to generate sales-focused AI suggestions
- **`src/content/services/ContextService.ts`**: Manages user profile, meeting context, and company documentation with RAG integration
- **`src/content/views/FloatingCaptions.tsx`**: React component for the floating caption UI with AI suggestions display
- **`src/content/views/FloatingCaptions.css`**: Styles for the floating window, AI suggestions, and API key prompt
- **`src/content/views/App.tsx`**: Updated to use FloatingCaptions on Google Meet pages
- **`manifest.config.ts`**: Updated to target Google Meet specifically and add storage permission

### Configuration Files

- **`SALES_ASSISTANT_GUIDE.md`**: Comprehensive guide for configuring sales assistant features
- **`AI_FEATURES.md`**: Technical documentation of AI architecture and capabilities

### DOM Structure

The extension looks for:
- Caption button: `button[aria-label="Turn on captions"]`
- Caption container: `[aria-label="Captions"]`
- Caption text elements: `.ygicle.VbkSUe`

## Customization

### Styling

Edit `src/content/views/FloatingCaptions.css` to customize:
- Window size, colors, transparency
- Caption text size and styling
- Animation effects

### Positioning

The default position is bottom-left (20px from left, 250px from bottom). You can change this in `FloatingCaptions.tsx`:

```tsx
const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 250 });
```

### Auto-enable Behavior

To disable auto-enabling captions, comment out this line in `GoogleMeetCaptionController.ts`:

```ts
setTimeout(() => this.enableCaptions(), 2000);
```

## Troubleshooting

**Captions not appearing in floating window?**
- Make sure you're on a live Google Meet with active speakers
- Check the browser console for any errors (look for `[GoogleMeetCaptionController]` logs)
- The extension retries up to 10 times to find the caption button
- Try refreshing the page and rejoining the meeting

**Original captions still visible?**
- The extension uses aggressive CSS injection to hide the original UI
- If captions are still visible, try these steps:
  1. Open browser DevTools (F12)
  2. Look for a `<style id="gmeet-caption-hider">` tag in the `<head>`
  3. Check if the caption container has `aria-label="Captions"`
  4. If the structure is different, Google Meet may have changed their HTML
- The caption container is moved off-screen (`left: -9999px`) rather than completely hidden, so we can still extract text from it

**Caption button still showing?**
- The CSS targets buttons with `aria-label="Turn on captions"` and `aria-label="Turn off captions"`
- If the button is still visible, Google Meet may have changed the button's attributes
- Check the button's HTML structure and update the CSS selectors in `GoogleMeetCaptionController.ts`

**Extension not loading?**
- Check that you've loaded the `dist` folder (not the `src` folder)
- Make sure the extension has permission for `meet.google.com`
- Check for any TypeScript compilation errors
- Verify the extension is enabled in `chrome://extensions/`

**Floating window not draggable?**
- Make sure you're dragging from the header area (where it says "Captions")
- The drag cursor should appear when hovering over the header

**AI suggestions not appearing?**
- Check that you've configured your Gemini API key (look for the prompt or re-open the extension)
- Verify your API key is valid by checking the browser console for errors
- Make sure someone is actively speaking and captions are being generated
- The extension waits for sentence endings or 2-second pauses before generating suggestions
- Rate limiting: only 1 request every 3 seconds is allowed

**API errors?**
- Check your Gemini API key is correct
- Verify you have API quota remaining in [Google AI Studio](https://aistudio.google.com)
- Check browser console for detailed error messages (look for `[GeminiService]` logs)
- Ensure you're using Gemini 2.0 Flash or compatible model

## Browser Compatibility

- ✅ Chrome/Edge (Chromium-based browsers)
- ❌ Firefox (requires manifest v2 conversion)
- ❌ Safari (requires Safari extension conversion)
