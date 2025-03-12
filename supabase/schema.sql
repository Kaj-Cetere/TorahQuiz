-- Enable the pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Helper table for admins (create this first, since we reference it later)
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create an index for admin lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);

-- Create a table for Torah texts
CREATE TABLE IF NOT EXISTS torah_texts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ref TEXT NOT NULL,
  book TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  section TEXT,
  embedding vector(1536), -- For OpenAI embeddings (adjust dimensionality if using a different model)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the ref for faster lookups
CREATE INDEX IF NOT EXISTS idx_torah_texts_ref ON torah_texts(ref);

-- Create an index on the book for faster lookups
CREATE INDEX IF NOT EXISTS idx_torah_texts_book ON torah_texts(book);

-- Create a vector index on embeddings for similarity search
CREATE INDEX IF NOT EXISTS idx_torah_texts_embedding ON torah_texts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a table for tracking user progress
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_completed BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, ref)
);

-- Create indexes on user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_ref ON user_progress(ref);

-- Create a table for quiz sessions
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  score SMALLINT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions JSONB NOT NULL, -- Store the questions as JSON
  user_answers JSONB, -- Store the user's answers as JSON
  completed BOOLEAN DEFAULT FALSE
);

-- Create an index on quiz_sessions
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);

-- Set up Row Level Security (RLS)
-- Enable RLS on tables
ALTER TABLE torah_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Torah texts are publicly readable
CREATE POLICY "Torah texts are readable by all users" ON torah_texts
  FOR SELECT USING (true);

-- Insert/update on torah_texts requires admin
CREATE POLICY "Torah texts can only be modified by admin" ON torah_texts
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- User progress policies - users can only see and modify their own progress
CREATE POLICY "Users can view their own progress" ON user_progress
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own progress" ON user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own progress" ON user_progress
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own progress" ON user_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Quiz sessions policies - users can only see and modify their own quizzes
CREATE POLICY "Users can view their own quiz sessions" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own quiz sessions" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own quiz sessions" ON quiz_sessions
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own quiz sessions" ON quiz_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to copy torah_texts by reference
CREATE OR REPLACE FUNCTION copy_user_text_by_ref(p_user_id UUID, p_ref TEXT)
RETURNS void AS $$
DECLARE
    user_torah_text_id UUID;
BEGIN
    -- Check if the user has the text already
    SELECT id INTO user_torah_text_id
    FROM user_torah_texts
    WHERE user_id = p_user_id AND ref = p_ref
    LIMIT 1;
    
    -- If user doesn't have this text yet, copy it from the main table
    IF user_torah_text_id IS NULL THEN
        INSERT INTO user_torah_texts (
            user_id,
            ref,
            book,
            content,
            language,
            section,
            embedding
        )
        SELECT 
            p_user_id,
            ref,
            book,
            content,
            language,
            section,
            embedding
        FROM torah_texts
        WHERE ref = p_ref;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user_torah_texts table for user-specific texts
CREATE TABLE IF NOT EXISTS user_torah_texts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref TEXT NOT NULL,
  book TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL,
  section TEXT,
  embedding vector(1536), -- For OpenAI embeddings (adjust dimensionality if using a different model)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ref)
);

-- Create an index on the ref for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_torah_texts_ref ON user_torah_texts(ref);

-- Create an index on the book for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_torah_texts_book ON user_torah_texts(book);

-- Create a vector index on embeddings for similarity search
CREATE INDEX IF NOT EXISTS idx_user_torah_texts_embedding ON user_torah_texts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Apply RLS to user_torah_texts
ALTER TABLE user_torah_texts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own texts
CREATE POLICY "Users can view their own texts" ON user_torah_texts
  FOR SELECT USING (auth.uid() = user_id);

-- The insert policy is managed through the function, but add it for completeness
CREATE POLICY "Users can insert their own texts" ON user_torah_texts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to mark a daf as learned
CREATE OR REPLACE FUNCTION mark_daf_learned(
  p_user_id UUID,
  p_ref TEXT,
  p_completed_at TIMESTAMPTZ DEFAULT NOW()
) RETURNS void AS $$
BEGIN
  -- Mark as learned in user_progress
  INSERT INTO user_progress (user_id, ref, completed_at, is_completed)
  VALUES (p_user_id, p_ref, p_completed_at, TRUE)
  ON CONFLICT (user_id, ref) 
  DO UPDATE SET 
    is_completed = TRUE,
    completed_at = p_completed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 