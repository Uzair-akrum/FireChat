This is a modified version of [`Vercel AI Chatbot`](https://github.com/vercel/ai-chatbot) with some key differences:

- Uses Google's Gemini 2.0 Flash model instead of OpenAI
- Integrates with Supabase for Reddit posts data
- Includes knowledge chunk search functionality with vector embeddings

<a href="https://chat.vercel.ai/">
  <img alt="Next.js 14 and App Router-ready AI chatbot." src="app/(chat)/opengraph-image.png">
  <h1 align="center">Next.js AI Chatbot with Gemini</h1>
</a>

<p align="center">
  A modified AI Chatbot built with Next.js, Google's Gemini, and Supabase integration.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#running-locally"><strong>Running locally</strong></a>
</p>
<br/>

## Features

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions
- [Google Generative AI](https://ai.google.dev/)
  - Gemini 2.0 Flash model for fast and accurate responses
  - Built-in tool calling capabilities for weather information
- [Supabase](https://supabase.com) Integration
  - Reddit posts data storage and retrieval
  - Vector embeddings for knowledge search
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com)

## Running locally

1. Clone the repository
2. Create a `.env.local` file with the following variables:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

3. Install dependencies and run the development server:

```bash
# Install dependencies
bun install

# Start the development server
bun dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

## Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase project API key
