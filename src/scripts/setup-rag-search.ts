import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client with service role for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupPgVector() {
  console.log('Setting up pgvector for RAG search...');

  try {
    // First, check if the pgvector extension is already installed
    const { data: extensionData, error: extensionError } = await supabase.rpc('check_extension_exists', {
      extension_name: 'vector'
    });

    if (extensionError) {
      console.error('Error checking pgvector extension:', extensionError);
      
      // Try to create the extension
      console.log('Creating pgvector extension...');
      const { error: createExtensionError } = await supabase.rpc('create_pg_extension', {
        extension_name: 'vector'
      });
      
      if (createExtensionError) {
        console.error('Error creating pgvector extension:', createExtensionError);
        
        // Let's try with direct SQL (needs higher privileges)
        console.log('Trying with direct SQL...');
        const { error: directExtensionError } = await supabase.from('_postgres_extensions').insert({
          name: 'vector'
        });
        
        if (directExtensionError) {
          console.error('Error installing pgvector with direct SQL:', directExtensionError);
          console.error('You may need to install the pgvector extension manually in the Supabase dashboard.');
        }
      }
    } else {
      console.log('pgvector extension status:', extensionData);
    }

    // Add embedding column to torah_texts table if it doesn't exist
    console.log('Checking embedding column on torah_texts table...');
    
    // Check if embedding column exists
    const { data: columnData, error: columnError } = await supabase.rpc('check_column_exists', {
      table_name: 'torah_texts',
      column_name: 'embedding'
    });
    
    if (columnError) {
      console.error('Error checking embedding column:', columnError);
    } else if (!columnData) {
      // Create embedding column
      console.log('Adding embedding column to torah_texts table...');
      
      // Execute an explicit SQL statement to add the column
      const { error: alterTableError } = await supabase.rpc('execute_sql', {
        sql_statement: 'ALTER TABLE torah_texts ADD COLUMN IF NOT EXISTS embedding vector(1536)'
      });
      
      if (alterTableError) {
        console.error('Error adding embedding column:', alterTableError);
      } else {
        console.log('Successfully added embedding column');
      }
    } else {
      console.log('Embedding column already exists');
    }

    // Create or replace the match_torah_texts function
    console.log('Creating match_torah_texts function...');
    
    const createMatchFunctionSql = `
    create or replace function match_torah_texts (
      query_embedding vector(1536),
      similarity_threshold float,
      match_count int,
      filter jsonb
    )
    returns table (
      id uuid,
      ref text,
      book text,
      section text,
      content text,
      language text,
      similarity float
    )
    language plpgsql
    as $$
    #variable_conflict use_column
    begin
      if filter is null or filter = '{}'::jsonb then
        return query
          select
            id,
            ref,
            book,
            section,
            content,
            language,
            1 - (embedding <=> query_embedding) as similarity
          from torah_texts
          where embedding is not null
          order by embedding <=> query_embedding
          limit match_count;
      else
        -- Handle language filter
        if filter ? 'language' then
          -- If we have both language and ref filters
          if filter ? 'ref' and filter -> 'ref' ? 'in' then
            return query
              select
                id,
                ref,
                book,
                section,
                content,
                language,
                1 - (embedding <=> query_embedding) as similarity
              from torah_texts
              where 
                embedding is not null and
                language = filter ->> 'language' and
                ref = ANY (ARRAY(SELECT jsonb_array_elements_text(filter -> 'ref' -> 'in')))
              order by embedding <=> query_embedding
              limit match_count;
          -- Only language filter
          else
            return query
              select
                id,
                ref,
                book,
                section,
                content,
                language,
                1 - (embedding <=> query_embedding) as similarity
              from torah_texts
              where 
                embedding is not null and
                language = filter ->> 'language'
              order by embedding <=> query_embedding
              limit match_count;
          end if;
        -- Only ref filter without language
        elsif filter ? 'ref' and filter -> 'ref' ? 'in' then
          return query
            select
              id,
              ref,
              book,
              section,
              content,
              language,
              1 - (embedding <=> query_embedding) as similarity
            from torah_texts
            where 
              embedding is not null and
              ref = ANY (ARRAY(SELECT jsonb_array_elements_text(filter -> 'ref' -> 'in')))
            order by embedding <=> query_embedding
            limit match_count;
        -- Default case with no special handling
        else
          return query
            select
              id,
              ref,
              book,
              section,
              content,
              language,
              1 - (embedding <=> query_embedding) as similarity
            from torah_texts
            where embedding is not null
            order by embedding <=> query_embedding
            limit match_count;
        end if;
      end if;
    end;
    $$;
    `;
    
    const { error: createFunctionError } = await supabase.rpc('execute_sql', {
      sql_statement: createMatchFunctionSql
    });
    
    if (createFunctionError) {
      console.error('Error creating match_torah_texts function:', createFunctionError);
    } else {
      console.log('Successfully created match_torah_texts function');
    }

    // Create the helper functions for checking extensions and columns
    console.log('Creating helper functions...');
    
    const createHelperFunctionsSql = `
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
        WHERE table_name = table_name AND column_name = column_name
      ) INTO exists_bool;
      
      RETURN exists_bool;
    END;
    $$;
    `;
    
    const { error: helperFunctionsError } = await supabase.rpc('execute_sql', {
      sql_statement: createHelperFunctionsSql
    });
    
    if (helperFunctionsError) {
      console.error('Error creating helper functions:', helperFunctionsError);
      console.error('You may need to create these functions manually in the Supabase dashboard.');
    } else {
      console.log('Successfully created helper functions');
    }
    
    console.log('RAG search setup complete!');
  } catch (error) {
    console.error('Unexpected error during RAG setup:', error);
  }
}

// Run the setup
setupPgVector()
  .then(() => {
    console.log('Setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  }); 