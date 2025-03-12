'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import QuizNavigation from '@/components/QuizNavigation';
import { QuizQuestion, QuestionType } from '@/lib/types';
import QuizDownloadButton from '@/components/QuizDownloadButton';

interface ReviewPageProps {
  params: {
    id: string;
  };
}

interface QuizSession {
  id: string;
  user_id: string;
  created_at: string;
  completed_at?: string;
  score?: number;
  difficulty: string;
  questions: QuizQuestion[];
  user_answers: Record<string, string>;
  completed: boolean;
}

export default function QuizReviewPage({ params }: ReviewPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [showExplanations, setShowExplanations] = useState(true);

  useEffect(() => {
    const fetchQuizSession = async () => {
      try {
        setLoading(true);
        
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) throw authError;
        
        if (!session || !session.user) {
          router.push('/login');
          return;
        }
        
        // Fetch the quiz session
        const { data, error: fetchError } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('id', params.id)
          .eq('user_id', session.user.id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching quiz session:', fetchError);
          throw new Error('Could not find the requested quiz. It may have been deleted or you may not have permission to view it.');
        }
        
        if (!data) {
          throw new Error('Quiz not found');
        }
        
        // Convert to QuizSession type
        setQuizSession(data as QuizSession);
        setLoading(false);
      } catch (err) {
        console.error('Error initializing quiz review:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };
    
    fetchQuizSession();
  }, [params.id, router]);
  
  // Helper function to format the question type for display
  const formatQuestionType = (type: string) => {
    switch (type) {
      case QuestionType.MultipleChoice:
        return 'Multiple Choice';
      case QuestionType.TrueFalse:
        return 'True/False';
      case QuestionType.ShortAnswer:
        return 'Short Answer';
      case QuestionType.FillInBlank:
        return 'Fill in the Blank';
      case QuestionType.Matching:
        return 'Matching';
      default:
        return type;
    }
  };
  
  // Helper function to determine if the user answered correctly
  const isCorrect = (question: QuizQuestion) => {
    if (!quizSession?.user_answers) return false;
    return quizSession.user_answers[question.id] === question.correctAnswer;
  };
  
  // Helper function to get the user's answer
  const getUserAnswer = (question: QuizQuestion) => {
    if (!quizSession?.user_answers) return '';
    return quizSession.user_answers[question.id] || '';
  };
  
  // Toggle showing explanations
  const toggleExplanations = () => {
    setShowExplanations(!showExplanations);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-500/30 animate-ping"></div>
            </div>
            <div className="text-gray-300">Loading quiz review...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 text-center">
          <div className="flex items-center justify-center text-red-400 mb-4">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Error</span>
          </div>
          <p className="text-gray-300 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/dashboard/quiz/history')}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors"
          >
            View Quiz History
          </button>
        </div>
      </div>
    );
  }

  if (!quizSession) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 text-center">
          <p className="text-gray-300 mb-4">Quiz not found</p>
          <button 
            onClick={() => router.push('/dashboard/quiz/history')}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors"
          >
            View Quiz History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <QuizNavigation />
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <div className="flex flex-wrap items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            Quiz Review
          </h1>
          
          <div className="flex items-center mt-2 md:mt-0">
            <div className="mr-6">
              <span className="text-gray-300 mr-2">Score:</span>
              <span className="text-white font-semibold">
                {quizSession.score || 0} / {quizSession.questions.length}
                {" "}
                ({Math.round(((quizSession.score || 0) / quizSession.questions.length) * 100)}%)
              </span>
            </div>
            
            <button 
              onClick={toggleExplanations}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 border border-gray-600 transition-colors"
              aria-label="Toggle explanation visibility"
            >
              {showExplanations ? 'Hide Explanations' : 'Show Explanations'}
            </button>
          </div>
        </div>
        
        <div className="space-y-8">
          {quizSession.questions.map((question, index) => (
            <div 
              key={question.id} 
              className={`p-6 rounded-lg border ${
                isCorrect(question) 
                  ? 'bg-green-900/20 border-green-700/30' 
                  : 'bg-red-900/20 border-red-700/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-medium text-white flex-1">
                  {index + 1}. {question.question}
                </h3>
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                  {formatQuestionType(question.type)}
                </span>
              </div>
              
              {question.options && (
                <div className="ml-4 mb-4">
                  {question.options.map((option, optIndex) => (
                    <div 
                      key={optIndex}
                      className={`flex items-center py-1 ${
                        option === question.correctAnswer ? 'text-green-400' : 
                        (option === getUserAnswer(question) && option !== question.correctAnswer) ? 'text-red-400' :
                        'text-gray-300'
                      }`}
                    >
                      <div className="mr-3">
                        {option === question.correctAnswer && (
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path>
                          </svg>
                        )}
                        {option === getUserAnswer(question) && option !== question.correctAnswer && (
                          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"></path>
                          </svg>
                        )}
                        {option !== question.correctAnswer && option !== getUserAnswer(question) && (
                          <div className="w-5 h-5"></div>
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {!question.options && (
                <div className="mb-4">
                  <div className="flex flex-col ml-4">
                    <div className="mb-2">
                      <span className="text-gray-400 mr-2">Correct answer:</span>
                      <span className="text-green-400 font-medium">{question.correctAnswer}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 mr-2">Your answer:</span>
                      <span className={`font-medium ${isCorrect(question) ? 'text-green-400' : 'text-red-400'}`}>
                        {getUserAnswer(question) || '(No answer provided)'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {showExplanations && question.explanation && (
                <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Explanation:</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-line">{question.explanation}</p>
                </div>
              )}
              
              {question.relatedRef && (
                <div className="mt-3 text-xs text-gray-400">
                  Reference: {question.relatedRef}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => router.push('/dashboard/quiz')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors"
          >
            Take Another Quiz
          </button>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4 text-center">Download This Quiz</h3>
          <div className="max-w-3xl mx-auto">
            <QuizDownloadButton 
              quizTitle={`Gemara Quiz - ${new Date(quizSession.created_at).toLocaleDateString()}`}
              questions={quizSession.questions}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 