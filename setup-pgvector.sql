-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Helper functions for database setup 
-- Function to check if an extension exists
CREATE OR REPLACE FUNCTION check_extension_exists(extension_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_bool boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_extension WHERE extname = extension_name
  ) INTO exists_bool;
  
  RETURN exists_bool;
END;
$$;

-- Function to create a PostgreSQL extension
CREATE OR REPLACE FUNCTION create_pg_extension(extension_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE 'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(extension_name);
END;
$$;

-- Function to execute arbitrary SQL (use with caution!)
CREATE OR REPLACE FUNCTION execute_sql(sql_statement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_statement;
END;
$$;

-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  exists_bool boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = check_column_exists.table_name 
    AND column_name = check_column_exists.column_name
  ) INTO exists_bool;
  
  RETURN exists_bool;
END;
$$;

-- Add embedding column to torah_texts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'torah_texts' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE torah_texts ADD COLUMN embedding vector(1536);
  END IF;
END
$$;

-- Create the match_torah_texts function for vector search
CREATE OR REPLACE FUNCTION match_torah_texts (
  query_embedding vector(1536),
  similarity_threshold float,
  match_count int,
  filter jsonb
)
RETURNS TABLE (
  id uuid,
  ref text,
  book text,
  section text,
  content text,
  language text,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  IF filter IS NULL OR filter = '{}'::jsonb THEN
    -- By default, only match English texts which should have embeddings
    RETURN QUERY
      SELECT
        id,
        ref,
        book,
        section,
        content,
        language,
        1 - (embedding <=> query_embedding) AS similarity
      FROM torah_texts
      WHERE embedding IS NOT NULL AND language = 'en'
      ORDER BY embedding <=> query_embedding
      LIMIT match_count;
  ELSE
    -- Filter handling for ref IN clause
    IF filter ? 'ref' AND filter -> 'ref' ? 'in' THEN
      RETURN QUERY
        SELECT
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) AS similarity
        FROM torah_texts
        WHERE 
          embedding IS NOT NULL AND
          language = 'en' AND
          ref = ANY (ARRAY(SELECT jsonb_array_elements_text(filter -> 'ref' -> 'in')))
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
    -- Handle explicit language filter if provided
    ELSIF filter ? 'language' THEN
      RETURN QUERY
        SELECT
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) AS similarity
        FROM torah_texts
        WHERE 
          embedding IS NOT NULL AND
          language = filter ->> 'language'
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
    -- Default case with no special handling
    ELSE
      RETURN QUERY
        SELECT
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) AS similarity
        FROM torah_texts
        WHERE embedding IS NOT NULL AND language = 'en'
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
    END IF;
  END IF;
END;
$$;

-- Create an alternate version with different parameter order to support newer LangChain versions
CREATE OR REPLACE FUNCTION match_torah_texts (
  filter jsonb,
  match_count int,
  query_embedding vector(1536)
)
RETURNS TABLE (
  id uuid,
  ref text,
  book text,
  section text,
  content text,
  language text,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  IF filter IS NULL OR filter = '{}'::jsonb THEN
    -- By default, only match English texts which should have embeddings
    RETURN QUERY
      SELECT
        id,
        ref,
        book,
        section,
        content,
        language,
        1 - (embedding <=> query_embedding) AS similarity
      FROM torah_texts
      WHERE embedding IS NOT NULL AND language = 'en'
      ORDER BY embedding <=> query_embedding
      LIMIT match_count;
  ELSE
    -- Filter handling for ref IN clause
    IF filter ? 'ref' AND filter -> 'ref' ? 'in' THEN
      RETURN QUERY
        SELECT
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) AS similarity
        FROM torah_texts
        WHERE 
          embedding IS NOT NULL AND
          language = 'en' AND
          ref = ANY (ARRAY(SELECT jsonb_array_elements_text(filter -> 'ref' -> 'in')))
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
    -- Handle explicit language filter if provided
    ELSIF filter ? 'language' THEN
      RETURN QUERY
        SELECT
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) AS similarity
        FROM torah_texts
        WHERE 
          embedding IS NOT NULL AND
          language = filter ->> 'language'
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
    -- Default case with no special handling
    ELSE
      RETURN QUERY
        SELECT
          id,
          ref,
          book,
          section,
          content,
          language,
          1 - (embedding <=> query_embedding) AS similarity
        FROM torah_texts
        WHERE embedding IS NOT NULL AND language = 'en'
        ORDER BY embedding <=> query_embedding
        LIMIT match_count;
    END IF;
  END IF;
END;
$$; 