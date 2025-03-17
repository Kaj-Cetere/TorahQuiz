import { ChatOpenAI } from '@langchain/openai';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';
import { QuizSettings, QuizTopicSelection, QuizQuestion, QuestionType } from '@/lib/types';
import { PromptTemplate } from '@langchain/core/prompts';
import { Document } from '@langchain/core/documents';
import { retrieveUserTexts } from './retrieval';
import { supabase } from '@/lib/supabase/client';

// For LangChain Supabase vector store, we still need direct client
// because the LangChain integration requires a specific client format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const vectorStoreClient = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI API
const initializeOpenAI = () => {
  // Use NEXT_PUBLIC_ prefix for client-side environment variables
  const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('Missing OpenAI API key. Make sure to add NEXT_PUBLIC_OPENAI_API_KEY to your .env.local file');
  }
  
  return new ChatOpenAI({
    openAIApiKey: openaiKey,
    modelName: 'gpt-4o-mini',
    temperature: 0.3,
  });
};

// Construct filter for query based on topic selection
const constructFilter = (selection: QuizTopicSelection) => {
  const filter: any = {};
  
  if (selection.type === 'tractate' && selection.tractate) {
    filter.book = selection.tractate;
  } else if (selection.type === 'daf' && selection.tractate && selection.daf) {
    filter.book = selection.tractate;
    filter.section = selection.daf;
  }
  
  return filter;
};

// Function to retrieve relevant texts based on topic selection
async function retrieveRelevantTexts(
  userId: string,
  selection: QuizTopicSelection
): Promise<Document[]> {
  try {
    const filter = constructFilter(selection);
    
    if (selection.type === 'topic' && selection.topic) {
      // For conceptual topics, use semantic search
      return await retrieveUserTexts(userId, selection.topic, 10);
    } else {
      // For tractate or daf selections, use filtered search
      return await retrieveUserTexts(userId, '', 20, filter);
    }
  } catch (error) {
    console.error('Error retrieving texts:', error);
    throw error;
  }
}

// We add debouncing to prevent duplicate calls
let lastRequestTimestamp = 0;
// Cache for previous requests with exact same parameters
const requestCache = new Map<string, {timestamp: number, result: Promise<any>}>();

export async function generateQuiz(
  userId: string,
  settings: QuizSettings,
  topicSelection: QuizTopicSelection,
  model: 'openai' | 'gemini' = 'gemini'  // Changed default from 'openai' to 'gemini'
): Promise<QuizQuestion[]> {
  try {
    // Create a cache key based on the request parameters
    const cacheKey = JSON.stringify({ userId, settings, topicSelection, model });
    
    // Check if we've made this exact request recently and return the cached result
    const now = Date.now();
    const cachedRequest = requestCache.get(cacheKey);
    if (cachedRequest && now - cachedRequest.timestamp < 10000) {
      console.log('Using cached result for identical quiz generation request');
      return cachedRequest.result;
    }
    
    // Simple global debounce mechanism to prevent rapid consecutive calls
    if (now - lastRequestTimestamp < 2000) {
      console.log('Debouncing quiz generation request, waiting 2 seconds');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    lastRequestTimestamp = Date.now();
    
    // Create a promise for the request
    const resultPromise = (async () => {
      // Use Next.js API route for server-side processing
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          settings,
          topicSelection,
          model,  // Pass the model parameter to the API
        }),
      });
    
      if (!response.ok) {
        let errorText = 'Failed to generate quiz';
        try {
          const errorData = await response.json();
          errorText = errorData.error || errorText;
        } catch (e) {
          // If we can't parse the error JSON, use the default message
        }
        console.error('Quiz generation failed:', errorText);
        throw new Error(errorText);
      }
      
      const data = await response.json();
      
      // Ensure we have questions and they're in the right format
      if (!data || !data.questions || !Array.isArray(data.questions)) {
        console.error('Invalid response format:', data);
        throw new Error('Server returned invalid quiz data format');
      }
      
      return data.questions; // Return the questions array, not the whole response
    })();
    
    // Store the promise in the cache
    requestCache.set(cacheKey, { timestamp: now, result: resultPromise });
    
    // Clean up old cache entries
    for (const [key, entry] of requestCache.entries()) {
      if (now - entry.timestamp > 30000) { // Remove entries older than 30 seconds
        requestCache.delete(key);
      }
    }
    
    return resultPromise;
  } catch (error) {
    console.error('Error in generateQuiz:', error);
    throw error;
  }
}

// Save a quiz session to the database
export async function saveQuizSession(
  userId: string,
  questions: QuizQuestion[],
  settings: QuizSettings,
  userAnswers?: Record<string, string>
) {
  try {
    // Use the complete questions without trimming content
    // This preserves all explanations and text at full length
    const processedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      relatedRef: q.relatedRef,
      explanation: q.explanation // Keep the full explanation
    }));
    
    console.log('Saving quiz session for user:', userId);
    console.log('Question count:', processedQuestions.length);
    
    // First verify we have a valid session
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Authentication error when saving quiz:', authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }
    
    if (!authData.user) {
      console.error('No authenticated user found when saving quiz');
      throw new Error('Authentication error: No authenticated user found');
    }
    
    // For security, always use the authenticated user's ID, not the passed-in ID
    const authenticatedUserId = authData.user.id;
    
    if (authenticatedUserId !== userId) {
      console.warn('User ID mismatch in saveQuizSession:', { 
        providedId: userId, 
        authUserId: authenticatedUserId 
      });
      console.log('Using authenticated user ID for database operations');
      // Use the authenticated user's ID
      userId = authenticatedUserId;
    }
    
    // Create a unique ID for the quiz session
    const sessionId = self.crypto.randomUUID();
    
    // Calculate score if we have user answers
    let score = null;
    if (userAnswers) {
      score = Object.keys(userAnswers).reduce((total, questionId) => {
        const question = questions.find(q => q.id === questionId);
        if (question && userAnswers[questionId] === question.correctAnswer) {
          return total + 1;
        }
        return total;
      }, 0);
    }
    
    // Try upsert with explicit ID to avoid potential RLS issues
    const { data, error } = await supabase
      .from('quiz_sessions')
      .upsert({
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        questions: processedQuestions,
        user_answers: userAnswers || {},
        score: score,
        difficulty: settings.difficulty,
        completed: userAnswers ? true : false // Mark as completed if user answers are provided
      });
      
    if (error) {
      console.error('Database error when saving quiz:', error);
      
      // If there's an RLS error, try a different approach with a custom endpoint
      if (error.message.includes('policy')) {
        console.log('RLS policy error, trying alternative approach...');
        
        // Try direct insert with the service client (through API endpoint)
        const apiResponse = await fetch('/api/save-quiz-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            userId,
            questions: processedQuestions,
            userAnswers: userAnswers || {},
            score: score,
            settings,
            completed: userAnswers ? true : false
          }),
        });
        
        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(`API error: ${errorData.error || 'Unknown error'}`);
        }
        
        const apiData = await apiResponse.json();
        console.log('Quiz saved successfully using API endpoint');
        return { id: sessionId, data: apiData };
      }
      
      throw new Error(`Failed to save quiz: ${error.message}`);
    }
    
    console.log('Quiz session saved successfully');
    return { id: sessionId, data };
  } catch (error) {
    console.error('Error saving quiz session:', error);
    // Re-throw with a more specific message
    if (error instanceof Error) {
      throw new Error(`Quiz saving failed: ${error.message}`);
    } else {
      throw new Error('Quiz saving failed due to an unknown error');
    }
  }
} 