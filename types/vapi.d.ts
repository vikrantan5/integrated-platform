// VAPI Type Definitions
declare module "@vapi-ai/web" {
  export interface Message {
    type: string;
    transcriptType?: string;
    role: string;
    transcript: string;
  }

  export default class Vapi {
    constructor(token: string);
    start(assistant: any, options?: any): Promise<void>;
    stop(): void;
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
  }
}

declare module "@vapi-ai/web/dist/api" {
  export interface CreateAssistantDTO {
    name: string;
    firstMessage: string;
    transcriber: {
      provider: string;
      model: string;
      language: string;
    };
    voice: {
      provider: string;
      voiceId: string;
      stability: number;
      similarityBoost: number;
      speed: number;
      style: number;
      useSpeakerBoost: boolean;
    };
    model: {
      provider: string;
      model: string;
      messages: Array<{
        role: string;
        content: string;
      }>;
    };
  }
}