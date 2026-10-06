export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'dropdown' | 'email' | 'number' | 'yes_no' | 'rating' | 'file_upload';

export interface LogicJump {
  condition: string;
  value: string;
  jump_to: string;
}

export interface QuestionSettings {
  choices?: string[];
  logic_jumps?: LogicJump[];
  [key: string]: any;
}

export interface Question {
  id: string;
  form_id: string;
  type: QuestionType;
  title: string;
  description?: string;
  is_required: boolean;
  order: number;
  settings?: QuestionSettings;
}

export interface FormTheme {
  primary_color: string;
  background_color: string;
  font_family: string;
  dark_mode: boolean;
  thank_you_title?: string;
  thank_you_message?: string;
}

export interface Form {
  id: string;
  title: string;
  is_published: boolean;
  theme?: FormTheme;
  created_at: string;
  updated_at: string;
  questions: Question[];
  response_count?: number;
}

export interface Answer {
  id?: string;
  response_id?: string;
  question_id: string;
  value: string;
}

export interface Response {
  id: string;
  form_id: string;
  is_completed: boolean;
  submitted_at: string;
  answers: Answer[];
}
