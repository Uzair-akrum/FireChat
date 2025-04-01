import { Content, GoogleGenerativeAI } from '@google/generative-ai';

import { models } from '@/lib/ai/models';
import { regularPrompt } from '@/lib/ai/prompts';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/ai/embedding';
import { searchKnowledgeChunks } from '@/lib/db';
import { ratelimit } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import { kv } from "@vercel/kv";

export const maxDuration = 60;

interface Message {
  role: string;
  content: string;
}

// Define Gemini tool types
interface ToolParam {
  type: string;
  description?: string;
  properties?: Record<string, ToolParam>;
  required?: string[];
}

interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: ToolParam;
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''!
);

// Function to fetch Reddit posts data
async function fetchRedditPosts() {
  try {
    // Get all Reddit posts from Vercel KV
    const redditPosts = await kv.get<any[]>('all-reddit-posts');
    console.log("🚀 ~ fetchRedditPosts ~ redditPosts:", redditPosts)

    if (!redditPosts || !Array.isArray(redditPosts)) {
      console.log('No Reddit posts found in Vercel KV or invalid format');
      return null;
    }

    // Convert to the format expected by the application
    // The existing code expects an array of objects with a data property
    return redditPosts.map((post: any) => ({
      data: post.data || post
    }));
  } catch (error) {
    console.error('Error fetching Reddit posts from Vercel KV:', error);
    return null;
  }
}

export async function POST(request: Request) {
  // Get IP for rate limiting
  const headersList = headers();
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0] || 'anonymous';

  // Check rate limit
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(JSON.stringify({
      error: 'Too many requests',
      limit,
      remaining,
      reset,
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      }
    });
  }

  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response('Model not found', { status: 404 });
  }

  // Fetch Reddit posts data from Supabase
  const redditPosts = await fetchRedditPosts();

  // Initialize Google Generative AI
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Define the weather tool
  const functionDeclarations = [
    {
      name: "getWeather",
      description: "Get the current weather",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "The location to get the weather for"
          }
        },
        required: ["location"]
      }
    }
  ];

  // Separate history from the very last message
  const historyMessages = messages.slice(0, -1);
  const lastUserMessage = messages[messages.length - 1];

  if (!lastUserMessage || lastUserMessage.role !== "user") {
    return new Response('Last message is not from user or messages array is empty', { status: 400 });
  }

  // Format only the preceding history
  const formattedHistory = historyMessages.map(msg => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

  // Create system prompt with retrieved knowledge as context
  let systemPrompt = regularPrompt;
  if (redditPosts && redditPosts.length > 0) {
    systemPrompt += "\n\nAdditional context from Reddit posts:\n" +
      JSON.stringify(redditPosts.map(post => post.data));
  }

  const systemInstructionContent: Content = {
    role: "system",
    parts: [{ text: systemPrompt }]
  };

  // Count tokens for the input
  const inputContent = {
    contents: [
      systemInstructionContent,
      ...formattedHistory,
      { role: "user", parts: [{ text: lastUserMessage.content }] }
    ]
  };
  const tokenCount = await geminiModel.countTokens(inputContent);
  console.log("Input token count:", tokenCount.totalTokens);

  // Start chat with history and tools
  const chat = geminiModel.startChat({
    history: formattedHistory,
    systemInstruction: systemInstructionContent,
    // @ts-ignore - Type mismatch between our FunctionDeclaration and Gemini's Tool type
  });

  const userMessageId = generateUUID();

  // Create a readable stream response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // Write user message ID first
      controller.enqueue(
        encoder.encode(JSON.stringify({
          type: 'user-message-id',
          content: userMessageId
        }) + '\n')
      );

      try {
        // Send the last user message content as the current prompt
        const result = await chat.sendMessageStream(lastUserMessage.content);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          controller.enqueue(
            encoder.encode(JSON.stringify({
              type: 'text',
              content: text
            }) + '\n')
          );
        }

        // Check for tool calls and log token usage
        const response = await result.response;
        console.log("Response usage metadata:", response.usageMetadata);

        const candidate = response.candidates?.[0];

        if (candidate?.content?.parts?.some(part => 'functionCall' in part)) {
          const functionCallPart = candidate.content.parts.find(part => 'functionCall' in part);
          if (functionCallPart?.functionCall?.name === 'getWeather') {
            const args = functionCallPart.functionCall.args as { location: string };
            const location = args.location;

            try {
              // Convert location to lat/long (simplified for example)
              // In a real app, you'd use a geocoding service
              const latitude = 40.7128; // New York latitude as example
              const longitude = -74.0060; // New York longitude as example

              // Mock weather data since we can't properly call the tool
              const weatherData = {
                current: {
                  temperature_2m: 22.5
                },
                hourly: {
                  temperature_2m: [21.5, 22.0, 22.5, 23.0]
                },
                daily: {
                  sunrise: ["2023-03-22T06:45"],
                  sunset: ["2023-03-22T19:15"]
                }
              };

              // Send function response back to the model
              const functionResponse = await chat.sendMessage([
                {
                  functionResponse: {
                    name: 'getWeather',
                    response: { data: weatherData }
                  }
                }
              ]);

              // Stream the model's response after the function call
              const responseText = functionResponse.response.text();
              controller.enqueue(
                encoder.encode(JSON.stringify({
                  type: 'text',
                  content: responseText
                }) + '\n')
              );
            } catch (error) {
              console.error("Error calling weather function:", error);
              controller.enqueue(
                encoder.encode(JSON.stringify({
                  type: 'error',
                  content: 'Failed to get weather information'
                }) + '\n')
              );
            }
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(JSON.stringify({
            type: 'error',
            content: errorMessage
          }) + '\n')
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    }
  });
}
