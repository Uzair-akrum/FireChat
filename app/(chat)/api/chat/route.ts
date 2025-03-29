import { Content, GoogleGenerativeAI } from '@google/generative-ai';

import { models } from '@/lib/ai/models';
import { regularPrompt } from '@/lib/ai/prompts';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/ai/embedding';
import { searchKnowledgeChunks } from '@/lib/db';

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
  const { data, error } = await supabase
    .from('reddit_posts')
    .select('data');

  if (error) {
    console.error('Error fetching Reddit posts:', error);
    return null;
  }

  return data;
}

export async function POST(request: Request) {
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
  console.log("🚀 ~ POST ~ redditPosts:", redditPosts)

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

  // Format messages for Gemini
  const formattedMessages = messages.map(msg => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

  // Get the most recent user message
  const userMessage = messages.find(msg => msg.role === "user");

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  // Generate embedding for the user's query
  // const queryEmbedding = await generateEmbedding(userMessage.content);

  // // Search for relevant knowledge chunks
  // const relevantChunks = await searchKnowledgeChunks(queryEmbedding);

  // Create system prompt with retrieved knowledge as context
  let systemPrompt = regularPrompt;
  if (redditPosts && redditPosts.length > 0) {
    systemPrompt += "\n\nAdditional context from Reddit posts:\n" +
      JSON.stringify(redditPosts.map(post => post.data));



    const systemInstructionContent: Content = {
      role: "system",
      parts: [{ text: systemPrompt }]
    };

    // Start chat with history and tools
    const chat = geminiModel.startChat({
      history: formattedMessages,
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
          // Stream the response
          const result = await chat.sendMessageStream(userMessage.content);

          for await (const chunk of result.stream) {
            const text = chunk.text();
            controller.enqueue(
              encoder.encode(JSON.stringify({
                type: 'text',
                content: text
              }) + '\n')
            );
          }

          // Check for tool calls
          const response = await result.response;
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
