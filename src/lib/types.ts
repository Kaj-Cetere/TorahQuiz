// User type representing a user in our application
export interface User {
  id: string;
  email: string;
  username?: string;
  createdAt: string;
}

// Torah text type representing a piece of Torah text stored in Supabase
export interface TorahText {
  id?: string;        // Making id optional since it will be generated by Supabase on insert
  ref: string;        // Reference in Sefaria format (e.g., "Genesis.1", "Berakhot.2a")
  book: string;       // The book name (e.g., "Genesis", "Berakhot")
  content: string;    // The actual text content
  language: string;   // "he" for Hebrew, "en" for English
  section?: string;   // Section within the book (e.g., chapter, daf)
  embedding?: any;    // Vector embedding for RAG
}

// User progress type tracking what the user has learned
export interface UserProgress {
  id: string;
  user_id: string;     // Foreign key to user
  ref: string;        // Reference to the text that was learned
  completed_at: string; // When the user marked this as complete
  is_completed: boolean; // Whether the user has completed this text
}

// Quiz question generated by the AI
export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;      // Add this property for question type
  options?: string[]; // For multiple choice questions
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  relatedRef: string; // Reference to the relevant text
}

// Quiz session representing a quiz taken by a user
export interface QuizSession {
  id: string;
  userId: string;
  createdAt: string;
  score?: number;
  questions: QuizQuestion[];
  userAnswers?: Record<string, string>; // Map of question ID to user's answer
  completed: boolean;
}

// Quiz settings for customization
export interface QuizSettings {
  questionCount: number;          // Number of questions in the quiz
  difficulty: 'easy' | 'medium' | 'hard'; // Difficulty level
  questionTypes: QuestionType[];  // Types of questions to include
  includeExplanations: boolean;   // Include explanations with answers
  timeLimit?: number;             // Optional time limit in minutes (undefined = no limit)
  language: 'he' | 'en' | 'both'; // Language preference for questions
}

// Types of questions that can be generated
export enum QuestionType {
  MultipleChoice = 'multiple_choice',
  TrueFalse = 'true_false',
  ShortAnswer = 'short_answer',
  FillInBlank = 'fill_in_blank',
  Matching = 'matching'
}

// Quiz topic selection criteria
export interface QuizTopicSelection {
  type: 'tractate' | 'chapter' | 'daf' | 'amud' | 'topic';
  tractate?: string;    // Specific tractate if selected
  chapter?: string;     // Specific chapter if selected
  daf?: string;         // Specific daf if selected
  amud?: string;        // Specific amud if selected
  topic?: string;       // Conceptual topic (e.g., "Prayer", "Shabbat laws")
  randomize: boolean;   // Whether to randomize within the selection
  isExploring?: boolean; // Whether user is exploring unlearned material (directly from master table)
} 