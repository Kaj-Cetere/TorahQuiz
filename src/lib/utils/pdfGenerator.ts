import jsPDF from 'jspdf';
import { QuizQuestion } from '@/lib/types';

// Simplified markdown handling - using regex for basic formatting
function applyBasicMarkdownToPDF(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  if (!text) return y;
  
  // First, split the full text into lines based on max width
  const lines = doc.splitTextToSize(text.replace(/\*\*|__|\*|_/g, ''), maxWidth);
  
  // For each line, find and apply formatting
  for (let i = 0; i < lines.length; i++) {
    const currentY = y + (i * LINE_HEIGHT);
    let remainingLine = lines[i];
    let currentX = x;
    
    // Simple parsing for ** (bold) and * (italic)
    while (remainingLine.length > 0) {
      // Check for bold text
      const boldMatch = remainingLine.match(/\*\*(.+?)\*\*|__(.+?)__/);
      // Check for italic text
      const italicMatch = remainingLine.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|_([^_]+)_/);
      
      if (boldMatch && (italicMatch === null || boldMatch.index! < italicMatch.index!)) {
        // Process text before bold
        const beforeBold = remainingLine.substring(0, boldMatch.index);
        if (beforeBold) {
          doc.setFont('helvetica', 'normal');
          doc.text(beforeBold, currentX, currentY);
          currentX += doc.getTextWidth(beforeBold);
        }
        
        // Process bold text
        const boldText = boldMatch[1] || boldMatch[2];
        doc.setFont('helvetica', 'bold');
        doc.text(boldText, currentX, currentY);
        currentX += doc.getTextWidth(boldText);
        
        // Update remaining line
        remainingLine = remainingLine.substring(boldMatch.index! + boldMatch[0].length);
      } else if (italicMatch) {
        // Process text before italic
        const beforeItalic = remainingLine.substring(0, italicMatch.index);
        if (beforeItalic) {
          doc.setFont('helvetica', 'normal');
          doc.text(beforeItalic, currentX, currentY);
          currentX += doc.getTextWidth(beforeItalic);
        }
        
        // Process italic text
        const italicText = italicMatch[1] || italicMatch[2];
        doc.setFont('helvetica', 'italic');
        doc.text(italicText, currentX, currentY);
        currentX += doc.getTextWidth(italicText);
        
        // Update remaining line
        remainingLine = remainingLine.substring(italicMatch.index! + italicMatch[0].length);
      } else {
        // No more formatting, render the rest normally
        doc.setFont('helvetica', 'normal');
        doc.text(remainingLine, currentX, currentY);
        break;
      }
    }
  }
  
  // Reset font to normal
  doc.setFont('helvetica', 'normal');
  
  // Return the Y position after rendering
  return y + (lines.length * LINE_HEIGHT);
}

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
    
    // Question number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_SIZE_QUESTION);
    doc.text(`${index + 1}. `, MARGIN, y);
    
    // Question text with markdown formatting
    const questionNumberWidth = doc.getTextWidth(`${index + 1}. `);
    y = applyBasicMarkdownToPDF(
      doc, 
      question.question, 
      MARGIN + questionNumberWidth, 
      y, 
      TEXT_WIDTH - questionNumberWidth
    );
    
    y += LINE_HEIGHT / 2; // Add a bit of space after the question
    
    // If multiple choice, list the options
    if (question.type === 'multiple_choice' && question.options) {
      doc.setFontSize(FONT_SIZE_QUESTION);
      
      question.options.forEach((option, optionIndex) => {
        const optionLabel = String.fromCharCode(65 + optionIndex); // A, B, C, D...
        doc.setFont('helvetica', 'normal');
        doc.text(`${optionLabel}. `, MARGIN + 5, y);
        
        // Render option text with markdown
        const optionLabelWidth = doc.getTextWidth(`${optionLabel}. `);
        y = applyBasicMarkdownToPDF(
          doc,
          option,
          MARGIN + 5 + optionLabelWidth,
          y,
          TEXT_WIDTH - 15
        );
        
        y += LINE_HEIGHT / 2; // Add space between options
      });
    }
    
    // If including answers, add the correct answer
    if (includeAnswers) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#006400'); // Dark green for answers
      doc.text('Answer: ', MARGIN, y);
      
      // Render the answer with markdown formatting
      const answerLabelWidth = doc.getTextWidth('Answer: ');
      doc.setTextColor('#006400'); // Keep green color for answer
      y = applyBasicMarkdownToPDF(
        doc,
        question.correctAnswer,
        MARGIN + answerLabelWidth,
        y,
        TEXT_WIDTH - answerLabelWidth
      );
      
      // If there's an explanation, include it
      if (question.explanation) {
        y += LINE_HEIGHT / 2;
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(FONT_SIZE_ANSWER);
        doc.setTextColor('#006400'); // Keep green color
        doc.text('Explanation: ', MARGIN, y);
        
        // Render the explanation with markdown formatting
        const explanationLabelWidth = doc.getTextWidth('Explanation: ');
        y = applyBasicMarkdownToPDF(
          doc,
          question.explanation,
          MARGIN + explanationLabelWidth,
          y,
          TEXT_WIDTH - explanationLabelWidth
        );
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