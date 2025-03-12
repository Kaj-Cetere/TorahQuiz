'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { generateQuiz, saveQuizSession } from '@/lib/utils/quiz-generator';
import { QuizSettings, QuizTopicSelection, QuizQuestion, QuestionType } from '@/lib/types';
import QuizNavigation from '@/components/QuizNavigation';

export default function GenerateQuizPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [topicSelection, setTopicSelection] = useState<QuizTopicSelection | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check authentication and load quiz preferences
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) throw authError;
        
        if (!session || !session.user) {
          router.push('/login');
          return;
        }
        
        setUserId(session.user.id);
        
        // Load quiz preferences from localStorage
        const settingsJson = localStorage.getItem('quizSettings');
        const topicJson = localStorage.getItem('quizTopicSelection');
        
        if (!settingsJson || !topicJson) {
          router.push('/dashboard/quiz');
          return;
        }
        
        const settings = JSON.parse(settingsJson) as QuizSettings;
        const topic = JSON.parse(topicJson) as QuizTopicSelection;
        
        setQuizSettings(settings);
        setTopicSelection(topic);
        
        // Set timer if time limit is specified
        if (settings.timeLimit) {
          setTimeLeft(settings.timeLimit * 60); // Convert to seconds
        }
        
        setLoading(false);
        
        // Generate quiz
        generateQuizQuestions(session.user.id, settings, topic);
      } catch (err) {
        console.error('Error initializing quiz:', err);
        setError('Failed to initialize quiz. Please try again.');
        setLoading(false);
      }
    };
    
    checkAuth();
    
    // Cleanup timer on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [router]);

  // Start timer if time limit is set
  useEffect(() => {
    if (timeLeft === null || loading || generating) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto-submit if time expires
          if (!quizCompleted) {
            handleQuizSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
    
    return () => clearInterval(interval);
  }, [timeLeft, loading, generating]);

  // Generate quiz questions
  const generateQuizQuestions = async (
    uid: string,
    settings: QuizSettings,
    topic: QuizTopicSelection
  ) => {
    try {
      setGenerating(true);
      setError(null);
      
      const generatedQuestions = await generateQuiz(uid, settings, topic);
      
      // Additional validation to make sure generatedQuestions is an array
      if (!generatedQuestions || !Array.isArray(generatedQuestions)) {
        throw new Error('Invalid response format - expected an array of questions');
      }
      
      if (generatedQuestions.length === 0) {
        throw new Error('No questions were generated. Please try with a different topic.');
      }
      
      setQuestions(generatedQuestions);
      setGenerating(false);
      
      // Initialize user answers
      const initialAnswers: Record<string, string> = {};
      generatedQuestions.forEach((q) => {
        initialAnswers[q.id] = '';
      });
      setUserAnswers(initialAnswers);
    } catch (err: any) {
      console.error('Error generating quiz:', err);
      setError(`Failed to generate quiz: ${err.message}`);
      setGenerating(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Navigate to next question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    }
  };

  // Navigate to previous question
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowExplanation(false);
    }
  };

  // This function will no longer be used during the quiz, but will be kept for the review page
  const handleToggleExplanation = () => {
    // Only allow toggling explanations after quiz completion
    if (quizCompleted) {
      setShowExplanation(!showExplanation);
    }
  };

  // Submit the completed quiz
  const handleQuizSubmit = async () => {
    try {
      setError(null); // Clear any previous errors
      
      if (!userId || !quizSettings || questions.length === 0) {
        setError('Cannot submit quiz: Missing required data');
        return;
      }
      
      // Show submitting state
      setIsSubmitting(true);
      
      console.log('Starting quiz submission process...');
      
      // First, refresh the auth token to ensure we have a valid session
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Failed to refresh auth session:', refreshError);
        setError(`Authentication error: Could not refresh your session (${refreshError.message}). Please log in again.`);
        setIsSubmitting(false);
        return;
      }
      
      // Get the current session to verify we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session after refresh');
        setError('Authentication error: No active session found. Please log in again.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Session verified, user authenticated as:', session.user.id);
      
      // Force use the session user ID for all operations
      const authenticatedUserId = session.user.id;
      
      // Confirm the user ID matches the authenticated user
      if (authenticatedUserId !== userId) {
        console.warn('User ID mismatch:', { sessionUserId: authenticatedUserId, currentUserId: userId });
        
        // Always use the authenticated ID
        console.log('Using authenticated user ID for submission:', authenticatedUserId);
      }
      
      // Stop timer if running
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Calculate score
      let score = 0;
      questions.forEach((question) => {
        if (userAnswers[question.id] === question.correctAnswer) {
          score += 1;
        }
      });
      
      console.log('Submitting quiz with score:', score, 'out of', questions.length);
      
      // Save sessionId from response for redirect to review page
      let quizSessionId: string = self.crypto.randomUUID(); // Default ID that will be overwritten if API returns one
      
      // Use the authenticated user ID from the session for saving
      try {
        const result = await saveQuizSession(
          authenticatedUserId, 
          questions, 
          quizSettings,
          userAnswers // Pass user answers for review
        );
        console.log('Quiz saved successfully', result);
        if (result && result.id) {
          quizSessionId = result.id;
        } else if (result && typeof result === 'object') {
          // Try to extract ID from different response formats
          quizSessionId = result.data?.id || quizSessionId;
        }
      } catch (saveError) {
        console.error('Error in saveQuizSession:', saveError);
        
        // Try an alternative direct approach if the helper function fails
        if (saveError instanceof Error && saveError.message.includes('Authentication error')) {
          console.log('Attempting direct insert as fallback...');
          
          // Keep the full content without trimming explanations or content
          const processedQuestions = questions.map(q => ({
            id: q.id,
            question: q.question,
            type: q.type,
            options: q.options,
            correctAnswer: q.correctAnswer,
            relatedRef: q.relatedRef,
            explanation: q.explanation // Keep the full explanation
          }));
          
          // Calculate the score
          const calculatedScore = Object.keys(userAnswers).reduce((total, questionId) => {
            const question = questions.find(q => q.id === questionId);
            if (question && userAnswers[questionId] === question.correctAnswer) {
              return total + 1;
            }
            return total;
          }, 0);
          
          const sessionId = self.crypto.randomUUID();
          quizSessionId = sessionId;
          
          const { data, error: directError } = await supabase
            .from('quiz_sessions')
            .insert({
              id: sessionId,
              user_id: authenticatedUserId,
              created_at: new Date().toISOString(),
              questions: processedQuestions,
              user_answers: userAnswers,
              score: calculatedScore,
              difficulty: quizSettings.difficulty,
              completed: true
            });
            
          if (directError) {
            console.error('Direct insert also failed:', directError);
            throw new Error(`Failed to save quiz: ${directError.message}`);
          }
          
          console.log('Quiz saved successfully using direct insert');
        } else {
          // Re-throw if it's not an authentication error
          throw saveError;
        }
      }
      
      // Mark quiz as completed
      setQuizCompleted(true);
      setIsSubmitting(false);
      
      // Store score and session ID in localStorage for results page
      localStorage.setItem('quizScore', JSON.stringify({
        score,
        total: questions.length,
        percentage: Math.round((score / questions.length) * 100),
        sessionId: quizSessionId, // Include session ID for review access
        questions: questions, // Include questions for PDF generation
        title: `Gemara Quiz - ${new Date().toLocaleDateString()}` // Include title for PDF generation
      }));
      
      // Navigate to results page after a short delay
      setTimeout(() => {
        router.push('/dashboard/quiz/results');
      }, 1000);
    } catch (err) {
      setIsSubmitting(false);
      
      // More detailed error handling
      let errorMessage = 'Failed to submit quiz. Please try again.';
      
      if (err instanceof Error) {
        console.error('Error submitting quiz:', err.message);
        
        // Show a helpful message for RLS policy violations
        if (err.message.includes('row-level security policy')) {
          errorMessage = 'Authentication error: You don\'t have permission to save this quiz. Please refresh the page and try again.';
        } else {
          // Show a more specific error if available
          errorMessage = `Submission error: ${err.message}`;
        }
      } else {
        console.error('Unknown error submitting quiz:', err);
      }
      
      setError(errorMessage);
    }
  };

  // Format time left as mm:ss
  const formatTimeLeft = () => {
    if (timeLeft === null) return '';
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading || generating) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="flex justify-center items-center min-h-[60vh] flex-col">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-16 w-16 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-blue-500/30 animate-ping"></div>
            </div>
            <div className="text-gray-300 text-lg">
              {generating ? 'Generating your personalized quiz...' : 'Loading...'}
            </div>
            {generating && (
              <div className="text-gray-400 mt-2 text-sm max-w-md text-center">
                This may take a minute as we analyze your learned texts and create tailored questions.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
          <div className="flex items-start text-red-400">
            <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h3 className="font-medium">Error</h3>
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => router.push('/dashboard/quiz')}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 border border-gray-600 transition-colors"
              >
                Back to Quiz Setup
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 text-center">
          <p className="text-gray-300 mb-4">No questions could be generated. Try a different topic or settings.</p>
          <button
            onClick={() => router.push('/dashboard/quiz')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 border border-gray-600 transition-colors"
          >
            Back to Quiz Setup
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="container mx-auto px-4 py-8">
      <QuizNavigation />
      
      {/* Header with progress and timer */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-lg font-medium text-gray-300">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        
        {timeLeft !== null && (
          <div className={`text-lg font-medium ${
            timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-gray-300'
          }`}>
            Time: {formatTimeLeft()}
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full mb-6 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>
      
      {/* Question card */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 mb-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-6">
          {currentQuestion.question}
        </h2>
        
        {/* Multiple choice options */}
        {currentQuestion.type === QuestionType.MultipleChoice && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                className={`w-full py-3 px-4 rounded-lg border text-left ${
                  userAnswers[currentQuestion.id] === option
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300' 
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        
        {/* True/False options */}
        {currentQuestion.type === QuestionType.TrueFalse && (
          <div className="grid grid-cols-2 gap-4">
            {['True', 'False'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                className={`py-3 px-4 rounded-lg border ${
                  userAnswers[currentQuestion.id] === option
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300' 
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
        
        {/* Short answer input */}
        {currentQuestion.type === QuestionType.ShortAnswer && (
          <div>
            <input
              type="text"
              value={userAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg p-3 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your answer"
            />
          </div>
        )}
        
        {/* Fill in the blank input */}
        {currentQuestion.type === QuestionType.FillInBlank && (
          <div>
            <input
              type="text"
              value={userAnswers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg p-3 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Fill in the blank"
            />
          </div>
        )}
        
        {/* Explanation (if available and toggled) - Only show after quiz is completed */}
        {quizCompleted && showExplanation && currentQuestion.explanation && (
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h3 className="font-medium text-blue-300 mb-2">Explanation:</h3>
            <p className="text-gray-300">{currentQuestion.explanation}</p>
            
            <div className="mt-3 pt-3 border-t border-gray-600">
              <p className="text-gray-400 text-sm">
                <span className="font-medium">Source:</span> {currentQuestion.relatedRef}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation and action buttons */}
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex space-x-3 mb-4 sm:mb-0">
          <button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 border border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Previous
          </button>
        </div>
        
        <div>
          {currentQuestionIndex < questions.length - 1 ? (
            <button
              onClick={handleNextQuestion}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors flex items-center"
            >
              Next
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          ) : (
            <button
              onClick={handleQuizSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg text-white font-medium shadow-lg border border-green-500/10 transition-colors disabled:opacity-70 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Submitting...
                </>
              ) : (
                'Submit Quiz'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 