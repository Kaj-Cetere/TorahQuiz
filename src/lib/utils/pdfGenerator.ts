import jsPDF from 'jspdf';
import { QuizQuestion } from '@/lib/types';

const QUESTIONS_PER_PAGE = 10;
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 20;
const TEXT_COLOR = '#000000';
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_HEADING = 12;
const FONT_SIZE_QUESTION = 11;
const FONT_SIZE_ANSWER = 10;
const LINE_HEIGHT = 7;
const TEXT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // Available width for text

/**
 * Generates a PDF of the quiz questions with traditional Gemara test layout
 * @param quizTitle - Title of the quiz
 * @param questions - Array of quiz questions
 * @param includeAnswers - Whether to include answers in the PDF
 * @returns Promise<Blob> - The generated PDF as a Blob
 */
export const generateQuizPDF = (
  quizTitle: string, 
  questions: QuizQuestion[], 
  includeAnswers: boolean = false
): jsPDF => {
  const doc = new jsPDF();
  
  // Add title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(FONT_SIZE_TITLE);
  doc.setTextColor(TEXT_COLOR);
  const titleText = includeAnswers ? "Gemara Quiz - Answer Key" : "Gemara Quiz";
  doc.text(titleText, PAGE_WIDTH / 2, MARGIN, { align: 'center' });
  
  // Add date directly under the title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SIZE_HEADING);
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(date, PAGE_WIDTH / 2, MARGIN + LINE_HEIGHT, { align: 'center' });
  
  // Add line directly after the date
  doc.setDrawColor(0);
  doc.line(MARGIN, MARGIN + LINE_HEIGHT * 2, PAGE_WIDTH - MARGIN, MARGIN + LINE_HEIGHT * 2);
  
  // Add questions immediately after the line
  let y = MARGIN + LINE_HEIGHT * 3;
  let currentPage = 1;
  
  questions.forEach((question, index) => {
    // If we're at the limit of questions per page, add a new page
    if (index > 0 && index % QUESTIONS_PER_PAGE === 0) {
      doc.addPage();
      currentPage++;
      y = MARGIN + LINE_HEIGHT;
    }
    
    // Check if there's enough space for this question, otherwise move to next page
    const estimatedHeight = getEstimatedQuestionHeight(question, includeAnswers, doc);
    if (y + estimatedHeight > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      currentPage++;
      y = MARGIN + LINE_HEIGHT;
    }
    
    // Question number and text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SIZE_QUESTION);
    
    // Split long questions into multiple lines
    const questionText = `${index + 1}. ${question.question}`;
    const questionLines = doc.splitTextToSize(questionText, TEXT_WIDTH);
    doc.text(questionLines, MARGIN, y);
    
    // Move y position down based on number of lines
    y += LINE_HEIGHT * questionLines.length;
    
    // If multiple choice, list the options
    if (question.type === 'multiple_choice' && question.options) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_SIZE_QUESTION);
      
      question.options.forEach((option, optionIndex) => {
        const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D...
        
        // Split long options into multiple lines with indent for better readability
        const optionText = `${optionLabel}. ${option}`;
        const optionLines = doc.splitTextToSize(optionText, TEXT_WIDTH - 10);
        doc.text(optionLines, MARGIN + 5, y);
        
        // Move y position down based on number of lines
        y += LINE_HEIGHT * optionLines.length;
      });
    }
    
    // If including answers, add the correct answer
    if (includeAnswers) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#006400'); // Dark green for answers
      
      // Split long answers into multiple lines
      const answerText = `Answer: ${question.correctAnswer}`;
      const answerLines = doc.splitTextToSize(answerText, TEXT_WIDTH);
      doc.text(answerLines, MARGIN, y);
      
      // Move y position down based on number of lines
      y += LINE_HEIGHT * answerLines.length;
      
      // If there's an explanation, include it
      if (question.explanation) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(FONT_SIZE_ANSWER);
        
        const explanationText = `Explanation: ${question.explanation}`;
        const explanationLines = doc.splitTextToSize(explanationText, TEXT_WIDTH);
        doc.text(explanationLines, MARGIN, y);
        
        // Move y position down based on number of lines
        y += LINE_HEIGHT * explanationLines.length;
      }
      
      // Reset text color
      doc.setTextColor(TEXT_COLOR);
    }
    
    // Add some space between questions
    y += LINE_HEIGHT;
  });
  
  // Add page numbers
  for (let i = 1; i <= doc.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_SIZE_ANSWER);
    doc.text(i.toString(), PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN, { align: 'center' });
  }
  
  return doc;
};

/**
 * Estimate the height a question will take on the page, accounting for text wrapping
 */
function getEstimatedQuestionHeight(question: QuizQuestion, includeAnswers: boolean, doc: jsPDF): number {
  let height = 0;
  
  // Question text - account for wrapping
  const questionText = question.question;
  const questionLines = doc.splitTextToSize(questionText, TEXT_WIDTH);
  height += LINE_HEIGHT * questionLines.length;
  
  // Add height for options if multiple choice
  if (question.type === 'multiple_choice' && question.options) {
    question.options.forEach(option => {
      const optionLines = doc.splitTextToSize(option, TEXT_WIDTH - 10);
      height += LINE_HEIGHT * optionLines.length;
    });
  }
  
  // Add height for answer and explanation if included
  if (includeAnswers) {
    // Answer
    const answerLines = doc.splitTextToSize(question.correctAnswer, TEXT_WIDTH);
    height += LINE_HEIGHT * answerLines.length;
    
    // Explanation
    if (question.explanation) {
      const explanationLines = doc.splitTextToSize(question.explanation, TEXT_WIDTH);
      height += LINE_HEIGHT * explanationLines.length;
    }
  }
  
  // Add some extra space between questions
  height += LINE_HEIGHT;
  
  return height;
}

/**
 * Download the PDF with the given filename
 */
export const downloadPDF = (doc: jsPDF, filename: string): void => {
  doc.save(filename);
}; 