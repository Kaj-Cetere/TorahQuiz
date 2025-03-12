import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function QuizNavigation() {
  const pathname = usePathname();
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-blue-400 transition-colors">
          Dashboard
        </Link>
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
        <span className="text-blue-400">Quiz</span>
      </div>
      
      <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-4">
        Torah Quiz
      </h1>
      
      <p className="text-gray-400 max-w-3xl mb-6">
        Test your knowledge with personalized quizzes based on the Torah texts you've studied.
      </p>
      
      <div className="flex flex-wrap gap-3 mb-6">
        <Link 
          href="/dashboard/quiz"
          className={`px-4 py-2 rounded-lg ${
            pathname === '/dashboard/quiz' 
              ? 'bg-indigo-500/20 text-blue-300 border border-indigo-500/50' 
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          Create Quiz
        </Link>
        
        <Link 
          href="/dashboard/quiz/history"
          className={`px-4 py-2 rounded-lg ${
            pathname === '/dashboard/quiz/history' 
              ? 'bg-indigo-500/20 text-blue-300 border border-indigo-500/50' 
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          Quiz History
        </Link>
        
        <Link 
          href="/dashboard/learning"
          className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
        >
          Back to Learning
        </Link>
      </div>
    </div>
  );
} 