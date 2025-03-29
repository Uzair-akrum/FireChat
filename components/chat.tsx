'use client';

import { useState } from 'react';
import type { ChatRequestOptions, CreateMessage } from 'ai';
import { toast } from 'sonner';

import { ChatHeader } from '@/components/chat-header';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

// Define our own Message type that conforms to the expected interface
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
}

function useCustomChat({ id, selectedModelId }: { id: string; selectedModelId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    event?: { preventDefault?: () => void },
    chatRequestOptions?: ChatRequestOptions
  ) => {
    event?.preventDefault?.();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          messages: [...messages, userMessage],
          modelId: selectedModelId,
          ...chatRequestOptions
        }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        const resetDate = new Date(errorData.reset);
        const waitMinutes = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
        toast.error(`Whoops! You've sent too many messages. Please wait ${waitMinutes} minutes and try again.`);
        setIsLoading(false);
        return null;
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let assistantMessageId = Date.now().toString() + '-assistant';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'text') {
                assistantMessage += data.content;
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMessage, content: assistantMessage },
                    ];
                  } else {
                    return [...prev, {
                      id: assistantMessageId,
                      role: 'assistant',
                      content: assistantMessage
                    }];
                  }
                });
              } else if (data.type === 'error') {
                console.error('Server error:', data.content);
              }
            } catch (err) {
              console.error('Failed to parse chunk:', line);
            }
          }
        }
      }

      setIsLoading(false);
      return assistantMessageId;
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setIsLoading(false);
      return null;
    }
  };

  const append = async (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ): Promise<string | null | undefined> => {
    // Check if it's our Message type with id property
    if ('id' in message) {
      setMessages((prev) => [...prev, message as Message]);

      if (message.role === 'user') {
        // Process user message...
        setInput('');
        setIsLoading(true);

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              messages: [...messages, message],
              modelId: selectedModelId,
              ...chatRequestOptions
            }),
          });

          if (response.status === 429) {
            const errorData = await response.json();
            const resetDate = new Date(errorData.reset);
            const waitMinutes = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
            toast.error(`Whoops! You've sent too many messages. Please wait ${waitMinutes} minutes and try again.`);
            setIsLoading(false);
            return null;
          }

          if (!response.body) throw new Error('No response body');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';
          const assistantMessageId = Date.now().toString() + '-assistant';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);
                  if (data.type === 'text') {
                    assistantMessage += data.content;
                    setMessages((prev) => {
                      const lastMessage = prev[prev.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        return [
                          ...prev.slice(0, -1),
                          { ...lastMessage, content: assistantMessage },
                        ];
                      } else {
                        return [...prev, {
                          id: assistantMessageId,
                          role: 'assistant',
                          content: assistantMessage
                        }];
                      }
                    });
                  }
                } catch (err) {
                  console.error('Failed to parse chunk:', line);
                }
              }
            }
          }

          setIsLoading(false);
          return assistantMessageId;
        } catch (error) {
          console.error('Error in append:', error);
          setIsLoading(false);
          return null;
        }
      }

      return message.id;
    } else {
      // Handle CreateMessage type
      const newMessage: Message = {
        id: Date.now().toString(),
        role: message.role as Message['role'],
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
      };

      setMessages((prev) => [...prev, newMessage]);

      if (newMessage.role === 'user') {
        // Process user message...
        setInput('');
        setIsLoading(true);

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              messages: [...messages, newMessage],
              modelId: selectedModelId,
              ...chatRequestOptions
            }),
          });

          if (response.status === 429) {
            const errorData = await response.json();
            const resetDate = new Date(errorData.reset);
            const waitMinutes = Math.ceil((resetDate.getTime() - Date.now()) / 60000);
            toast.error(`Whoops! You've sent too many messages. Please wait ${waitMinutes} minutes and try again.`);
            setIsLoading(false);
            return null;
          }

          if (!response.body) throw new Error('No response body');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantMessage = '';
          const assistantMessageId = Date.now().toString() + '-assistant';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const data = JSON.parse(line);
                  if (data.type === 'text') {
                    assistantMessage += data.content;
                    setMessages((prev) => {
                      const lastMessage = prev[prev.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        return [
                          ...prev.slice(0, -1),
                          { ...lastMessage, content: assistantMessage },
                        ];
                      } else {
                        return [...prev, {
                          id: assistantMessageId,
                          role: 'assistant',
                          content: assistantMessage
                        }];
                      }
                    });
                  }
                } catch (err) {
                  console.error('Failed to parse chunk:', line);
                }
              }
            }
          }

          setIsLoading(false);
          return assistantMessageId;
        } catch (error) {
          console.error('Error in append:', error);
          setIsLoading(false);
          return null;
        }
      }

      return newMessage.id;
    }
  };

  const stop = () => {
    // Placeholder for stop functionality - ideally would abort the fetch
    setIsLoading(false);
  };

  const reload = async (
    chatRequestOptions?: ChatRequestOptions
  ): Promise<string | null | undefined> => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMessage) {
        const lastUserMessageIndex = messages.findIndex(m => m.id === lastUserMessage.id);
        if (lastUserMessageIndex !== -1) {
          const updatedMessages = messages.slice(0, lastUserMessageIndex + 1);
          setMessages(updatedMessages);

          // Trigger a response for the last user message
          setIsLoading(true);
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id,
                messages: updatedMessages,
                modelId: selectedModelId,
                ...chatRequestOptions
              }),
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = '';
            const assistantMessageId = Date.now().toString() + '-assistant';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data = JSON.parse(line);
                    if (data.type === 'text') {
                      assistantMessage += data.content;
                      setMessages((prev) => {
                        const lastMessage = prev[prev.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          return [
                            ...prev.slice(0, -1),
                            { ...lastMessage, content: assistantMessage },
                          ];
                        } else {
                          return [...prev, {
                            id: assistantMessageId,
                            role: 'assistant',
                            content: assistantMessage
                          }];
                        }
                      });
                    }
                  } catch (err) {
                    console.error('Failed to parse chunk:', line);
                  }
                }
              }
            }

            setIsLoading(false);
            return assistantMessageId;
          } catch (error) {
            console.error('Error in reload:', error);
            setIsLoading(false);
            return null;
          }
        }
      }
    }
    return null;
  };

  return {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  };
}

export function Chat({
  id,
  selectedModelId,
}: {
  id: string;
  selectedModelId: string;
}) {
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useCustomChat({
    id,
    selectedModelId,
  });

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <ChatHeader selectedModelId={selectedModelId} />

      <Messages
        chatId={id}
        isLoading={isLoading}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
      />

      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl" onSubmit={handleSubmit}>
        <MultimodalInput
          chatId={id}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          stop={stop}
          messages={messages}
          setMessages={setMessages}
          append={append}
        />
      </form>
    </div>
  );
}
