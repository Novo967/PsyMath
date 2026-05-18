// =============================================================================
// PsyMath — Shared TypeScript Types
// Central source of truth for all Firestore document shapes and enums.
// =============================================================================

// ---------- Enums & Literal Types ----------

/** User roles controlling access levels across the platform. */
export type UserRole = 'student' | 'editor' | 'admin';

/** The three exam sections supported by the platform. */
export type Subject = 'quantitative' | 'verbal' | 'english';

/** Difficulty levels for questions. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/** Block types used inside study material chapters. */
export type ContentBlockType = 'title' | 'text' | 'tip' | 'rule';

// ---------- User Document (users/{uid}) ----------

/** Per-subject progress counters stored on the user document. */
export interface SubjectStats {
  totalPracticed: number;
  totalCorrect: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  instituteId: string;
  isPremium: boolean;
  questionsSolvedToday: number;
  dailyLimit: number;
  lastQuestionDate: string;
  totalQuestionsPracticed: number;
  totalCorrectAnswers: number;
  practicedQuestions: string[];
  /** Per-subject statistics counters. */
  subjectStats: Record<Subject, SubjectStats>;
  createdAt: string;
}


// ---------- Question Document (questions/{id}) ----------

export interface Question {
  id: string;
  instituteId: string;
  subject: Subject;
  topic: string;
  questionText: string;
  imageUrl?: string | null;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: Difficulty;
  /** Links this question to a shared passage / question group. */
  groupId?: string | null;
  /** Display order within its group (1-based). */
  groupOrder?: number;
}

// ---------- Question Group / Passage (question_groups/{id}) ----------

export interface QuestionGroup {
  id: string;
  instituteId: string;
  subject: Subject;
  /** The shared reading passage displayed above the linked questions. */
  passageText: string;
  passageImageUrl?: string | null;
  title?: string;
}

// ---------- Study Materials ----------

export interface ContentBlock {
  type: ContentBlockType;
  content: string;
}

export interface SubTopic {
  id: string;
  title: string;
  contentBlocks: ContentBlock[];
}

export interface StudyChapter {
  id: string;
  instituteId: string;
  subject: Subject;
  title: string;
  icon: string;
  order: number;
  subTopics: SubTopic[];
}

// ---------- Simulation Record (users/{uid}/simulations/{simId}) ----------

export interface SimulationResultEntry {
  questionId: string;
  userAnswer: number | null;
  isCorrect: boolean;
}

export interface SimulationRecord {
  id: string;
  timestamp: any; // Firestore Timestamp
  subject: Subject;
  score: number;
  correctCount: number;
  totalQuestions: number;
  results: SimulationResultEntry[];
}

/** Formatted simulation used for display in the Statistics screen. */
export interface FormattedSimulation {
  id: string;
  date: string;
  score: number;
  change: string;
  changeNum: number;
  rawResults: SimulationResultEntry[];
}

// ---------- Institute (institutes/{id}) ----------

export interface InstituteTheme {
  backgroundColor: string;
  cardBackground: string;
  primaryColor: string;
  secondaryColor: string;
  textPrimary: string;
  textSecondary: string;
  textLight: string;
  successBackground: string;
  successBorder: string;
  successText: string;
  errorBackground: string;
  errorBorder: string;
  errorText: string;
  tipBackground: string;
  tipBorder: string;
  ruleBackground: string;
  ruleBorder: string;
}

export interface Institute {
  id: string;
  name: string;
  theme?: InstituteTheme;
  logoUrl?: string;
}

// ---------- App Config (appConfig/{configId}) ----------

export interface VersionControl {
  minVersionIos: string;
  minVersionAndroid: string;
  storeUrlIos: string;
  storeUrlAndroid: string;
}
