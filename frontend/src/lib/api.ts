import axios from 'axios';
import { Form, Question, Response } from '@/types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
});

export const getForms = async (): Promise<Form[]> => {
  const { data } = await api.get('/forms');
  return data;
};

export const getForm = async (id: string): Promise<Form> => {
  const { data } = await api.get(`/forms/${id}`);
  return data;
};

export const createForm = async (title: string): Promise<Form> => {
  const { data } = await api.post('/forms', { title, is_published: false });
  return data;
};

export const updateForm = async (id: string, updates: Partial<Form>): Promise<Form> => {
  const { data } = await api.put(`/forms/${id}`, updates);
  return data;
};

export const deleteForm = async (id: string): Promise<void> => {
  await api.delete(`/forms/${id}`);
};

export const duplicateForm = async (id: string): Promise<Form> => {
  const { data } = await api.post(`/forms/${id}/duplicate`);
  return data;
};

export const createQuestion = async (formId: string, question: Partial<Question>): Promise<Question> => {
  const { data } = await api.post(`/forms/${formId}/questions`, question);
  return data;
};

export const updateQuestion = async (formId: string, questionId: string, question: Partial<Question>): Promise<Question> => {
  const { data } = await api.put(`/forms/${formId}/questions/${questionId}`, question);
  return data;
};

export const deleteQuestion = async (formId: string, questionId: string): Promise<void> => {
  await api.delete(`/forms/${formId}/questions/${questionId}`);
};

export const bulkUpdateQuestions = async (formId: string, questions: Question[]): Promise<Question[]> => {
  const { data } = await api.put(`/forms/${formId}/questions`, questions);
  return data;
};

export const submitResponse = async (formId: string, answers: { question_id: string; value: string }[], isCompleted: boolean = false): Promise<Response> => {
  const { data } = await api.post(`/forms/${formId}/responses`, { answers, is_completed: isCompleted });
  return data;
};

export const updateResponse = async (responseId: string, answers: { question_id: string; value: string }[], isCompleted: boolean = false): Promise<Response> => {
  const { data } = await api.put(`/responses/${responseId}`, { answers, is_completed: isCompleted });
  return data;
};

export const getResponses = async (formId: string): Promise<Response[]> => {
  const { data } = await api.get(`/forms/${formId}/responses`);
  return data;
};

export const uploadFile = async (file: File): Promise<{url: string}> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};
