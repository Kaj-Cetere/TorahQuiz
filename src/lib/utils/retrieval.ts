import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { Document } from '@langchain/core/documents';
import { supabase } from '@/lib/supabase/client';

// For vector store operations, we need a direct client with the right format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const vectorStoreClient = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI embeddings
const initializeEmbeddings = () => {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('Missing OpenAI API key');
  }
  
  return new OpenAIEmbeddings({
    openAIApiKey: openaiKey,
    modelName: 'text-embedding-3-small',
  });
};

/**
 * Retrieve texts from a user's collection based on semantic similarity
 * @param userId The user's ID
 * @param query The query to search for
 * @param k Number of results to return
 * @param filter Optional filter criteria
 * @returns An array of matching documents
 */
export async function retrieveUserTexts(
  userId: string,
  query: string,
  k: number = 5,
  filter?: object
): Promise<Document[]> {
  try {
    const embeddings = initializeEmbeddings();
    
    // Create a vector store from the user's personal collection
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: vectorStoreClient,
      tableName: 'user_torah_texts',
      queryName: 'match_user_torah_texts',
      filter: { user_id: userId, ...filter },
    });
    
    // Perform similarity search
    const docs = await vectorStore.similaritySearch(query, k);
    return docs;
  } catch (error) {
    console.error('Error retrieving texts:', error);
    throw error;
  }
}

/**
 * Retrieve texts from the master collection based on semantic similarity
 * @param query The query to search for
 * @param k Number of results to return
 * @param filter Optional filter criteria
 * @returns An array of matching documents
 */
export async function retrieveMasterTexts(
  query: string,
  k: number = 5,
  filter?: object
): Promise<Document[]> {
  try {
    const embeddings = initializeEmbeddings();
    
    // Create a vector store from the master collection
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: vectorStoreClient,
      tableName: 'torah_texts',
      queryName: 'match_torah_texts',
      filter,
    });
    
    // Perform similarity search
    const docs = await vectorStore.similaritySearch(query, k);
    return docs;
  } catch (error) {
    console.error('Error retrieving master texts:', error);
    throw error;
  }
}

/**
 * Retrieve texts related to a specific reference
 * @param ref The reference to search for (e.g., "Berakhot.2a")
 * @param k Number of results to return
 * @returns An array of matching documents
 */
export async function retrieveTextsByRef(ref: string, k: number = 1): Promise<Document[]> {
  try {
    // For exact reference matching, we can use direct database query
    const { data, error } = await vectorStoreClient
      .from('torah_texts')
      .select('*')
      .eq('ref', ref)
      .limit(k);
    
    if (error) throw error;
    
    // Convert to LangChain Document format
    return data.map((item) => new Document({
      pageContent: item.content,
      metadata: {
        ref: item.ref,
        book: item.book,
        section: item.section,
        language: item.language,
      },
    }));
  } catch (error) {
    console.error('Error retrieving texts by ref:', error);
    throw error;
  }
} 