"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/lib/constants";
import { createFeedback } from "@/lib/actions/interview.action";
import { toast } from "sonner";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface VoiceAgentProps {
  userName: string;
  userId: string;
  interviewId: string;
  applicationId: string;
  questions: string[];
  onComplete?: () => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onTranscriptChange?: (messages: SavedMessage[]) => void;
}

const VoiceAgent = ({
  userName,
  userId,
  interviewId,
  applicationId,
  questions,
  onComplete,
  onSpeakingChange,
  onListeningChange,
  onReady,
  onError,
  onTranscriptChange,
}: VoiceAgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  // Use refs to store callback props to avoid dependency changes
  const callbacksRef = useRef({
    onComplete,
    onSpeakingChange,
    onListeningChange,
    onReady,
    onError,
    onTranscriptChange,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onComplete,
      onSpeakingChange,
      onListeningChange,
      onReady,
      onError,
      onTranscriptChange,
    };
  }, [onComplete, onSpeakingChange, onListeningChange, onReady, onError, onTranscriptChange]);

  // Stable event handlers that use refs
  useEffect(() => {
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      toast.success("Voice interview started!");
      // Defer callback to avoid render-phase updates
      setTimeout(() => {
        if (callbacksRef.current.onReady) callbacksRef.current.onReady();
      }, 0);
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
      toast.info("Processing your interview...");
    };

    const onMessage = (message: any) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        
        // Use functional update for local state
        setMessages((prev) => {
          const updated = [...prev, newMessage];
          
          // Defer parent callback to avoid render-phase updates
          setTimeout(() => {
            if (callbacksRef.current.onTranscriptChange) {
              callbacksRef.current.onTranscriptChange(updated);
            }
          }, 0);
          
          return updated;
        });
          
        // Defer listening state callback
        if (message.role === "user") {
          setTimeout(() => {
            if (callbacksRef.current.onListeningChange) {
              callbacksRef.current.onListeningChange(true);
            }
          }, 0);
        }
      }
    };

    const onSpeechStart = () => {
      setIsSpeaking(true);
      
      // Defer callbacks to avoid render-phase updates
      setTimeout(() => {
        if (callbacksRef.current.onSpeakingChange) {
          callbacksRef.current.onSpeakingChange(true);
        }
        if (callbacksRef.current.onListeningChange) {
          callbacksRef.current.onListeningChange(false);
        }
      }, 0);
    };

    const onSpeechEnd = () => {
      setIsSpeaking(false);
      
      setTimeout(() => {
        if (callbacksRef.current.onSpeakingChange) {
          callbacksRef.current.onSpeakingChange(false);
        }
      }, 0);
    };

    const onVapiError = (error: Error) => {
      console.error("VAPI Error:", error);
      toast.error("Voice interview error. Please try text mode.");
      
      setTimeout(() => {
        if (callbacksRef.current.onError) callbacksRef.current.onError(error);
      }, 0);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onVapiError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onVapiError);
    };
  }, []); // Empty dependency array - run only once on mount

  // Update last message when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  // Handle feedback generation when call ends
  useEffect(() => {
    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      try {
        // Convert messages to transcript format
        const transcript = messages.map((msg) => ({
          role: msg.role === "user" ? "candidate" : "interviewer",
          content: msg.content,
        }));

        const { success, feedbackId } = await createFeedback({
          interviewId,
          applicationId,
          userId,
          transcript,
        });

        if (success && feedbackId) {
          toast.success("Interview completed successfully!");
          router.push(`/interview/${interviewId}/feedback`);
        } else {
          toast.error("Error generating feedback");
          setTimeout(() => {
            if (callbacksRef.current.onComplete) callbacksRef.current.onComplete();
          }, 0);
        }
      } catch (error) {
        console.error("Feedback error:", error);
        toast.error("Error processing interview");
        setTimeout(() => {
          if (callbacksRef.current.onComplete) callbacksRef.current.onComplete();
        }, 0);
      }
    };

    if (callStatus === CallStatus.FINISHED && messages.length > 0) {
      handleGenerateFeedback(messages);
    }
  }, [messages, callStatus, interviewId, applicationId, userId, router]);

  const handleCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);

      // Format questions for VAPI
      const formattedQuestions = questions
        .map((question, idx) => `${idx + 1}. ${question}`)
        .join("\n");

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    } catch (error) {
      console.error("Start call error:", error);
      toast.error("Failed to start voice interview. Please try text mode.");
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <div className="space-y-6">
      {/* Call View */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-8">
        {/* AI Interviewer Card */}
        <div className="relative">
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border-2 border-blue-200">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              {isSpeaking && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">AI Interviewer</h3>
            {callStatus === CallStatus.ACTIVE && (
              <div className="text-xs text-green-600 font-medium">● Active</div>
            )}
          </div>
        </div>

        {/* User Profile Card */}
        <div className="relative">
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-lg border-2 border-gray-200">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-3xl font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-semibold text-gray-900">{userName}</h3>
            <div className="text-xs text-gray-600">Candidate</div>
          </div>
        </div>
      </div>

      {/* Transcript Display */}
      {messages.length > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <div className="text-sm font-medium text-gray-600 mb-3">Live Transcript:</div>
          <p
            key={lastMessage}
            className={cn(
              "text-gray-800 transition-opacity duration-500 opacity-0 text-lg",
              "animate-fadeIn opacity-100"
            )}
          >
            {lastMessage}
          </p>
        </div>
      )}

      {/* Call Controls */}
      <div className="flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button
            className="relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCall}
            disabled={callStatus === CallStatus.CONNECTING || callStatus === CallStatus.FINISHED}
            data-testid="start-voice-call-button"
          >
            {callStatus === CallStatus.CONNECTING && (
              <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-75" />
            )}
            <span className="relative flex items-center gap-2">
              {callStatus === CallStatus.INACTIVE && (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  Start Voice Interview
                </>
              )}
              {callStatus === CallStatus.CONNECTING && "Connecting..."}
              {callStatus === CallStatus.FINISHED && "Processing..."}
            </span>
          </button>
        ) : (
          <button
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
            onClick={handleDisconnect}
            data-testid="end-voice-call-button"
          >
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              End Interview
            </span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">🎤 Voice Interview Instructions:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Click &quot;Start Voice Interview&quot; to begin</li>
          <li>The AI will ask you questions - answer naturally</li>
          <li>Speak clearly and take your time</li>
          <li>Click &quot;End Interview&quot; when all questions are answered</li>
          <li>Your responses will be automatically analyzed</li>
        </ul>
      </div>
    </div>
  );
};

export default VoiceAgent;