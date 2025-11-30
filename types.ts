export enum GameMode {
  LESSON = 'LESSON',
  ZEN = 'ZEN',
  GAME_RAIN = 'GAME_RAIN',
  ANALYTICS = 'ANALYTICS'
}

export interface KeyStats {
  char: string;
  total: number;
  errors: number;
}

export interface TypingSessionStats {
  wpm: number;
  accuracy: number;
  timeElapsed: number;
  mistakes: number;
  charsTyped: number;
}

export interface LessonConfig {
  id: string;
  title: string;
  text: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  focusKeys?: string[];
}

export interface WordEntity {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  typed: string;
}

export type Theme = 'light' | 'dark';
