'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QuizNavigation from '@/components/QuizNavigation';
import QuizDownloadButton from '@/components/QuizDownloadButton';
import { QuizQuestion } from '@/lib/types';

interface QuizScore {
  score: number;
  total: number;
  percentage: number;
  sessionId?: string; // Add sessionId for accessing the detailed review
  questions?: QuizQuestion[]; // Add questions for PDF generation
  title?: string; // Add title for PDF generation
}

export default function QuizResultsPage() {
  const router = useRouter();
  const [score, setScore] = useState<QuizScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load score from localStorage
    const scoreJson = localStorage.getItem('quizScore');
    
    if (!scoreJson) {
      router.push('/dashboard/quiz');
      return;
    }
    
    try {
      const parsedScore = JSON.parse(scoreJson) as QuizScore;
      console.log('Quiz score data from localStorage:', parsedScore);
      setScore(parsedScore);
    } catch (error) {
      console.error('Error parsing quiz score:', error);
    }
    
    setLoading(false);
  }, [router]);

  // Handle clicking the Review button
  const handleReviewClick = () => {
    if (score?.sessionId) {
      console.log('Navigating to review page with sessionId:', score.sessionId);
      router.push(`/dashboard/quiz/review/${score.sessionId}`);
    } else {
      console.log('No sessionId found, redirecting to history');
      // If no session ID, redirect to history where they can select a quiz
      router.push('/dashboard/quiz/history');
    }
  };

  // Get feedback based on score percentage
  const getFeedback = () => {
    if (!score) return '';
    
    if (score.percentage >= 90) {
      return 'Outstanding! Your Torah knowledge is exceptional.';
    } else if (score.percentage >= 80) {
      return 'Excellent! You have a strong understanding of the material.';
    } else if (score.percentage >= 70) {
      return 'Very good! You know the material well.';
    } else if (score.percentage >= 60) {
      return 'Good! Your knowledge is solid, but there\'s room for improvement.';
    } else if (score.percentage >= 50) {
      return 'Not bad. Consider reviewing this material again to strengthen your understanding.';
    } else {
      return 'This topic needs more review. Keep studying and try again soon!';
    }
  };

  // Get emoji based on score percentage
  const getEmoji = () => {
    if (!score) return '🤔';
    
    if (score.percentage >= 90) return '🎯';
    if (score.percentage >= 80) return '🌟';
    if (score.percentage >= 70) return '👍';
    if (score.percentage >= 60) return '😊';
    if (score.percentage >= 50) return '🙂';
    return '📚';
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
            <div className="text-gray-300">Loading results...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="container mx-auto px-4 py-8">
        <QuizNavigation />
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 text-center">
          <p className="text-gray-300 mb-4">No quiz results found. Try taking a quiz first.</p>
          <Link href="/dashboard/quiz">
            <span className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors inline-block">
              Take a Quiz
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <QuizNavigation />
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-8 border border-gray-700">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-8">
          Quiz Results
        </h1>
        
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Score circle */}
            <div className="w-48 h-48 rounded-full bg-gray-700 border-8 border-indigo-500/30 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-white">{score.percentage}%</div>
                <div className="text-gray-300 mt-1">Score</div>
              </div>
            </div>
            
            {/* Emoji */}
            <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center text-3xl">
              {getEmoji()}
            </div>
          </div>
        </div>
        
        <div className="text-center mb-8">
          <p className="text-xl text-white mb-2">
            You scored {score.score} out of {score.total}
          </p>
          <p className="text-gray-300">
            {getFeedback()}
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/dashboard/quiz">
            <span className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors inline-block">
              Take Another Quiz
            </span>
          </Link>
          
          <button
            onClick={handleReviewClick}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium shadow-lg border border-purple-500/10 transition-colors inline-block"
          >
            Review Questions
          </button>
          
          <Link href="/dashboard/learning">
            <span className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 border border-gray-600 transition-colors inline-block">
              Continue Learning
            </span>
          </Link>
        </div>
        
        {/* Add Quiz Download Button if questions are available */}
        {score?.questions && score.questions.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4 text-center">Download This Quiz</h3>
            <div className="max-w-3xl mx-auto">
              <QuizDownloadButton 
                quizTitle={score.title || 'Gemara Quiz'}
                questions={score.questions}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 