export type View = "today" | "practice" | "mistakes" | "vocabulary" | "progress" | "settings" | "admin";
export type QuestionStatus = "published" | "draft" | "offline";
export type Difficulty = "基础" | "进阶";
export type ContentStatus = "curated" | "imported" | "demo";
export type IdiomStatus = "published" | "draft" | "offline";

export type UserProfile = {
  id?: string;
  email: string;
  nickname: string;
  isAdmin: boolean;
  role?: "student" | "admin";
};

export type Question = {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  source: string;
  sourceRef: string;
  difficulty: Difficulty;
  status: QuestionStatus;
  contentStatus: ContentStatus;
  reviewedAt?: string;
};

export type Idiom = {
  id: string;
  name: string;
  pinyin: string;
  meaning: string;
  example: string;
  category: string;
  sourceRef: string;
  reviewStatus: "待校审" | "已校审";
  status: IdiomStatus;
};

export type Mistake = {
  questionId: string;
  count: number;
  reasons: string[];
  lastWrongAt: string;
  dueAt: string;
  mastered: boolean;
};

export type Session = {
  id: string;
  date: string;
  total: number;
  correct: number;
  seconds: number;
};

export type Attempt = {
  questionId: string;
  correct: boolean;
  seconds: number;
  selectedAnswer: number;
  createdAt: string;
};

export type AppStore = {
  user: UserProfile | null;
  questions: Question[];
  idioms: Idiom[];
  mistakes: Mistake[];
  sessions: Session[];
  attempts: Attempt[];
  completedToday: number;
  dailyMinutes: number;
  targetDate: string;
  region: string;
  favoriteIdioms: string[];
};

export type LocalAuth = {
  passwords: Record<string, string>;
};

export type CsvImportResult = {
  questions: Question[];
  errors: string[];
  warnings: string[];
};
