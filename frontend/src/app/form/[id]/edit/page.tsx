'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { useAppTheme } from '@/context/ThemeContext';
import {
  bulkUpdateQuestions,
  createQuestion,
  deleteQuestion,
  getForm,
  updateForm,
  updateQuestion,
} from '@/lib/api';
import { DragEndEvent } from '@dnd-kit/core';
import { Form, FormTheme, Question, QuestionType } from '@/types';
import BuilderWorkspace from './BuilderWorkspace';

const DEFAULT_THEME: FormTheme = {
  primary_color: '#007a87',
  background_color: '#ffffff',
  font_family: 'Karla',
  dark_mode: false,
};

const QUESTION_DEFAULTS: Record<QuestionType, string> = {
  short_text: 'Your question goes here',
  long_text: 'Your question goes here',
  multiple_choice: 'Pick one',
  dropdown: 'Pick one from the list',
  email: "What's your email address?",
  number: 'How many?',
  yes_no: 'Yes or no?',
  rating: 'How would you rate your experience?',
  file_upload: 'Upload a file',
};

export default function EditFormPage({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<QuestionType | null>(null);
  const [pickerError, setPickerError] = useState('');
  const { isDark, toggleDark } = useAppTheme();
  const { showToast } = useToast();

  const fetchForm = useCallback(async () => {
    try {
      const data = await getForm(params.id);
      data.theme = { ...DEFAULT_THEME, ...(data.theme || {}) };
      setForm(data);
      setActiveQuestionId(data.questions?.[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to load form:', error);
      showToast('Could not load this form', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  useEffect(() => {
    void fetchForm();
  }, [fetchForm]);

  const addQuestion = async (type: QuestionType): Promise<boolean> => {
    if (!form || addingType) return false;
    setAddingType(type);
    setPickerError('');
    try {
      const question = await createQuestion(form.id, {
        type,
        title: QUESTION_DEFAULTS[type],
        order: form.questions.reduce((highest, question) => Math.max(highest, question.order), -1) + 1,
        is_required: false,
        settings: type === 'multiple_choice' || type === 'dropdown'
          ? { choices: ['Option 1', 'Option 2'] }
          : {},
      });
      setForm(current => current ? { ...current, questions: [...current.questions, question] } : current);
      setActiveQuestionId(question.id);
      requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>('[data-active-question-title]')?.focus());
      return true;
    } catch (error) {
      console.error('Failed to create question:', error);
      setPickerError('Could not add that question. Please try again.');
      showToast('Could not add question', 'error');
      return false;
    } finally {
      setAddingType(null);
    }
  };

  const deleteQuestionById = async (questionId: string) => {
    if (!form) return;
    try {
      await deleteQuestion(form.id, questionId);
      const questions = form.questions.filter(question => question.id !== questionId);
      setForm({ ...form, questions });
      if (activeQuestionId === questionId) setActiveQuestionId(questions[0]?.id ?? null);
      showToast('Question deleted');
    } catch (error) {
      console.error('Failed to delete question:', error);
      showToast('Could not delete question', 'error');
    }
  };

  const updateActiveQuestion = async (updates: Partial<Question>) => {
    if (!form || !activeQuestionId) return;
    setForm(current => current ? {
      ...current,
      questions: current.questions.map(question => question.id === activeQuestionId ? { ...question, ...updates } : question),
    } : current);
    try {
      await updateQuestion(form.id, activeQuestionId, updates);
    } catch (error) {
      console.error('Failed to save question:', error);
      showToast('Question changes could not be saved', 'error');
    }
  };

  const reorderQuestions = async ({ active, over }: DragEndEvent) => {
    if (!form || !over || active.id === over.id) return;
    const previousQuestions = form.questions;
    const oldIndex = previousQuestions.findIndex(question => question.id === active.id);
    const newIndex = previousQuestions.findIndex(question => question.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = [...previousQuestions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const updated = reordered.map((question, order) => ({ ...question, order }));
    setForm(current => current ? { ...current, questions: updated } : current);
    try {
      await bulkUpdateQuestions(form.id, updated);
    } catch (error) {
      console.error('Failed to save question order:', error);
      setForm(current => current ? { ...current, questions: previousQuestions } : current);
      showToast('Could not save the new question order', 'error');
    }
  };

  const updateTheme = async (updates: Partial<FormTheme>) => {
    if (!form) return;
    const theme = { ...DEFAULT_THEME, ...(form.theme || {}), ...updates };
    setForm(current => current ? { ...current, theme } : current);
    try {
      await updateForm(form.id, { title: form.title, is_published: form.is_published, theme });
    } catch (error) {
      console.error('Failed to update form design:', error);
      showToast('Design changes could not be saved', 'error');
    }
  };

  const changeTitle = (title: string) => {
    setForm(current => current ? { ...current, title } : current);
  };

  const saveTitle = async (title: string) => {
    if (!form || title.trim() === '') {
      if (form) setForm(current => current ? { ...current, title: form.title } : current);
      return;
    }
    try {
      const saved = await updateForm(form.id, { title: title.trim(), is_published: form.is_published, theme: form.theme });
      setForm(current => current ? { ...current, title: saved.title } : current);
    } catch (error) {
      console.error('Failed to rename form:', error);
      showToast('Form title could not be saved', 'error');
    }
  };

  const publishForm = async () => {
    if (!form) return;
    try {
      const saved = await updateForm(form.id, { title: form.title, is_published: !form.is_published, theme: form.theme });
      setForm(current => current ? { ...current, is_published: saved.is_published } : current);
      showToast(saved.is_published ? 'Your form is live and ready to share.' : 'Form unpublished');
    } catch (error) {
      console.error('Failed to update publishing status:', error);
      showToast('Publishing status could not be updated', 'error');
    }
  };

  if (loading) return <div className="flex h-dvh items-center justify-center bg-[#f7f6f7] text-sm text-[#777179] dark:bg-[#19171a] dark:text-[#bcb6bc]">Loading form…</div>;
  if (!form) return <div className="flex h-dvh items-center justify-center bg-[#f7f6f7] text-sm text-red-600 dark:bg-[#19171a] dark:text-red-300">Form not found.</div>;

  const activeQuestion = form.questions.find(question => question.id === activeQuestionId);

  return (
    <BuilderWorkspace
      form={form}
      activeQuestion={activeQuestion}
      isDark={isDark}
      toggleDark={toggleDark}
      onSelectQuestion={setActiveQuestionId}
      onReorder={reorderQuestions}
      onAddQuestion={addQuestion}
      addingType={addingType}
      pickerError={pickerError}
      onDeleteQuestion={deleteQuestionById}
      onUpdateQuestion={updateActiveQuestion}
      onUpdateTheme={updateTheme}
      onTitleChange={changeTitle}
      onSaveTitle={saveTitle}
      onPublish={publishForm}
      onToast={showToast}
    />
  );
}
