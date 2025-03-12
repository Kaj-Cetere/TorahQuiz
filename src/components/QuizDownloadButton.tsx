import { useState } from 'react';
import { QuizQuestion } from '@/lib/types';
import { generateQuizPDF, downloadPDF } from '@/lib/utils/pdfGenerator';

interface QuizDownloadButtonProps {
  quizTitle: string;
  questions: QuizQuestion[];
}

export default function QuizDownloadButton({ quizTitle, questions }: QuizDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async (includeAnswers: boolean) => {
    try {
      setIsGenerating(true);
      
      // Create a formatted title for the file
      const sanitizedTitle = quizTitle
        .replace(/[^\w\s]/gi, '') // Remove special characters
        .replace(/\s+/g, '_'); // Replace spaces with underscores
      
      const filename = includeAnswers
        ? `${sanitizedTitle}_with_answers.pdf`
        : `${sanitizedTitle}_quiz.pdf`;
      
      // Generate and download the PDF
      const doc = generateQuizPDF(quizTitle, questions, includeAnswers);
      downloadPDF(doc, filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        <button
          onClick={() => handleDownload(false)}
          disabled={isGenerating || questions.length === 0}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:translate-y-[-2px] hover:shadow-lg font-medium border border-indigo-500/20"
        >
          {isGenerating ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download Quiz</span>
            </>
          )}
        </button>
        
        <button
          onClick={() => handleDownload(true)}
          disabled={isGenerating || questions.length === 0}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:translate-y-[-2px] hover:shadow-lg font-medium border border-green-500/20"
        >
          {isGenerating ? (
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Download with Answers</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
} 