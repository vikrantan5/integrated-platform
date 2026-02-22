"use client"

import { useState, useCallback, useRef } from "react";

// Session states
export enum SessionState {
  IDLE = "IDLE",
  INITIALIZING = "INITIALIZING",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  STOPPING = "STOPPING",
  STOPPED = "STOPPED",
  ERROR = "ERROR",
}

// Component states
export enum ComponentState {
  DISCONNECTED = "DISCONNECTED",
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  ERROR = "ERROR",
}

export interface SessionStatus {
  sessionState: SessionState;
  videoState: ComponentState;
  voiceState: ComponentState;
  isSpeaking: boolean;
  isListening: boolean;
  error: string | null;
  transcript: any[];
}

export interface UseSessionManagerOptions {
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onError?: (error: Error) => void;
  onTranscriptUpdate?: (transcript: any[]) => void;
}

/**
 * Unified Session Manager Hook
 * Manages synchronized state between Beyond Presence (video) and Vapi (voice)
 */
export function useSessionManager(options: UseSessionManagerOptions = {}) {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.IDLE);
  const [videoState, setVideoState] = useState<ComponentState>(ComponentState.DISCONNECTED);
  const [voiceState, setVoiceState] = useState<ComponentState>(ComponentState.DISCONNECTED);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<any[]>([]);

  // Refs to track initialization
  const videoReadyRef = useRef(false);
  const voiceReadyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Initialize session
  const initializeSession = useCallback(() => {
    setSessionState(SessionState.INITIALIZING);
    setError(null);
    sessionIdRef.current = generateSessionId();
    console.log("Session initialized:", sessionIdRef.current);
  }, [generateSessionId]);

  // Video ready callback
  const onVideoReady = useCallback(() => {
    console.log("Video component ready");
    videoReadyRef.current = true;
    setVideoState(ComponentState.CONNECTED);

    // Check if both are ready to start session
    if (voiceReadyRef.current && sessionState === SessionState.INITIALIZING) {
      setSessionState(SessionState.ACTIVE);
      if (options.onSessionStart) options.onSessionStart();
    }
  }, [sessionState, options]);

  // Voice ready callback
  const onVoiceReady = useCallback(() => {
    console.log("Voice component ready");
    voiceReadyRef.current = true;
    setVoiceState(ComponentState.CONNECTED);

    // Check if both are ready to start session
    if (videoReadyRef.current && sessionState === SessionState.INITIALIZING) {
      setSessionState(SessionState.ACTIVE);
      if (options.onSessionStart) options.onSessionStart();
    }
  }, [sessionState, options]);

  // Video error callback
  const onVideoError = useCallback(
    (err: Error) => {
      console.error("Video component error:", err);
      setVideoState(ComponentState.ERROR);
      setError(`Video: ${err.message}`);
      if (options.onError) options.onError(err);
    },
    [options]
  );

  // Voice error callback
  const onVoiceError = useCallback(
    (err: Error) => {
      console.error("Voice component error:", err);
      setVoiceState(ComponentState.ERROR);
      setError(`Voice: ${err.message}`);
      if (options.onError) options.onError(err);
    },
    [options]
  );

  // Speaking state change (from voice)
  const onSpeakingChange = useCallback((speaking: boolean) => {
    console.log("Speaking state changed:", speaking);
    setIsSpeaking(speaking);
    if (speaking) {
      setIsListening(false); // When AI speaks, user is not listening
    }
  }, []);

  // Listening state change (from voice)
  const onListeningChange = useCallback((listening: boolean) => {
    console.log("Listening state changed:", listening);
    setIsListening(listening);
    if (listening) {
      setIsSpeaking(false); // When user speaks, AI is not speaking
    }
  }, []);

  // Transcript update (from voice)
  const onTranscriptChange = useCallback(
    (newTranscript: any[]) => {
      setTranscript(newTranscript);
      if (options.onTranscriptUpdate) {
        options.onTranscriptUpdate(newTranscript);
      }
    },
    [options]
  );

  // Start session
  const startSession = useCallback(() => {
    console.log("Starting session...");
    initializeSession();
    // Components will call onVideoReady and onVoiceReady when ready
  }, [initializeSession]);

  // Stop session
  const stopSession = useCallback(() => {
    console.log("Stopping session...");
    setSessionState(SessionState.STOPPING);

    // Reset states
    videoReadyRef.current = false;
    voiceReadyRef.current = false;
    sessionIdRef.current = null;

    setSessionState(SessionState.STOPPED);
    setVideoState(ComponentState.DISCONNECTED);
    setVoiceState(ComponentState.DISCONNECTED);
    setIsSpeaking(false);
    setIsListening(false);

    if (options.onSessionEnd) options.onSessionEnd();
  }, [options]);

  // Pause session (future enhancement)
  const pauseSession = useCallback(() => {
    console.log("Pausing session...");
    setSessionState(SessionState.PAUSED);
  }, []);

  // Resume session (future enhancement)
  const resumeSession = useCallback(() => {
    console.log("Resuming session...");
    setSessionState(SessionState.ACTIVE);
  }, []);

  // Get session status
  const getStatus = useCallback((): SessionStatus => {
    return {
      sessionState,
      videoState,
      voiceState,
      isSpeaking,
      isListening,
      error,
      transcript,
    };
  }, [sessionState, videoState, voiceState, isSpeaking, isListening, error, transcript]);

  // Check if session is active
  const isSessionActive = useCallback(() => {
    return sessionState === SessionState.ACTIVE;
  }, [sessionState]);

  // Check if both components are ready
  const areBothComponentsReady = useCallback(() => {
    return (
      videoState === ComponentState.CONNECTED &&
      voiceState === ComponentState.CONNECTED
    );
  }, [videoState, voiceState]);

  return {
    // State
    sessionState,
    videoState,
    voiceState,
    isSpeaking,
    isListening,
    error,
    transcript,
    sessionId: sessionIdRef.current,

    // Actions
    startSession,
    stopSession,
    pauseSession,
    resumeSession,

    // Callbacks for components
    onVideoReady,
    onVoiceReady,
    onVideoError,
    onVoiceError,
    onSpeakingChange,
    onListeningChange,
    onTranscriptChange,

    // Utilities
    getStatus,
    isSessionActive,
    areBothComponentsReady,
  };
}
