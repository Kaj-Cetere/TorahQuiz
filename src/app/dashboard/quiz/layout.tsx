import { ReactNode } from 'react';

export default function QuizLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-subtle-blue-gradient"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-600/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-600/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        {children}
      </div>
    </div>
  );
} 