import { OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { Document } from '@langchain/core/documents';
import { supabase } from '@/lib/supabase/client';
import { ChatOpenAI } from '@langchain/openai';

// Initialize Supabase client with service role for data operations
// This will be used on the server-side only for vector search
const initializeServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

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
 * Uses an LLM to expand a search query into multiple related queries
 * to improve RAG search results
 * @param topic The original topic to expand
 * @param requestId Optional request ID for tracking logs
 * @returns An array of expanded queries including the original
 */
async function expandQuery(topic: string, requestId?: string): Promise<string[]> {
  const logPrefix = requestId ? `[${requestId}]` : '';
  console.log(`${logPrefix} Expanding query for topic: ${topic}`);
  
  try {
    const llm = new ChatOpenAI({ 
      modelName: 'gpt-4o',
      temperature: 0.3 
    });
    
    const response = await llm.invoke(
      `You are an expert in Jewish texts and Torah studies. The user is looking for texts about "${topic}".
       Generate 3-5 alternative search queries that would help find relevant passages in Talmudic texts.
       Be specific and include related concepts, Hebrew terms, and relevant ideas.
       Consider different ways this topic might be discussed in the Talmud.
       Return only the list of queries as a numbered list, nothing else.
       Keep it short and concise with just relevant keywords, don't include words like "in the Talmud" etc.
       Use English.`
    );
    
    // Extract queries from response
    const queryText = typeof response.content === 'string' ? response.content : '';
    const queries = queryText.split('\n')
      .filter(line => /^\d+\./.test(line))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
    
    const result = [topic, ...queries];
    console.log(`${logPrefix} Expanded original query "${topic}" to: ${result.join(', ')}`);
    return result;
  } catch (error) {
    console.error(`${logPrefix} Error expanding query:`, error);
    // Return just the original query if expansion fails
    return [topic];
  }
}

// Function to calculate relevance score for a text based on the query
function calculateRelevanceScore(text: any, queryTerms: string[]): number {
  const content = (text.content || text.content_en || '').toLowerCase();
  let score = 0;
  
  // Check for exact query matches (highest value)
  queryTerms.forEach(term => {
    if (content.includes(term.toLowerCase())) {
      score += 5;
    }
  });
  
  // Check for partial matches (individual words)
  const words = queryTerms.flatMap(term => term.toLowerCase().split(/\s+/));
  words.forEach(word => {
    if (word.length > 3 && content.includes(word)) {
      score += 1;
    }
  });
  
  // Bonus points for shorter texts (more likely to be focused on the topic)
  if (content.length < 1000) {
    score += 1;
  }
  
  // Bonus points for texts with the term in the reference/title
  if (text.ref && words.some((word: string) => 
    word.length > 3 && text.ref.toLowerCase().includes(word))) {
    score += 3;
  }
  
  return score;
}

/**
 * Retrieve amudim relevant to a specific topic using RAG
 * @param topic The topic to search for
 * @param userId The user's ID (to filter for learned refs)
 * @param count Number of results to return
 * @param onlyLearned Whether to only search in refs the user has learned
 * @param requestId Optional request ID for tracking logs
 * @returns An array of TorahText objects matching the topic, including both English and Hebrew versions
 */
export async function retrieveAmudimByTopic(
  topic: string,
  userId: string,
  count: number = 5,
  onlyLearned: boolean = true,
  requestId?: string
): Promise<any[]> {
  const logPrefix = requestId ? `[${requestId}]` : '';
  try {
    const serviceClient = initializeServiceClient();
    const embeddings = initializeEmbeddings();
    
    // Build the filter object for vector search
    let filterObj: Record<string, any> = { language: 'en' }; // Only search English texts
    
    // If we should only search in learned material, get the list of learned refs first
    if (onlyLearned) {
      console.log(`${logPrefix} Retrieving learned refs for user ${userId} to filter RAG search`);
      // Get the list of refs the user has marked as learned
      const { data: progressData, error: progressError } = await serviceClient
        .from('user_progress')
        .select('ref')
        .eq('user_id', userId)
        .eq('is_completed', true);
      
      if (progressError) {
        console.error(`${logPrefix} Error fetching user progress:`, progressError);
        return [];
      }
      
      // If no learned refs found, return empty array
      if (!progressData || progressData.length === 0) {
        console.log(`${logPrefix} No learned refs found for this user`);
        return [];
      }
      
      // Extract refs from progress data
      const learnedRefs = progressData.map(p => p.ref);
      console.log(`${logPrefix} Found ${learnedRefs.length} learned refs for user`);
      
      // Add learned refs to the filter
      filterObj.ref = { in: learnedRefs };
      console.log(`${logPrefix} Filter set to only include ${learnedRefs.length} learned refs`);
    }
    
    // Create a vector store filtered to only include English texts (and possibly learned refs)
    console.log(`${logPrefix} Creating vector store with filters:`, filterObj);

    // Debug: Check if any embeddings exist for the specified filter
    const { data: embeddingCheck, error: embeddingCheckError } = await serviceClient
      .from('torah_texts')
      .select('id, ref')
      .eq('language', 'en')
      .not('embedding', 'is', null)
      .limit(5);
      
    if (embeddingCheckError) {
      console.error(`${logPrefix} Error checking for embeddings:`, embeddingCheckError);
    } else {
      console.log(`${logPrefix} Found ${embeddingCheck?.length || 0} documents with embeddings:`, 
        embeddingCheck?.map(doc => doc.ref) || []);
    }
    
    // Configure the vector store with proper metadata handling
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: serviceClient,
      tableName: 'torah_texts',
      queryName: 'match_torah_texts',
      filter: filterObj
    });
    
    // NEW: Expand the query using LLM
    const expandedQueries = await expandQuery(topic, requestId);
    
    // Perform similarity search on the topic and expanded queries
    console.log(`${logPrefix} Searching for topic '${topic}' in ${onlyLearned ? 'learned' : 'all'} English texts`);
    
    let docs;
    let allDirectResults: any[] = [];
    
    try {
      // Search for each expanded query and collect results
      for (const query of expandedQueries) {
        // First, check if our vector similarity function is working by doing a direct query
        const { data: directData, error: directError } = await serviceClient.rpc(
          'match_torah_texts',
          {
            query_embedding: await embeddings.embedQuery(query),
            similarity_threshold: 0.01,
            match_count: Math.max(20, Math.ceil(count * 2 / expandedQueries.length)),
            filter: filterObj
          }
        );
        
        if (directError) {
          console.error(`${logPrefix} Error with direct vector search for query "${query}":`, directError);
        } else if (directData && directData.length > 0) {
          console.log(`${logPrefix} Direct vector search for "${query}" found ${directData?.length || 0} matches`);
          allDirectResults = [...allDirectResults, ...directData];
        }
      }
      
      // Deduplicate direct results based on ref
      const uniqueRefs = new Set();
      allDirectResults = allDirectResults.filter(result => {
        if (uniqueRefs.has(result.ref)) {
          return false;
        }
        uniqueRefs.add(result.ref);
        return true;
      });
      
      // Sort by similarity score
      allDirectResults.sort((a, b) => b.similarity - a.similarity);
      
      // Take top results
      allDirectResults = allDirectResults.slice(0, count);
      
      console.log(`${logPrefix} Combined direct search found ${allDirectResults.length} unique matches:`, 
        allDirectResults.map((d: any) => ({ ref: d.ref, similarity: d.similarity })));
      
      // Try the LangChain vectorStore approach with MMR for the original query
      try {
        // Use regular similarity search since MMR might not be supported in this version
        docs = await vectorStore.similaritySearch(topic, Math.max(20, count * 2));
        console.log(`${logPrefix} LangChain vector search found ${docs.length} matches`);
        
        // Debug the document structure
        console.log(`${logPrefix} First document structure:`, 
          docs.length > 0 ? JSON.stringify(docs[0]).substring(0, 200) + '...' : 'No documents found');
        
        // Check if the documents have valid metadata
        let validDocs = docs.filter(doc => doc.metadata && doc.metadata.ref);
        
        // If no valid metadata, try to extract metadata from the content
        if (validDocs.length === 0 && docs.length > 0) {
          console.log(`${logPrefix} Attempting to extract metadata from document content`);
          
          try {
            // Check if we can extract metadata from the database directly
            const refs = docs.map(doc => {
              // Try to extract ref from pageContent using regex
              const refMatch = doc.pageContent.match(/ref:\s*([^,\n]+)/i);
              return refMatch ? refMatch[1].trim() : null;
            }).filter(Boolean);
            
            if (refs.length > 0) {
              console.log(`${logPrefix} Extracted ${refs.length} refs from document content:`, refs);
              
              // Fetch the complete records for these refs to rebuild proper documents
              const { data: textsData, error: textsError } = await serviceClient
                .from('torah_texts')
                .select('*')
                .eq('language', 'en')
                .in('ref', refs);
                
              if (textsError) {
                console.error(`${logPrefix} Error fetching texts by refs:`, textsError);
              } else if (textsData && textsData.length > 0) {
                console.log(`${logPrefix} Found ${textsData.length} records for extracted refs`);
                
                // Create valid documents with proper metadata
                validDocs = textsData.map(item => ({
                  pageContent: item.content || '',
                  metadata: {
                    ref: item.ref,
                    book: item.book,
                    section: item.section,
                    language: item.language
                  }
                }));
              }
            }
          } catch (extractError) {
            console.error(`${logPrefix} Error extracting metadata:`, extractError);
          }
        }
        
        if (validDocs.length === 0) {
          console.log(`${logPrefix} No valid metadata found in LangChain results, using direct query results`);
          
          // Fall back to direct query results
          if (allDirectResults && allDirectResults.length > 0) {
            console.log(`${logPrefix} Using ${allDirectResults.length} results from direct query`);
            // Convert direct query results to Document format
            docs = allDirectResults.map((item: any) => ({
              pageContent: item.content,
              metadata: {
                ref: item.ref,
                book: item.book,
                section: item.section,
                language: item.language
              }
            }));
          } else {
            console.log(`${logPrefix} No results from either search method`);
            return [];
          }
        } else {
          console.log(`${logPrefix} Found ${validDocs.length} documents with valid metadata`);
          docs = validDocs;
        }
      } catch (vectorStoreError) {
        console.error(`${logPrefix} Error with LangChain vector search:`, vectorStoreError);
        
        // Fall back to direct query results if available
        if (allDirectResults && allDirectResults.length > 0) {
          console.log(`${logPrefix} Falling back to direct query results`);
          // Convert direct query results to Document format
          docs = allDirectResults.map((item: any) => ({
            pageContent: item.content,
            metadata: {
              ref: item.ref,
              book: item.book,
              section: item.section,
              language: item.language
            }
          }));
        } else {
          throw vectorStoreError;
        }
      }
      
      if (!docs || docs.length === 0) {
        console.log(`${logPrefix} No matching English texts found in RAG search`);
        return [];
      }
    } catch (error) {
      console.error(`${logPrefix} Error in RAG topic search:`, error);
      throw error;
    }
    
    // Extract the refs from the search results to find corresponding Hebrew texts
    const englishRefs = docs
      .map((doc: any) => doc.metadata?.ref || null)
      .filter((ref: string | null) => ref !== null && ref !== undefined);
    
    if (englishRefs.length === 0) {
      console.log(`${logPrefix} No valid refs found in search results, metadata may be missing`);
      return [];
    }
    
    console.log(`${logPrefix} Found ${englishRefs.length} relevant English texts:`, englishRefs);
    console.log(`${logPrefix} Fetching Hebrew counterparts for these refs`);
    
    // Get the corresponding Hebrew versions
    const result = await fetchBilingualAmudim(serviceClient, englishRefs, requestId);
    
    console.log(`${logPrefix} Returning ${result.length} bilingual text entries`);
    
    // After gathering all results
    console.log(`${logPrefix} Total combined results: ${result.length}`);
    
    // Calculate relevance scores and sort by score
    if (result.length > 0) {
      const queryTerms = [topic, ...expandedQueries];
      result.forEach(doc => {
        // @ts-ignore - Add score property
        doc.relevanceScore = calculateRelevanceScore(doc, queryTerms);
      });
      
      // Sort by relevance score (highest first)
      result.sort((a, b) => {
        // @ts-ignore - Access added score property
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      });
      
      console.log(`${logPrefix} Sorted results by relevance score`);
    }
    
    // Take top results based on limit
    const topResults = result.slice(0, count);
    
    // Debug log the relevance scores of selected documents
    if (topResults.length > 0) {
      console.log(`${logPrefix} Top results with relevance scores:`);
      topResults.forEach((doc, index) => {
        // @ts-ignore - Access added score property
        console.log(`${logPrefix} ${index + 1}. Ref: ${doc.ref}, Score: ${doc.relevanceScore || 0}`);
      });
    }
    
    return topResults;
  } catch (error) {
    console.error(`${logPrefix} Error in RAG topic search:`, error);
    throw error;
  }
}

/**
 * Helper function to fetch both English and Hebrew versions of the given refs
 * @param client The Supabase client
 * @param refs Array of references to fetch
 * @param requestId Optional request ID for tracking logs
 * @returns Array of paired English and Hebrew text objects
 */
export async function fetchBilingualAmudim(
  client: any, 
  refs: string[], 
  requestId?: string
): Promise<any[]> {
  const logPrefix = requestId ? `[${requestId}]` : '';
  try {
    // First, get all English texts for these refs
    const { data: enData, error: enError } = await client
      .from('torah_texts')
      .select('*')
      .in('ref', refs)
      .eq('language', 'en');
      
    if (enError) {
      console.error(`${logPrefix} Error fetching English texts:`, enError);
      return [];
    }
    
    if (!enData || enData.length === 0) {
      console.log(`${logPrefix} No English texts found for the requested refs`);
      return [];
    }
    
    // Extract the refs for which we have English texts
    const enRefs = enData.map((text: any) => text.ref);
    
    // Now get the corresponding Hebrew texts for these same refs
    const { data: heData, error: heError } = await client
      .from('torah_texts')
      .select('*')
      .in('ref', enRefs)
      .eq('language', 'he');
    
    if (heError) {
      console.error(`${logPrefix} Error fetching Hebrew texts:`, heError);
      // Return just the English texts if we can't get Hebrew
      return enData.map((text: any) => ({
        ...text,
        content_en: text.content,
        content_he: null,
        content: `English: ${text.content}`
      }));
    }
    
    // Create a map of Hebrew texts by ref for easy lookup
    const heTextsByRef: Record<string, any> = {};
    if (heData && heData.length > 0) {
      heData.forEach((text: any) => {
        heTextsByRef[text.ref] = text;
      });
    }
    
    // Combine English and Hebrew texts
    const result = enData.map((enText: any) => {
      const heText = heTextsByRef[enText.ref];
      
      return {
        ...enText,
        content_en: enText.content,
        content_he: heText ? heText.content : null,
        content: heText
          ? `English: ${enText.content}\n\nHebrew: ${heText.content}`
          : `English: ${enText.content}`
      };
    });
    
    console.log(`${logPrefix} Successfully paired ${result.length} texts with their bilingual versions`);
    return result;
  } catch (error) {
    console.error(`${logPrefix} Error in fetchBilingualAmudim:`, error);
    return [];
  }
}

/**
 * Fallback method to retrieve amudim with basic keyword matching when vector search fails
 * @param topic The topic to search for
 * @param userId The user's ID (to filter for learned refs)
 * @param count Number of results to return
 * @param onlyLearned Whether to only search in refs the user has learned
 * @param requestId Optional request ID for tracking logs
 * @returns An array of TorahText objects matching the topic
 */
export async function fallbackRetrieveAmudimByTopic(
  topic: string,
  userId: string,
  count: number = 10,
  limitToLearned: boolean = false,
  requestId: string = 'unspecified'
): Promise<any[]> {
  const logPrefix = `[${requestId}][fallbackRetrieveAmudimByTopic]`;
  console.log(`${logPrefix} Starting fallback search for topic: "${topic}"`);
  
  try {
    // Use query expansion to get a more comprehensive set of search queries
    const expandedQueries = await expandQuery(topic, requestId);
    console.log(`${logPrefix} Expanded queries:`, expandedQueries);
    
    // Build a list of all results
    const allResults: any[] = [];
    const seenRefs = new Set<string>();
    
    // Helper function to process results and avoid duplicates
    const addToResults = (docs: any[]) => {
      for (const doc of docs) {
        if (doc && doc.ref && !seenRefs.has(doc.ref)) {
          seenRefs.add(doc.ref);
          allResults.push(doc);
        }
      }
    };
    
    // If limiting to learned content, get the list of learned refs
    let learnedRefs: string[] = [];
    if (limitToLearned) {
      const { data, error } = await supabase
        .from('user_progress')
        .select('ref')
        .eq('user_id', userId)
        .eq('is_completed', true);
      
      if (error) {
        console.error(`${logPrefix} Error fetching user progress:`, error);
      } else {
        learnedRefs = data.map(p => p.ref);
        console.log(`${logPrefix} Found ${learnedRefs.length} learned refs for user`);
      }
    }
    
    // Define searchable fields
    const searchFields = ['content', 'ref', 'book'];
    
    // Process the base query first
    for (const field of searchFields) {
      let query = supabase.from('torah_texts').select('*');
      
      // Add field-specific filter
      query = query.ilike(field, `%${topic}%`);
      
      // Add learned content filter if needed
      if (limitToLearned && learnedRefs.length > 0) {
        query = query.in('ref', learnedRefs);
      }
      
      // Limit results for each query
      query = query.limit(count * 2);
      
      const { data, error } = await query;
      
      if (error) {
        console.error(`${logPrefix} Error searching by ${field}:`, error);
      } else if (data) {
        console.log(`${logPrefix} Found ${data.length} results for base query in ${field}`);
        addToResults(data);
      }
    }
    
    // Process each expanded query
    for (const expandedQuery of expandedQueries) {
      for (const field of searchFields) {
        let query = supabase.from('torah_texts').select('*');
        
        // Add field-specific filter
        query = query.ilike(field, `%${expandedQuery}%`);
        
        // Add learned content filter if needed
        if (limitToLearned && learnedRefs.length > 0) {
          query = query.in('ref', learnedRefs);
        }
        
        // Limit results for each query
        query = query.limit(count * 2);
        
        const { data, error } = await query;
        
        if (error) {
          console.error(`${logPrefix} Error searching by ${field} with expanded query:`, error);
        } else if (data) {
          console.log(`${logPrefix} Found ${data.length} results for expanded query "${expandedQuery}" in ${field}`);
          addToResults(data);
        }
      }
    }
    
    console.log(`${logPrefix} Total combined fallback results: ${allResults.length}`);
    
    // Calculate relevance scores and sort by score
    if (allResults.length > 0) {
      const queryTerms = [topic, ...expandedQueries];
      allResults.forEach(doc => {
        // @ts-ignore - Add score property
        doc.relevanceScore = calculateRelevanceScore(doc, queryTerms);
      });
      
      // Sort by relevance score (highest first)
      allResults.sort((a, b) => {
        // @ts-ignore - Access added score property
        return (b.relevanceScore || 0) - (a.relevanceScore || 0);
      });
      
      console.log(`${logPrefix} Sorted fallback results by relevance score`);
      
      // Debug log the relevance scores of selected documents
      const topResults = allResults.slice(0, count);
      if (topResults.length > 0) {
        console.log(`${logPrefix} Top fallback results with relevance scores:`);
        topResults.forEach((doc, index) => {
          // @ts-ignore - Access added score property
          console.log(`${logPrefix} ${index + 1}. Ref: ${doc.ref}, Score: ${doc.relevanceScore || 0}`);
        });
      }
    }
    
    // Take top results based on limit
    return allResults.slice(0, count);
  } catch (error) {
    console.error(`${logPrefix} Error in fallback topic search:`, error);
    return [];
  }
} 