import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { QuizSettings, QuizTopicSelection, QuestionType, TorahText } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { retrieveAmudimByTopic, fallbackRetrieveAmudimByTopic, fetchBilingualAmudim } from '@/lib/utils/rag-topic-search';
import { GoogleGenerativeAI } from '@google/generative-ai';  // Import Google Gen AI SDK

// Set the maximum duration for this function to 60 seconds
export const maxDuration = 60;

// This code runs server-side, so we can use the regular OPENAI_API_KEY
const openaiApiKey = process.env.OPENAI_API_KEY;
// Google Gen AI API Key - throw an error if it's not defined
const googleApiKey = process.env.GOOGLE_API_KEY || '';
if (!googleApiKey) {
  console.error('GOOGLE_API_KEY environment variable is not defined');
}

// Create a service role client for accessing torah_texts directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

// Create an in-memory cache to track recent requests
// Note: This will be reset when the server restarts
const requestCache = new Map<string, number>();

// Clean up old entries from the cache every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of requestCache.entries()) {
    if (now - timestamp > 60000) { // Remove entries older than 1 minute
      requestCache.delete(key);
    }
  }
}, 300000); // Run every 5 minutes

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 15);
  console.log(`[${requestId}] Starting quiz generation request`);
  
  try {
    // Create a clone of the request before reading the body
    // This prevents the "body used already" error
    const requestClone = request.clone();
    
    let body;
    try {
      body = await requestClone.json();
    } catch (error) {
      console.error(`[${requestId}] Error parsing request body:`, error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' }, 
        { status: 400 }
      );
    }

    const { userId, settings, topicSelection, model = 'gemini' } = body;
    
    // Check required parameters
    if (!userId || !settings || !topicSelection) {
      console.log(`[${requestId}] Missing required parameters`);
      return NextResponse.json(
        { error: 'Missing required parameters' }, 
        { status: 400 }
      );
    }
    
    // Create a cache key based on the request parameters
    const cacheKey = JSON.stringify({ 
      userId, 
      settings: {
        ...settings,
        questionTypes: Array.isArray(settings.questionTypes) 
          ? [...settings.questionTypes].sort().join(',') 
          : settings.questionTypes
      }, 
      topicSelection,
      model 
    });
    
    // Check for duplicate requests
    const now = Date.now();
    const lastRequestTime = requestCache.get(cacheKey);
    if (lastRequestTime && now - lastRequestTime < 5000) {
      console.log(`[${requestId}] Duplicate request detected within 5 seconds, returning 429`);
      return NextResponse.json(
        { error: 'Too many requests. Please wait before submitting another quiz generation request.' }, 
        { status: 429 }
      );
    }
    
    // Store this request in the cache
    requestCache.set(cacheKey, now);
    
    console.log(`[${requestId}] API request received:`, { 
      userId: userId?.substring(0, 8) + '...', // Log only part of the ID for privacy
      settings: settings ? { 
        ...settings, 
        questionTypes: Array.isArray(settings.questionTypes) ? settings.questionTypes.length : settings.questionTypes 
      } : undefined, 
      topicSelection,
      model 
    });
    
    // Check if we have the required API keys based on the model selected
    if (model === 'openai' && !openaiApiKey) {
      console.log(`[${requestId}] Missing OpenAI API key`);
      return NextResponse.json(
        { error: 'Server configuration error: Missing OpenAI API key' }, 
        { status: 500 }
      );
    } else if (model === 'gemini' && !googleApiKey) {
      console.log(`[${requestId}] Missing Google API key`);
      return NextResponse.json(
        { error: 'Server configuration error: Missing Google API key' }, 
        { status: 500 }
      );
    }

    // Initialize LLM based on selected model
    let llm;
    if (model === 'gemini') {
      // For Gemini, we'll implement a compatible interface with ChatOpenAI
      // since we'll need to adapt it to work with our existing code
      const genAI = new GoogleGenerativeAI(googleApiKey);
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // No need to initialize OpenAI LLM if using Gemini
      console.log(`[${requestId}] Using Gemini model for question generation`);
    } else {
      // Default to OpenAI
      llm = new ChatOpenAI({
        openAIApiKey: openaiApiKey,
        modelName: 'gpt-4o-mini',  // Use a more capable model for better question generation
        temperature: 0.3,     // Lower temperature for more focused output
      });
      console.log(`[${requestId}] Using OpenAI model for question generation`);
    }
    
    // Fetch relevant texts from the database
    console.log(`[${requestId}] Fetching relevant texts for topic:`, topicSelection);
    let relevantTexts = await fetchRelevantTexts(userId, topicSelection, requestId);
    
    // Post-process the retrieved texts to ensure they're highly relevant
    if (topicSelection.type === 'topic' && topicSelection.topic) {
      console.log(`[${requestId}] Post-processing retrieved texts to ensure relevance to topic: ${topicSelection.topic}`);
      console.log(`[${requestId}] Starting with ${relevantTexts.length} texts before filtering`);
      
      // Define minimum threshold for filtered texts
      const MIN_FILTERED_TEXTS = 3;
      
      // First, calculate relevance scores for all texts
      const topic = topicSelection.topic.toLowerCase();
      const topicWords = topic.split(/\s+/).filter((word: string) => word.length > 3);
      
      // Calculate a simple relevance score for each text
      relevantTexts.forEach(text => {
        const content = (text.content || text.content_en || '').toLowerCase();
        let score = 0;
        
        // Exact topic match gets high score
        if (content.includes(topic)) {
          score += 10;
        }
        
        // Score individual word matches
        if (topicWords.length > 0) {
          topicWords.forEach((word: string) => {
            if (content.includes(word)) {
              score += 3;
            }
          });
        }
        
        // Additional score for having topic in reference
        if (text.ref && text.ref.toLowerCase().includes(topic)) {
          score += 5;
        }
        
        // Check if any relevant score already exists (from RAG search)
        if ('relevanceScore' in text) {
          // Add the existing score to our calculation
          score += text.relevanceScore * 2;  // Give existing scores higher weight
        }
        
        // Store the calculated score
        text.relevanceScore = score;
      });
      
      // Sort all texts by relevance score
      relevantTexts.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      console.log(`[${requestId}] Sorted all texts by relevance score. Top 5 scores:`, 
        relevantTexts.slice(0, 5).map(t => ({ ref: t.ref, score: t.relevanceScore })));
      
      // Filter texts that have explicit mentions of the topic or related keywords
      const filteredTexts = relevantTexts.filter(text => {
        const content = (text.content || text.content_en || '').toLowerCase();
        
        // Check for exact topic match
        if (content.includes(topic)) {
          return true;
        }
        
        // Check for significant word matches (for multi-word topics)
        if (topicWords.length > 1) {
          const matchCount = topicWords.filter((word: string) => content.includes(word)).length;
          return matchCount >= Math.ceil(topicWords.length / 2); // At least half the words match
        }
        
        return false;
      });
      
      // If we have enough filtered texts, use them; otherwise use the highest scoring texts
      if (filteredTexts.length >= MIN_FILTERED_TEXTS) {
        console.log(`[${requestId}] Found ${filteredTexts.length} texts with explicit topic matches - using filtered set`);
        relevantTexts = filteredTexts;
      } else {
        console.log(`[${requestId}] Not enough texts with explicit topic matches (${filteredTexts.length}/${MIN_FILTERED_TEXTS} required)`);
        console.log(`[${requestId}] Using the ${MIN_FILTERED_TEXTS} texts with highest relevance scores instead`);
        
        // Take the top 3 texts by relevance score
        relevantTexts = relevantTexts.slice(0, MIN_FILTERED_TEXTS);
      }
      
      console.log(`[${requestId}] Final selected texts:`, 
        relevantTexts.map(t => ({ ref: t.ref, score: t.relevanceScore })));
    }
    
    if (relevantTexts.length === 0) {
      // Try querying for any progress from the user
      const { data: anyProgress } = await serviceClient
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .limit(5);
        
      console.log(`[${requestId}] Last resort check for ANY user progress:`, anyProgress);
      
      return NextResponse.json(
        { error: 'No relevant texts found for this topic selection' }, 
        { status: 404 }
      );
    }
    
    // Create context from the retrieved texts
    const context = relevantTexts
      .map((doc) => {
        // Check if the document has separate English and Hebrew content
        if (doc.content_en || doc.content_he) {
          // Limit the size of each piece of content
          const englishContent = doc.content_en ? 
            (doc.content_en.length > 1000 ? doc.content_en.substring(0, 1000) + "..." : doc.content_en) :
            'Not available';
          
          const hebrewContent = doc.content_he ? 
            (doc.content_he.length > 500 ? doc.content_he.substring(0, 500) + "..." : doc.content_he) :
            'Not available';
          
          return `Reference: ${doc.ref || 'Unknown'}\n` +
                 `English: ${englishContent}\n` +
                 `Hebrew: ${hebrewContent}`;
        }
        // Fallback to the standard content field, but limit its size
        const content = doc.content && doc.content.length > 1500 ? 
          doc.content.substring(0, 1500) + "..." : 
          doc.content;
        
        return `Reference: ${doc.ref || 'Unknown'}\nContent: ${content}`;
      })
      .join('\n\n');
    
    // Create prompt for quiz generation
    const questionTypesString = settings.questionTypes
      .map((type: QuestionType) => {
        switch (type) {
          case QuestionType.MultipleChoice:
            return 'Multiple Choice (with 4 options)';
          case QuestionType.TrueFalse:
            return 'True/False';
          case QuestionType.ShortAnswer:
            return 'Short Answer';
          case QuestionType.FillInBlank:
            return 'Fill in the Blank (e.g. "There are _____ main services for a korban")';
          case QuestionType.Matching:
            return 'Matching';
          default:
            return type;
        }
      })
      .join(', ');
    
    const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert in Talmud and Jewish studies creating a quiz for a Torah study app.

Based on the following texts that the user has learned, generate ${settings.questionCount} questions of ${settings.difficulty} difficulty.

The questions should be of the following types: ${questionTypesString}

${settings.includeExplanations ? 'Include explanations for each answer.' : 'Do not include explanations for the answers.'}

${settings.language === 'he' ? 'Generate the questions in Hebrew.' : 
  settings.language === 'both' ? 'Generate some questions in Hebrew and some in English.' : 
  'Generate the questions in English, with some key words transliterated or written in Hebrew if that makes it more comprehensible (e.g. general Halachic term, a Hebrew word that is expounded upon etc,).'}

${topicSelection.randomize ? 'Randomize the questions across different aspects of the texts.' : 
  'Focus the questions on the most important concepts in the texts.'}

${topicSelection.type === 'topic' && topicSelection.topic ? `SELECTED TOPIC: The user has specifically requested questions about "${topicSelection.topic}". It is important that you focus your questions ONLY on content directly related to this topic as it appears in the texts.` : ''}

TEXTS (the Hebrew is the original text, the English is just to help you understand the text):
${context}

FORMAT YOUR RESPONSE AS A JSON ARRAY OF OBJECTS with the following structure:
[
  {{
    "question": "The question text",
    "type": "multiple_choice | true_false | short_answer | fill_in_blank | matching",
    "options": ["Option A", "Option B", "Option C", "Option D"], 
    "correctAnswer": "The correct answer or option",
    "explanation": "Explanation of why this is correct",
    "relatedRef": "Reference to the text this question is based on"
  }}
]
`);
    
    // Generate questions
    const prompt = await promptTemplate.format({});

    // Generate questions based on selected model
    let responseText = '';
    if (model === 'gemini') {
      // Use Gemini model for generation
      try {
        if (!googleApiKey) {
          throw new Error('Google API key is not configured');
        }
        
        const genAI = new GoogleGenerativeAI(googleApiKey);
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        console.log(`[${requestId}] Sending prompt to Gemini model`);
        const geminiResponse = await geminiModel.generateContent(prompt);
        responseText = geminiResponse.response.text();
        console.log(`[${requestId}] Received response from Gemini model`);
      } catch (error: any) {
        console.error(`[${requestId}] Error with Gemini model:`, error);
        return NextResponse.json(
          { error: `Error generating questions with Gemini: ${error.message || 'Unknown error'}` }, 
          { status: 500 }
        );
      }
    } else {
      // Use OpenAI model for generation
      if (!llm) {
        console.error(`[${requestId}] OpenAI LLM not initialized`);
        return NextResponse.json(
          { error: 'Server configuration error: OpenAI LLM not initialized' }, 
          { status: 500 }
        );
      }
      
      const response = await llm.invoke(prompt);
      
      // Extract text content from LangChain response safely
      if (typeof response.content === 'string') {
        // Simple string content
        responseText = response.content;
      } else if (Array.isArray(response.content)) {
        // Array of content blocks, concatenate all text
        responseText = response.content
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object' && 'type' in item && item.type === 'text') {
              return 'text' in item ? String(item.text || '') : '';
            }
            return '';
          })
          .join('');
      }
    }
    
    // Parse JSON from response
    const jsonStart = responseText.indexOf('[');
    const jsonEnd = responseText.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error(`[${requestId}] Failed to find JSON array in response: ${responseText.substring(0, 200)}...`);
      return NextResponse.json(
        { error: 'Failed to generate properly formatted quiz questions' }, 
        { status: 500 }
      );
    }
    
    const jsonString = responseText.substring(jsonStart, jsonEnd);
    let questions;
    
    try {
      questions = JSON.parse(jsonString);
      
      // Validate that questions is an array
      if (!Array.isArray(questions)) {
        console.error(`[${requestId}] Parsed questions is not an array:`, questions);
        return NextResponse.json(
          { error: 'Quiz response format invalid - expected array of questions' }, 
          { status: 500 }
        );
      }
      
      // Validate that each question has required fields
      if (questions.length === 0) {
        console.error(`[${requestId}] No questions were generated`);
        return NextResponse.json(
          { error: 'No questions were generated. Please try again with a different topic.' }, 
          { status: 500 }
        );
      }
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse JSON:`, parseError, 'JSON string:', jsonString);
      return NextResponse.json(
        { error: 'Failed to parse generated questions' }, 
        { status: 500 }
      );
    }
    
    // Generate IDs for each question
    const questionsWithIds = questions.map((q: any) => ({
      ...q,
      id: crypto.randomUUID(),
    }));
    
    console.log(`[${requestId}] Successfully generated ${questionsWithIds.length} questions`);
    
    return NextResponse.json({ 
      questions: questionsWithIds,
      success: true
    });
  } catch (error: any) {
    console.error(`[${requestId}] Error generating quiz:`, error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' }, 
      { status: 500 }
    );
  }
}

// Helper function to fetch relevant texts
async function fetchRelevantTexts(userId: string, selection: QuizTopicSelection, requestId: string) {
  try {
    console.log(`[${requestId}] Fetching texts for user:`, userId);
    console.log(`[${requestId}] Selection criteria:`, selection);
    
    // If in exploration mode, fetch directly from master table
    if (selection.isExploring) {
      console.log('Exploration mode: fetching from master table');
      
      if (selection.type === 'tractate' && selection.tractate) {
        // Get 5 random amudim from the specific tractate
        return await fetchRandomAmudimFromTractate(selection.tractate, 5);
      } else if (selection.type === 'tractate' && !selection.tractate) {
        // Get 5 random amudim from any tractate
        return await fetchRandomAmudimFromAnyTractate(5);
      } else if (selection.type === 'topic' && selection.topic) {
        // In exploration mode with a topic, use RAG for semantic search on the full database
        console.log(`[${requestId}] Using RAG to fetch texts related to topic: ${selection.topic}`);
        
        try {
          // Use the RAG-based semantic search
          const topicTexts = await retrieveAmudimByTopic(
            selection.topic,
            userId,
            15, // Increased from 5 to 15 to ensure sufficient texts after filtering
            false, // Don't limit to learned content in exploration mode
            requestId
          );
          
          console.log(`[${requestId}] Found ${topicTexts.length} texts related to topic using RAG`);
          
          if (topicTexts.length > 0) {
            return topicTexts;
          }
          
          // If RAG search failed or returned no results, fall back to keyword search
          console.log(`[${requestId}] RAG search returned no results, falling back to keyword search`);
          const fallbackTexts = await fallbackRetrieveAmudimByTopic(
            selection.topic,
            userId,
            15, // Increased from 5 to 15 to ensure sufficient texts after filtering
            false, // Don't limit to learned content in exploration mode
            requestId
          );
          
          console.log(`Found ${fallbackTexts.length} texts related to topic using fallback`);
          return fallbackTexts;
        } catch (ragError) {
          console.error('Error in RAG topic search:', ragError);
          
          // Fall back to simple keyword search
          console.log('Error in RAG search, falling back to simple keyword search');
          
          // Simple keyword search in the content field
          const { data, error: keywordError } = await serviceClient
            .from('torah_texts')
            .select('*')
            .ilike('content', `%${selection.topic}%`)
            .limit(20);
            
          if (keywordError) {
            console.error('Error fetching topic-related texts:', keywordError);
            return [];
          }
          
          console.log(`Found ${data?.length || 0} texts related to topic using keyword search`);
          return data || [];
        }
      }
    }
    
    // In standard mode (not exploring), get refs from user_progress and fetch from master table
    console.log('Fetching learned texts based on user progress');
    
    // Get the list of refs the user has marked as learned where is_completed = true
    const { data: progressData, error: progressError } = await serviceClient
      .from('user_progress')
      .select('ref, is_completed')
      .eq('user_id', userId)
      .eq('is_completed', true);
    
    if (progressError) {
      console.error('Error fetching user progress:', progressError);
      return [];
    }
    
    console.log(`User has ${progressData?.length || 0} learned refs with is_completed=true`);
    
    // If no progress found, return empty
    if (!progressData || progressData.length === 0) {
      console.log('No learned texts found for this user with is_completed=true');
      return [];
    }
    
    // Extract refs from progress data
    const learnedRefs = progressData.map(p => p.ref);
    console.log('Learned refs from user_progress:', learnedRefs);
    
    if (selection.type === 'tractate' && selection.tractate) {
      // Get refs for the specific tractate the user has learned
      const tractateRefs = learnedRefs.filter(ref => ref.startsWith(`${selection.tractate}.`));
      console.log(`Found ${tractateRefs.length} learned refs for tractate ${selection.tractate}`);
      
      // Get 5 random amudim from the learned refs for this tractate
      return await fetchRandomAmudimFromUserLearnedRefs(tractateRefs, 5);
    } else if (selection.type === 'tractate' && !selection.tractate) {
      // Get 5 random amudim from all learned refs
      return await fetchRandomAmudimFromUserLearnedRefs(learnedRefs, 5);
    } else if (selection.type === 'topic' && selection.topic) {
      // For topic selection, use RAG for semantic search on user's learned content
      console.log(`[${requestId}] Using RAG to fetch learned texts related to topic: ${selection.topic}`);
      
      try {
        // Use the RAG-based semantic search on learned texts
        const topicTexts = await retrieveAmudimByTopic(
          selection.topic,
          userId,
          15, // Increased from 5 to 15 to ensure sufficient texts after filtering
          true, // Limit to learned content
          requestId
        );
        
        console.log(`[${requestId}] Found ${topicTexts.length} learned texts matching topic using RAG`);
        
        if (topicTexts.length > 0) {
          return topicTexts;
        }
        
        // If RAG search failed or returned no results, fall back to keyword search
        console.log(`[${requestId}] RAG search returned no results, falling back to keyword search`);
        const fallbackTexts = await fallbackRetrieveAmudimByTopic(
          selection.topic,
          userId,
          15, // Increased from 5 to 15 to ensure sufficient texts after filtering
          true, // Limit to learned content
          requestId
        );
        
        console.log(`[${requestId}] Found ${fallbackTexts.length} learned texts matching topic using fallback`);
        
        if (fallbackTexts.length > 0) {
          return fallbackTexts;
        }
        
        // If both searches failed to find topic-specific content, return random learned texts
        console.log('No topic matches found, returning random learned texts');
        return await fetchRandomAmudimFromUserLearnedRefs(learnedRefs, 5);
      } catch (ragError) {
        console.error('Error in RAG topic search:', ragError);
        
        // Fall back to old implementation with keyword search
        console.log('Error in RAG search, falling back to simple keyword search');
        
        // Get all learned texts
        const { data: learnedTexts, error: learnedTextsError } = await serviceClient
          .from('torah_texts')
          .select('*')
          .in('ref', learnedRefs);
          
        if (learnedTextsError) {
          console.error('Error fetching learned texts:', learnedTextsError);
          return [];
        }
        
        // Filter texts by topic keyword
        const topicTexts = learnedTexts.filter(text => 
          text.content.toLowerCase().includes(selection.topic!.toLowerCase())
        );
        
        console.log(`Found ${topicTexts.length} learned texts matching topic with keyword filter`);
        
        if (topicTexts.length > 0) {
          // Take up to 20 texts that match the topic
          return topicTexts.slice(0, 20);
        } else {
          // If no topic matches found, just return 5 random learned texts
          console.log('No topic matches found, returning random learned texts');
          return await fetchRandomAmudimFromUserLearnedRefs(learnedRefs, 5);
        }
      }
    }
    
    // Default case - just return some random learned texts
    return await fetchRandomAmudimFromUserLearnedRefs(learnedRefs, 5);
  } catch (error) {
    console.error('Error fetching relevant texts:', error);
    return [];
  }
}

// Helper function to fetch random amudim from a specific tractate
async function fetchRandomAmudimFromTractate(tractate: string, count: number): Promise<TorahText[]> {
  console.log(`Fetching ${count} random amudim from tractate: ${tractate}`);
  
  try {
    // First, get all available amudim for this tractate
    const { data, error } = await serviceClient
      .from('torah_texts')
      .select('section')
      .eq('book', tractate)
      .eq('language', 'en')  // Only get English sections for consistency
      .order('section');
      
    if (error) {
      console.error(`Error fetching sections for tractate ${tractate}:`, error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log(`No sections found for tractate ${tractate}`);
      return [];
    }
    
    // Get unique sections
    const uniqueSections = Array.from(new Set(data.map(item => item.section)));
    console.log(`Found ${uniqueSections.length} unique sections in tractate ${tractate}`);
    
    // Select random sections
    const selectedSections = selectRandomItems(uniqueSections, Math.min(count, uniqueSections.length));
    console.log('Selected sections:', selectedSections);
    
    // Fetch English texts for those sections
    const { data: enTexts, error: textsError } = await serviceClient
      .from('torah_texts')
      .select('*')
      .eq('book', tractate)
      .eq('language', 'en')
      .in('section', selectedSections);
      
    if (textsError) {
      console.error('Error fetching texts for selected sections:', textsError);
      return [];
    }
    
    if (!enTexts || enTexts.length === 0) {
      console.log('No English texts found for selected sections');
      return [];
    }
    
    // Get the refs from the English texts
    const refs = enTexts.map(text => text.ref);
    console.log(`Found ${refs.length} English refs for selected sections`);
    
    // Fetch bilingual pairs
    const bilingualTexts = await fetchBilingualAmudim(serviceClient, refs);
    
    console.log(`Retrieved ${bilingualTexts.length} bilingual texts for selected amudim`);
    return bilingualTexts;
  } catch (error) {
    console.error('Error in fetchRandomAmudimFromTractate:', error);
    return [];
  }
}

// Helper function to fetch random amudim from any tractate
async function fetchRandomAmudimFromAnyTractate(count: number): Promise<TorahText[]> {
  console.log(`Fetching ${count} random amudim from any tractate`);
  
  try {
    // First, get all available tractates
    const { data, error } = await serviceClient
      .from('torah_texts')
      .select('book')
      .order('book');
      
    if (error) {
      console.error('Error fetching tractates:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No tractates found');
      return [];
    }
    
    // Get unique tractates
    const uniqueTractates = Array.from(new Set(data.map(item => item.book)));
    console.log(`Found ${uniqueTractates.length} unique tractates`);
    
    // Select random tractates (we'll pick a few to ensure diversity)
    const selectedTractates = selectRandomItems(uniqueTractates, Math.min(3, uniqueTractates.length));
    console.log('Selected tractates:', selectedTractates);
    
    // For each selected tractate, fetch a few random amudim
    const amudimPerTractate = Math.ceil(count / selectedTractates.length);
    let allTexts: any[] = [];
    
    for (const tractate of selectedTractates) {
      const tractateTexts = await fetchRandomAmudimFromTractate(tractate, amudimPerTractate);
      allTexts = allTexts.concat(tractateTexts);
    }
    
    // Limit to the requested count if we got more
    if (allTexts.length > count) {
      allTexts = selectRandomItems(allTexts, count);
    }
    
    console.log(`Retrieved ${allTexts.length} total texts for random amudim`);
    return allTexts;
  } catch (error) {
    console.error('Error in fetchRandomAmudimFromAnyTractate:', error);
    return [];
  }
}

// Helper function to fetch random amudim from user's learned refs
async function fetchRandomAmudimFromUserLearnedRefs(learnedRefs: string[], count: number): Promise<TorahText[]> {
  console.log(`Fetching ${count} random amudim from ${learnedRefs.length} learned refs`);
  
  try {
    if (learnedRefs.length === 0) {
      return [];
    }
    
    // If we have fewer learned refs than requested count, use all of them
    let selectedRefs = learnedRefs;
    if (learnedRefs.length > count) {
      selectedRefs = selectRandomItems(learnedRefs, count);
    }
    
    console.log('Selected refs:', selectedRefs);
    
    // First, fetch the English versions for these refs
    const { data: enTexts, error: enError } = await serviceClient
      .from('torah_texts')
      .select('*')
      .in('ref', selectedRefs)
      .eq('language', 'en');
      
    if (enError) {
      console.error('Error fetching English texts for selected refs:', enError);
      return [];
    }
    
    if (!enTexts || enTexts.length === 0) {
      console.log('No English texts found for selected refs');
      return [];
    }
    
    // Extract refs from the English texts we found
    const foundRefs = enTexts.map(text => text.ref);
    
    // Use fetchBilingualAmudim to get paired texts
    const bilingualTexts = await fetchBilingualAmudim(serviceClient, foundRefs);
    
    console.log(`Retrieved ${bilingualTexts.length} bilingual texts for selected learned refs`);
    return bilingualTexts;
  } catch (error) {
    console.error('Error in fetchRandomAmudimFromUserLearnedRefs:', error);
    return [];
  }
}

// Helper function to select random items from an array
function selectRandomItems<T>(array: T[], count: number): T[] {
  if (array.length <= count) {
    return [...array]; // Return a copy of the original array
  }
  
  const result: T[] = [];
  const copyArray = [...array]; // Create a copy to avoid modifying the original
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * copyArray.length);
    result.push(copyArray[randomIndex]);
    copyArray.splice(randomIndex, 1); // Remove the selected item to avoid duplicates
  }
  
  return result;
} 