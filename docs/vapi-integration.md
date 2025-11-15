# Vapi Integration - Practice Page

## Overview
The Practice page allows users to have voice conversations with an AI sales coach powered by Vapi.

## Features
- **Real-time Voice Calls**: Start/stop voice practice sessions with AI assistant
- **Live Transcription**: See real-time transcript of conversation
- **Call Controls**: Mute/unmute microphone during calls
- **Session Stats**: Track messages, duration, and talk ratio
- **Visual Feedback**: Audio levels, call status, and duration display

## Environment Variables
```env
NEXT_PUBLIC_VAPI_PUBLIC_API_KEY=your_public_api_key
NEXT_PUBLIC_VAPI_PUBLIC_ASSISTANT_ID=your_assistant_id
VAPI_PRIVATE_API_KEY=your_private_api_key (for server-side only)
```

## Components
- `/app/practice/page.tsx` - Main practice page route
- `/components/practice/practice-session.tsx` - Practice session component with Vapi integration

## Vapi SDK Features Used
- `vapi.start()` - Start voice call with assistant
- `vapi.stop()` - End active call
- `vapi.setMuted()` - Toggle microphone mute
- Event listeners:
  - `call-start` - Call connected
  - `call-end` - Call disconnected
  - `speech-start` - User started speaking
  - `speech-end` - User stopped speaking
  - `message` - Transcript updates and conversation events
  - `volume-level` - Audio input level
  - `error` - Error handling

## Usage
1. Navigate to `/practice` page
2. Click "Start Practice Session" to begin voice call
3. Speak naturally with the AI sales coach
4. View live transcript on the right panel
5. Click "End Session" when done

## Dashboard Theme Consistency
The practice page follows the same design patterns as the dashboard:
- Card-based layout
- Stats cards with icons
- Modern color scheme with dark mode support
- Responsive grid layout
- Consistent typography and spacing

## Tips for Users
- Speak clearly and naturally
- Handle objections professionally
- Practice active listening
- Ask discovery questions
- Close with confidence
