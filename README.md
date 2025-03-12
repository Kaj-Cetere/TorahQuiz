# Torah Quiz App

A Torah study tracking and quiz app, with a focus on Talmud learning. Built with Next.js, Supabase, and LangChain.

## Features

- Track Torah study progress (especially Talmud/Gemara)
- Store text content from Sefaria API
- Generate personalized quizzes based on learned content
- Use RAG (Retrieval-Augmented Generation) for quiz creation

## Tech Stack

- Next.js (React framework)
- TypeScript
- Tailwind CSS
- Supabase (Authentication, Database)
- Sefaria API (Torah text data)
- OpenAI/Anthropic API (Quiz generation)
- LangChain for RAG implementation
- OpenAI embeddings for semantic search

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn
- Supabase account
- OpenAI API key and/or Anthropic API key

### Installation

1. Clone this repository
2. Install dependencies

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase URL and Anonymous Key
   - Add your OpenAI or Anthropic API key

4. Set up the database schema:

```bash
npx supabase migration up
```

5. Pre-embed Talmud texts (admin task):

```bash
# First install ts-node if you don't have it
npm install -g ts-node

# Run the embedding script (this will take some time)
ts-node src/scripts/embed-talmud-texts.ts
```

6. Run the development server:

```bash
npm run dev
# or
yarn dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Database Setup

This application uses Supabase for authentication and database. You'll need to set up the following tables in your Supabase project:

1. `torah_texts` - For storing Torah texts from Sefaria
2. `user_progress` - For tracking user progress
3. `quiz_sessions` - For storing quiz sessions and results

See the SQL setup scripts in the `supabase` directory for table definitions and RLS policies.

## License

MIT
