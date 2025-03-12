import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client (with service role for direct access)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI embeddings
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('Missing OpenAI API key');
  process.exit(1);
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: openaiApiKey,
  modelName: 'text-embedding-3-small',
});

// Keep track of skipped and truncated texts
const skippedTexts: Record<string, string> = {};
const truncatedTexts: Record<string, string> = {};

// Simple function to estimate token count (3.5 chars ≈ 1 token as a very conservative estimate)
// Hebrew and Aramaic texts often have higher token-to-character ratios than English
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// Token limit for the embedding model (with a much larger safety margin)
const MAX_TOKEN_LIMIT = 6000; // Actual limit is 8192, but we add a large safety margin for Hebrew/Aramaic texts

// Function to truncate text to fit within token limit
function truncateText(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokenCount(text);
  
  if (estimatedTokens <= maxTokens) {
    return text; // Text is already within limit
  }
  
  // Calculate roughly how many characters we can keep
  const keepChars = Math.floor(maxTokens * 3.5);
  
  // Keep the beginning of the text up to the character limit
  const truncated = text.slice(0, keepChars);
  
  // Ensure we don't cut in the middle of a word by finding the last space
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0 && lastSpace > keepChars * 0.9) { // Only adjust if we don't lose too much
    return truncated.slice(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// Very aggressive truncation for extremely large texts
function aggressiveTruncate(text: string): string {
  // Target around 4000 tokens (very safe)
  const keepChars = 4000 * 3.5;
  
  // Keep only the beginning portion
  const truncated = text.slice(0, keepChars);
  
  // Find a good breaking point
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0 && lastSpace > keepChars * 0.9) {
    return truncated.slice(0, lastSpace) + '... [text heavily truncated]';
  }
  
  return truncated + '... [text heavily truncated]';
}

// Function to fetch texts from torah_texts table
async function fetchTorahTexts(batchSize: number = 100, offset: number = 0, shouldTruncate: boolean = true) {
  try {
    // Modified to exclude IDs that we know need to be skipped entirely
    const skippedIds = Object.keys(skippedTexts);
    
    let query = supabase
      .from('torah_texts')
      .select('id, ref, content', { count: 'exact' })
      .is('embedding', null);
    
    // If we have skipped texts, exclude them from the query
    if (skippedIds.length > 0) {
      query = query.not('id', 'in', `(${skippedIds.join(',')})`);
    }
    
    // Add pagination
    const { data, error, count } = await query.range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching torah texts:', error);
      
      // Handle the case where the offset is beyond available rows
      if (error.code === 'PGRST103' && error.message.includes('Requested range not satisfiable')) {
        console.log('No more records to process at the current offset. Resetting to offset 0.');
        // If we've skipped any texts, we should have fewer total records
        if (skippedIds.length > 0) {
          return { data: [], count: 0 }; // Return empty to indicate we're done
        }
        return fetchTorahTexts(batchSize, 0, shouldTruncate); // Retry from the beginning
      }
      
      return { data: [], count: 0 };
    }

    // Process the data - either filter out or truncate large texts
    if (data) {
      const processedData = data.map(text => {
        const estimatedTokens = estimateTokenCount(text.content);
        
        // If text is too large
        if (estimatedTokens > MAX_TOKEN_LIMIT) {
          if (shouldTruncate) {
            // For extremely large texts, use aggressive truncation
            if (estimatedTokens > MAX_TOKEN_LIMIT * 1.5) {
              const heavilyTruncatedContent = aggressiveTruncate(text.content);
              truncatedTexts[text.id] = `${text.ref || 'unknown'} (heavily truncated)`;
              return {
                ...text,
                content: heavilyTruncatedContent,
                _truncated: true,
                _heavilyTruncated: true
              };
            }
            
            // For moderately large texts, use standard truncation
            const truncatedContent = truncateText(text.content, MAX_TOKEN_LIMIT);
            truncatedTexts[text.id] = text.ref || 'unknown';
            return {
              ...text,
              content: truncatedContent,
              _truncated: true
            };
          } else {
            // Skip this text by filtering it out later
            console.log(`Pre-filtering: Skipping text ${text.id} (${text.ref || 'unknown'}) - estimated ${estimatedTokens} tokens exceeds limit`);
            skippedTexts[text.id] = text.ref || 'unknown';
            return null;
          }
        }
        return text;
      }).filter(text => text !== null);
      
      return { data: processedData, count };
    }

    return { data: data || [], count };
  } catch (error) {
    console.error('Unexpected error fetching texts:', error);
    return { data: [], count: 0 };
  }
}

// Function to update embeddings in the database
async function updateEmbeddings(id: string, embeddingVector: number[]) {
  const { error } = await supabase
    .from('torah_texts')
    .update({ embedding: embeddingVector })
    .eq('id', id);

  if (error) {
    console.error(`Error updating embedding for text ${id}:`, error);
    return false;
  }

  return true;
}

// Main function to generate and store embeddings
async function generateAndStoreEmbeddings() {
  console.log('Starting embedding generation for Torah texts...');

  // Ask if we should truncate large texts
  const shouldTruncate = true; // Default to truncating rather than skipping
  console.log(`Will ${shouldTruncate ? 'truncate' : 'skip'} texts that exceed the token limit.`);

  let offset = 0;
  const batchSize = 3; // Very small batch size to avoid token limit issues
  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalTruncated = 0;
  let totalHeavilyTruncated = 0;
  let totalTexts = 0;
  let emptyBatchCount = 0; // Keep track of consecutive empty batches
  const maxEmptyBatches = 3; // Maximum number of consecutive empty batches before stopping

  // Get initial batch and total count
  let { data: texts, count } = await fetchTorahTexts(batchSize, offset, shouldTruncate);
  totalTexts = count || 0;

  console.log(`Found ${totalTexts} texts without embeddings`);

  // Process all texts in batches
  while (texts.length > 0) {
    console.log(`Processing batch of ${texts.length} texts (${totalProcessed}/${totalTexts})...`);
    emptyBatchCount = 0; // Reset empty batch counter when we find texts to process

    // Note which texts in this batch were truncated
    const truncatedInBatch = texts.filter(text => (text as any)._truncated && !(text as any)._heavilyTruncated).length;
    const heavilyTruncatedInBatch = texts.filter(text => (text as any)._heavilyTruncated).length;
    
    if (truncatedInBatch > 0 || heavilyTruncatedInBatch > 0) {
      console.log(`Note: ${truncatedInBatch} texts normally truncated, ${heavilyTruncatedInBatch} texts heavily truncated`);
      totalTruncated += truncatedInBatch;
      totalHeavilyTruncated += heavilyTruncatedInBatch;
    }

    // Generate embeddings for the batch
    const contents = texts.map(text => text.content);
    let embeddingVectors: number[][] = [];
    
    try {
      // Generate embeddings for the batch
      const embeddingResults = await embeddings.embedDocuments(contents);
      embeddingVectors = embeddingResults;
      
      console.log(`Generated ${embeddingVectors.length} embeddings`);
    } catch (error) {
      console.error('Error generating embeddings:', error);
      
      // Process one at a time to identify which texts are too large
      console.log('Attempting to process texts one by one...');
      
      for (const text of texts) {
        try {
          const singleEmbedding = await embeddings.embedQuery(text.content);
          
          // Update the embedding in the database
          const success = await updateEmbeddings(text.id, singleEmbedding);
          
          if (success) {
            totalProcessed++;
            if ((text as any)._heavilyTruncated) {
              console.log(`Processed text ${text.id} (${text.ref || 'unknown'}) (heavily truncated) (${totalProcessed}/${totalTexts})`);
              totalHeavilyTruncated++;
            } else if ((text as any)._truncated) {
              console.log(`Processed text ${text.id} (${text.ref || 'unknown'}) (truncated) (${totalProcessed}/${totalTexts})`);
              totalTruncated++;
            } else {
              console.log(`Processed text ${text.id} (${text.ref || 'unknown'}) (${totalProcessed}/${totalTexts})`);
            }
          }
          
          // Pause briefly to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (singleError: any) {
          // Check if this is a token limit error
          if (singleError.message && singleError.message.includes('maximum context length')) {
            if (shouldTruncate) {
              // Try super aggressive truncation as a last resort
              try {
                // Target around 3000 tokens (extremely safe)
                const superTruncated = text.content.slice(0, 3000 * 3.5) + '... [text extremely truncated]';
                const singleEmbedding = await embeddings.embedQuery(superTruncated);
                const success = await updateEmbeddings(text.id, singleEmbedding);
                
                if (success) {
                  totalProcessed++;
                  totalHeavilyTruncated++;
                  console.log(`Processed text ${text.id} (${text.ref || 'unknown'}) (extremely truncated) (${totalProcessed}/${totalTexts})`);
                  truncatedTexts[text.id] = `${text.ref || 'unknown'} (extremely truncated)`;
                }
              } catch (furtherError) {
                console.log(`Skipping text ${text.id} (${text.ref || 'unknown'}) - exceeds token limit even after extreme truncation`);
                skippedTexts[text.id] = text.ref || 'unknown';
                totalSkipped++;
              }
            } else {
              console.log(`Skipping text ${text.id} (${text.ref || 'unknown'}) - exceeds token limit`);
              skippedTexts[text.id] = text.ref || 'unknown';
              totalSkipped++;
            }
          } else {
            console.error(`Error processing text ${text.id}:`, singleError);
          }
        }
      }
      
      // Move to the next batch
      offset += batchSize;
      const fetchResult = await fetchTorahTexts(batchSize, offset, shouldTruncate);
      texts = fetchResult.data;
      continue;
    }

    // Update embeddings in the database
    for (let i = 0; i < texts.length; i++) {
      if (i < embeddingVectors.length) {
        const success = await updateEmbeddings(texts[i].id, embeddingVectors[i]);
        
        if (success) {
          totalProcessed++;
          if ((texts[i] as any)._heavilyTruncated) {
            totalHeavilyTruncated++;
          } else if ((texts[i] as any)._truncated) {
            totalTruncated++;
          }
        }
      }
    }

    // Log progress
    console.log(`Completed batch: ${totalProcessed}/${totalTexts} texts processed, ${totalSkipped} skipped, ${totalTruncated + totalHeavilyTruncated} truncated`);

    // Move to the next batch
    offset += batchSize;
    const fetchResult = await fetchTorahTexts(batchSize, offset, shouldTruncate);
    texts = fetchResult.data;

    // Check if we got an empty batch
    if (texts.length === 0) {
      emptyBatchCount++;
      
      if (emptyBatchCount >= maxEmptyBatches) {
        console.log(`Received ${maxEmptyBatches} consecutive empty batches. Assuming all texts have been processed.`);
        break;
      }
      
      // Reset offset to start from the beginning to catch any missed records
      console.log('Empty batch received. Resetting offset to catch any missed records...');
      offset = 0;
      const resetFetchResult = await fetchTorahTexts(batchSize, offset, shouldTruncate);
      texts = resetFetchResult.data;
      
      // If still empty after reset, we'll increment the empty batch count on the next iteration
    }

    // Add a small delay between batches to avoid rate limiting
    if (texts.length > 0) {
      console.log('Pausing before next batch...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Write skipped and truncated texts to log
  if (totalSkipped > 0) {
    console.log(`\nSkipped ${totalSkipped} texts due to token limit:`);
    Object.entries(skippedTexts).forEach(([id, ref]) => {
      console.log(`- ID: ${id}, Ref: ${ref}`);
    });
  }
  
  if (totalTruncated > 0 || totalHeavilyTruncated > 0) {
    console.log(`\nTruncated ${totalTruncated + totalHeavilyTruncated} texts to fit within token limit:`);
    console.log(`- Normal truncation: ${totalTruncated} texts`);
    console.log(`- Heavy truncation: ${totalHeavilyTruncated} texts`);
    
    Object.entries(truncatedTexts).forEach(([id, ref]) => {
      console.log(`- ID: ${id}, Ref: ${ref}`);
    });
    console.log('\nNote: Truncated texts preserve the beginning portion of the amud and will still be valuable for RAG retrieval.');
  }

  console.log(`\nEmbedding generation complete!`);
  console.log(`- Processed: ${totalProcessed}/${totalTexts} texts`);
  console.log(`- Truncated (normal): ${totalTruncated} texts`);
  console.log(`- Truncated (heavy): ${totalHeavilyTruncated} texts`);
  console.log(`- Skipped: ${totalSkipped} texts`);
  console.log(`- Remaining: ${totalTexts - totalProcessed - totalSkipped} texts`);
}

// Run the embedding generation
generateAndStoreEmbeddings()
  .then(() => {
    console.log('Embedding generation process finished successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error in embedding generation process:', error);
    process.exit(1);
  }); 