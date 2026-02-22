"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface BeyondPresenceAvatarProps {
  avatarId?: string;
  agentId?: string;
  isSpeaking?: boolean;
  isListening?: boolean;
  className?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
  useFallback?: boolean;
}

export default function BeyondPresenceAvatar({
  avatarId = process.env.NEXT_PUBLIC_BEY_AVATAR_ID || "",
  agentId = process.env.NEXT_PUBLIC_BEY_AGENT_ID || "", // Add default from env
  isSpeaking = false,
  isListening = false,
  className = "",
  onReady,
  onError,
  useFallback = true,
}: BeyondPresenceAvatarProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Debug log to see what values we have
  useEffect(() => {
    console.log("BeyondPresenceAvatar props:", { 
      avatarId, 
      agentId, 
      envAgentId: process.env.NEXT_PUBLIC_BEY_AGENT_ID 
    });
  }, [avatarId, agentId]);

  useEffect(() => {
    // If we have an agentId, use iframe embedding (THIS IS YOUR CASE)
    if (agentId) {
      console.log(`Loading agent with ID: ${agentId}`);
      setIsLoading(true);
      setShowFallback(false);
      setError(null);
      // Don't call onReady here - wait for iframe to load
      return;
    }

    // If no agentId but we have avatarId, show helpful message
    if (!agentId && avatarId) {
      const err = new Error(
        "Beyond Presence requires an Agent ID. Please create an agent in your Beyond Presence dashboard that uses this avatar."
      );
      console.warn(err.message);
      setError(err.message);
      setIsLoading(false);
      
      // Show fallback after a delay
      if (useFallback) {
        setTimeout(() => {
          setShowFallback(true);
          if (onReady) onReady();
        }, 2000);
      } else if (onError) {
        onError(err);
      }
      return;
    }

    // No avatar or agent ID provided
    if (!avatarId && !agentId) {
      const err = new Error("Beyond Presence Avatar ID or Agent ID is required");
      setError(err.message);
      setIsLoading(false);
      setShowFallback(useFallback);
      if (onError && !useFallback) onError(err);
    }
  }, [avatarId, agentId, onReady, onError, useFallback]);

  // Determine avatar state class for visual feedback
  const getAvatarStateClass = () => {
    if (isSpeaking) return "avatar-speaking";
    if (isListening) return "avatar-listening";
    return "avatar-idle";
  };

  // Render fallback animated avatar
  const renderFallbackAvatar = () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-full">
      <div className="relative">
        <div className={`h-48 w-48 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl ${isSpeaking ? 'animate-pulse' : ''}`}>
          <div className="h-40 w-40 rounded-full bg-gray-900 flex items-center justify-center">
            <Sparkles className={`h-20 w-20 text-blue-400 ${isSpeaking ? 'animate-spin' : ''}`} />
          </div>
        </div>
        {isSpeaking && (
          <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-50 animate-ping"></div>
        )}
        {isListening && !isSpeaking && (
          <div className="absolute inset-0 rounded-full border-4 border-blue-400 opacity-30 animate-pulse"></div>
        )}
      </div>
    </div>
  );

  // If showing fallback
  if (showFallback) {
    return (
      <div className={`relative ${className}`}>
        {renderFallbackAvatar()}
        
        {/* Visual State Indicators */}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          {isSpeaking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full shadow-lg animate-pulse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-semibold">Speaking</span>
            </div>
          )}
          {isListening && !isSpeaking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-semibold">Listening</span>
            </div>
          )}
        </div>

        {error && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 text-white text-xs px-2 py-1 rounded">
            Using fallback avatar
          </div>
        )}
      </div>
    );
  }

  if (error && !showFallback) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="text-red-600 font-semibold mb-2">Avatar Configuration Issue</div>
          <div className="text-sm text-red-500 mb-4">{error}</div>
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
            <strong>To fix this:</strong>
            <ol className="list-decimal list-inside mt-2 text-left space-y-1">
              <li>Go to <a href="https://app.bey.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Beyond Presence Dashboard</a></li>
              <li>Create a new Agent</li>
              <li>Select your avatar: &quot;Nelly - Office&quot;</li>
              <li>Copy the Agent ID</li>
              <li>Pass it as agentId prop to this component</li>
            </ol>
          </div>
          <div className="mt-4">
            {renderFallbackAvatar()}
          </div>
        </div>
      </div>
    );
  }

  // If agent ID is provided, use iframe embed (THIS IS YOUR CASE)
  if (agentId) {
    return (
      <div className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/50 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-300">Loading Avatar...</p>
            </div>
          </div>
        )}

        <div
          className={`avatar-container ${getAvatarStateClass()} transition-all duration-300 rounded-lg overflow-hidden`}
          data-testid="beyond-presence-avatar"
        >
          <iframe
            ref={iframeRef}
            src={`https://bey.chat/${agentId}`}
            className="w-full h-full min-h-[500px] border-0"
            allow="camera; microphone; fullscreen"
            allowFullScreen
            onLoad={() => {
              console.log("Iframe loaded successfully");
              setIsLoading(false);
              if (onReady) onReady();
            }}
            onError={(e) => {
              console.error("Iframe error:", e);
              const err = new Error("Failed to load Beyond Presence iframe");
              setError(err.message);
              setShowFallback(true);
              if (onError) onError(err);
            }}
          />
        </div>

        {/* Visual State Indicators */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          {isSpeaking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full shadow-lg animate-pulse">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-semibold">Speaking</span>
            </div>
          )}
          {isListening && !isSpeaking && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <span className="text-sm font-semibold">Listening</span>
            </div>
          )}
        </div>

        {/* Animated Rings */}
        {isSpeaking && (
          <div className="absolute inset-0 rounded-lg border-4 border-green-400 opacity-50 animate-ping pointer-events-none"></div>
        )}
        {isListening && !isSpeaking && (
          <div className="absolute inset-0 rounded-lg border-4 border-blue-400 opacity-30 animate-pulse pointer-events-none"></div>
        )}
      </div>
    );
  }

  // Default case - no agentId
  return (
    <div className={`relative ${className}`}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-900/50 rounded-full">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-300">Initializing Avatar...</p>
          </div>
        </div>
      )}

      {/* Fallback Avatar */}
      {renderFallbackAvatar()}

      {/* Visual State Indicators */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
        {isSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full shadow-lg animate-pulse">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="text-sm font-semibold">Speaking</span>
          </div>
        )}
        {isListening && !isSpeaking && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <span className="text-sm font-semibold">Listening</span>
          </div>
        )}
      </div>
    </div>
  );
}