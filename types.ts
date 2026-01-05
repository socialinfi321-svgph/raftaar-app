
// Database Types mirroring Supabase Schema

export enum UserTag {
  Cheetah = 'Cheetah',
  Panther = 'Panther',
  Donkey = 'Donkey',
  Monkey = 'Monkey'
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  mobile_number?: string;
  exam_language?: 'Hindi' | 'English'; // User's preferred language
  district?: string;
  village?: string;
  last_active_at: string;
  study_minutes: number;
  
  // Gamification Fields
  total_xp: number;
  weekly_xp: number;
  current_level: number;
  current_badge: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' | 'Rookie' | string;
  current_tag?: string;
  global_rank?: number; // Fetched via view
}

export interface Question {
  id: number;
  subject: string;
  chapter_name_en: string;
  chapter_name_hi: string;
  question_text_en: string;
  question_text_hi: string;
  option_a_en: string | null;
  option_a_hi: string | null;
  option_b_en: string | null;
  option_b_hi: string | null;
  option_c_en: string | null;
  option_c_hi: string | null;
  option_d_en: string | null;
  option_d_hi: string | null;
  correct_option: 'A' | 'B' | 'C' | 'D';
  solution_short_en: string | null;
  solution_short_hi: string | null;
  exam_year: string | null;
}

export interface PYQQuestion extends Question {
  question_type: 'objective' | 'subjective';
  answer_text_en?: string | null;
  answer_text_hi?: string | null;
  marks?: number;
}

export interface UserAnswer {
  id: number;
  user_id: string;
  question_id: number;
  selected_option: string;
  is_correct: boolean;
  attempted_at: string;
}

export interface TestSubmission {
  userId: string;
  subject: string;
  testType: 'Infinity' | 'PYQ' | 'Mock' | 'Practice'; 
  totalQuestions: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeTaken: number; 
  date: string; 
}

export interface TestHistoryItem {
  id: string;
  subject: string;
  correct: number;
  totalQuestions: number;
  timeTaken: number;
  date: string;
  type: 'Practice' | 'PYQ' | 'Infinity' | 'Shorts' | 'Mock';
}

export interface DashboardStats {
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  accuracy: number;
  totalTests: number;
  dailyCorrect: number;
  dailyWrong: number;
  dailyAvgTime: number;
  dailyAttempts: number;
  history: TestHistoryItem[];
  graphData: { day: string; score: number }[];
}

export type Language = 'en' | 'hi';
