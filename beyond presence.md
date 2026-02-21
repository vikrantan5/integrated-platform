"# Beyond Presence Avatar Integration

## Overview
This document describes the integration of Beyond Presence AI avatar into the HireAI integrated-platform interview system.

## What Was Integrated

### 1. Beyond Presence Avatar Component
**File**: `/components/BeyondPresenceAvatar.tsx`

A React component that:
- Loads the Beyond Presence avatar using the Quick Embed approach
- Displays visual feedback for avatar states (speaking, listening, idle)
- Handles loading states and error cases gracefully
- Shows animated indicators when the avatar is speaking or listening

### 2. Environment Configuration
**File**: `/.env.local`

Added Beyond Presence credentials:
```env
NEXT_PUBLIC_BEY_AVATAR_ID=694c83e2-8895-4a98-bd16-56332ca3f449
NEXT_PUBLIC_BEY_API_KEY=sk-UDInLZKjvB4NiETyJz7dhdOANd5yyFNa6E9Nwy_62jM
```

### 3. VoiceAgent Updates
**File**: `/components/VoiceAgent.tsx`

Enhanced to:
- Expose speaking state through `onSpeakingChange` callback
- Expose listening state through `onListeningChange` callback
- Notify parent components when VAPI detects speech events

### 4. Mock Interview Session Updates
**File**: `/app/mock-interview/session/[id]/page.tsx`

Modified to:
- Replace the static star icon with the Beyond Presence avatar
- Connect avatar states to VAPI voice events
- Show real-time feedback (speaking/listening badges)
- Maintain dual-mode functionality (voice and text)

### 5. Beyond Presence Utilities
**File**: `/lib/beyondPresence.ts`

Helper functions for:
- Fetching available avatars
- Getting avatar details
- Creating avatar sessions (for future enhancements)
- Validating configuration
- Generating embed URLs

## Features Implemented

### ✅ Core Features
1. **Dynamic Avatar Display**: Beyond Presence avatar replaces static star icon
2. **Lip-Sync**: Avatar speaks interview questions with synchronized lip movements
3. **Visual States**: 
   - Speaking (green indicator with pulse animation)
   - Listening (blue indicator with pulse animation)
   - Idle (default state)
4. **VAPI Integration**: Voice interviews work with avatar visual feedback
5. **Text Mode Support**: Avatar remains visible in text mode (visual presence only)
6. **Error Handling**: Graceful fallback to static icon if avatar fails to load
7. **Loading States**: Smooth loading experience with spinner

### 📋 Technical Specifications
- **Integration Method**: Quick Embed (script injection)
- **Voice Provider**: VAPI (existing)
- **Avatar Provider**: Beyond Presence (visual only)
- **Framework**: Next.js 15 (App Router) with TypeScript
- **State Management**: React hooks
- **Styling**: Tailwind CSS

## How It Works

### Voice Interview Flow
1. User starts voice interview
2. VAPI connects and begins asking questions
3. When VAPI speaks (speech-start event):
   - `avatarSpeaking` state → `true`
   - Avatar shows \"Speaking\" badge with green animation
   - Beyond Presence avatar lip-syncs with the audio
4. When user responds:
   - `avatarListening` state → `true`
   - Avatar shows \"Listening\" badge with blue animation
5. VAPI transcribes user's response
6. Cycle continues until interview completion

### Text Interview Flow
1. User selects text mode
2. Avatar remains visible but in idle state
3. Questions appear as text in chat bubbles
4. User types responses
5. Avatar provides visual presence without voice interaction

## File Structure
```
/app/integrated-platform/
├── .env.local                           # Environment variables (with BEY credentials)
├── components/
│   ├── BeyondPresenceAvatar.tsx        # Avatar component (NEW)
│   └── VoiceAgent.tsx                  # Updated with state callbacks
├── app/
│   └── mock-interview/
│       └── session/
│           └── [id]/
│               └── page.tsx            # Updated session page with avatar
└── lib/
    └── beyondPresence.ts               # Utility functions (NEW)
```

## Testing the Integration

### Prerequisites
1. Ensure .env.local has the correct Beyond Presence credentials
2. Server is running: `yarn dev`
3. Firebase authentication is configured

### Test Steps
1. Navigate to: `http://localhost:3001`
2. Sign in with test account
3. Go to Mock Interview Setup: `http://localhost:3001/mock-interview/setup`
4. Select:
   - Role: Frontend Developer
   - Level: Mid-Level
   - Tech Stack: TypeScript, React, Next.js
5. Click \"Start Mock Interview\"
6. Choose \"Voice Interview (Recommended)\"
7. Observe:
   - Beyond Presence avatar loads in left panel
   - \"Start Voice Interview\" button appears
8. Click \"Start Voice Interview\"
9. Watch for:
   - Avatar starts speaking (green \"Speaking\" badge)
   - Lip-sync with interview questions
   - When you respond, avatar shows \"Listening\" (blue badge)

### Expected Behavior
✅ Avatar loads within 3-5 seconds
✅ Speaking animations sync with VAPI audio
✅ State transitions are smooth (speaking ↔ listening ↔ idle)
✅ Error states show fallback icon with error message
✅ Text mode shows avatar in idle state

### Troubleshooting
**Avatar doesn't load:**
- Check browser console for errors
- Verify Beyond Presence credentials in .env.local
- Check network tab for blocked requests
- Ensure script from `app.bey.dev` can load

**No lip-sync:**
- Verify VAPI is working (check VAPI credentials)
- Check that `onSpeakingChange` callback is firing
- Inspect avatar state in React DevTools

**State indicators not showing:**
- Check VoiceAgent component logs
- Verify VAPI events are firing (speech-start, speech-end)
- Check parent component state updates

## Future Enhancements

### Potential Improvements
1. **Advanced Facial Expressions**
   - Happy/neutral expressions based on interview progress
   - Thinking animations during processing
   - Encouraging gestures for positive responses

2. **Full LiveKit Integration**
   - Real-time streaming with more control
   - Custom avatar behaviors
   - Advanced audio-visual sync

3. **Avatar Customization**
   - Multiple avatar options
   - User-selectable avatars
   - Role-based avatar selection

4. **Analytics**
   - Track avatar engagement metrics
   - Measure impact on candidate experience
   - A/B testing different avatar styles

5. **Multi-language Support**
   - Lip-sync for multiple languages
   - Cultural avatar variations

## API Reference

### BeyondPresenceAvatar Component Props
```typescript
interface BeyondPresenceAvatarProps {
  avatarId?: string;              // Beyond Presence avatar ID
  isSpeaking?: boolean;            // Is avatar currently speaking
  isListening?: boolean;           // Is avatar currently listening
  className?: string;              // Custom CSS classes
  onReady?: () => void;           // Callback when avatar loads
  onError?: (error: Error) => void; // Callback on error
}
```

### VoiceAgent Updated Props
```typescript
interface VoiceAgentProps {
  // ... existing props
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
}
```

## Configuration

### Environment Variables
```env
# Required
NEXT_PUBLIC_BEY_AVATAR_ID=your-avatar-id
NEXT_PUBLIC_BEY_API_KEY=your-api-key

# Optional (for advanced features)
BEY_API_BASE=https://api.bey.dev/v1
```

### Avatar States CSS Classes
The component applies these classes for custom styling:
- `.avatar-speaking` - When avatar is speaking
- `.avatar-listening` - When avatar is listening
- `.avatar-idle` - Default idle state

## Resources

- [Beyond Presence Documentation](https://docs.bey.dev)
- [Beyond Presence Dashboard](https://app.bey.dev)
- [VAPI Documentation](https://docs.vapi.ai)
- [LiveKit Agents (Advanced)](https://docs.livekit.io/agents/models/avatar/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Beyond Presence documentation
3. Check browser console for errors
4. Verify all environment variables are set correctly

## Changelog

### v1.0.0 (Current)
- ✅ Initial integration with Quick Embed approach
- ✅ VAPI voice + Beyond Presence visual
- ✅ Speaking/listening state indicators
- ✅ Error handling and fallbacks
- ✅ Dual-mode support (voice/text)

---

**Status**: ✅ Integration Complete and Ready for Testing
**Last Updated**: February 21, 2025
"