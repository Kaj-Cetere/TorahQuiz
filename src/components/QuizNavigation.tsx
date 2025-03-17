import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function QuizNavigation() {
  const pathname = usePathname();
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-gray-300 hover:text-blue-400 transition-colors">
          Dashboard
        </Link>
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
        <span className="text-blue-400">Quiz</span>
      </div>
      
      <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-500 mb-4">
        Torah Quizician
      </h1>
      
      <p className="text-gray-300 max-w-3xl mb-8 text-lg leading-relaxed">
        Test your knowledge with personalized quizzes based on the Torah texts you've studied.
      </p>
      
      <div className="flex flex-wrap gap-3 mb-6">
        <Link 
          href="/dashboard/quiz"
          className={`px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm ${
            pathname === '/dashboard/quiz' 
              ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-blue-300 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
              : 'bg-gray-800/60 text-gray-300 border border-gray-700/70 hover:bg-gray-700/80 hover:text-gray-200 hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create Quiz
          </span>
        </Link>
        
        <Link 
          href="/dashboard/quiz/history"
          className={`px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm ${
            pathname === '/dashboard/quiz/history' 
              ? 'bg-gradient-to-r from-indigo-500/20 to-blue-500/20 text-blue-300 border border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]' 
              : 'bg-gray-800/60 text-gray-300 border border-gray-700/70 hover:bg-gray-700/80 hover:text-gray-200 hover:-translate-y-0.5 hover:shadow-md'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Quiz History
          </span>
        </Link>
        
        <Link 
          href="/dashboard/learning"
          className="px-5 py-2.5 rounded-lg transition-all duration-200 shadow-sm bg-gray-800/60 text-gray-300 border-0 hover:bg-gray-700/50 hover:text-gray-200 hover:-translate-y-0.5"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            Back to Learning
          </span>
        </Link>
      </div>
      
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
    </div>
  );
} 