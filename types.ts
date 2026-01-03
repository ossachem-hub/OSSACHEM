
export enum DOKLevel {
  LEVEL_1 = "DOK 1: Recall & Reproduction",
  LEVEL_2 = "DOK 2: Skills & Concepts",
  LEVEL_3 = "DOK 3: Strategic Thinking",
  LEVEL_4 = "DOK 4: Extended Thinking"
}

export enum QuestionType {
  OBJECTIVE = "Objective (MCQ)",
  ESSAY = "Essay/Short Answer"
}

export interface Question {
  id: string;
  type: QuestionType;
  dokLevel: DOKLevel;
  question: string;
  options?: string[]; // For objective
  correctAnswer: string;
  explanation: string;
}

export interface BookAnalysis {
  title: string;
  summary: string;
  keyTopics: string[];
  questions: Question[];
  fullText?: string; // Storing a bit of context for the chatbot
}

export interface ProcessingProgress {
  total: number;
  current: number;
  status: string;
  completedPages: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type AppState = 'IDLE' | 'LOADING' | 'RESULTS' | 'ERROR';
