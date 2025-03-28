import { GoogleGenerativeAI } from '@google/generative-ai';
// Import types from ai SDK if available
// If you don't have @types/ai, you'll need to define these types manually

import { customMiddleware } from './custom-middleware';

// Define the Message type since we can't import it from 'ai'
interface Message {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  id?: string;
  name?: string;
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Type definitions for compatibility
interface StreamRequest {
  messages: Message[];
  system?: string;
}

// For compatibility with existing code, wrap the Gemini model in the same interface
export const customModel = (apiIdentifier: string) => {
  // If using an OpenAI model, use the original wrapper
  if (apiIdentifier.startsWith('gpt-')) {
    // Import dynamically to avoid issues if OpenAI API is not available
    const { openai } = require('@ai-sdk/openai');
    const { experimental_wrapLanguageModel: wrapLanguageModel } = require('ai');
    return wrapLanguageModel({
      model: openai(apiIdentifier),
      middleware: customMiddleware,
    });
  }

  // Otherwise use Gemini
  return {
    stream: async ({ messages, system }: StreamRequest) => {
      const geminiModel = genAI.getGenerativeModel({ model: apiIdentifier });

      // Format messages for Gemini
      const formattedMessages = messages.map((msg: Message) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }));

      // Create chat session
      const chat = geminiModel.startChat({
        history: formattedMessages,
        systemInstruction: system
      });

      // Get the last user message
      const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();

      if (!lastUserMessage) {
        throw new Error('No user message found');
      }

      // Stream the response
      return chat.sendMessageStream(lastUserMessage.content);
    }
  };
};

// For image generation, still use DALL-E for now
// This could be replaced with Gemini's image generation in the future
export const imageGenerationModel = (() => {
  const { openai } = require('@ai-sdk/openai');
  return openai.image('dall-e-3');
})();
