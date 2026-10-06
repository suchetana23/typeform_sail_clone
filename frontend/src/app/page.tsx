'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getForms, createForm, deleteForm, duplicateForm } from '@/lib/api';
import { Form } from '@/types';
import { Moon, Sun, Trash2, Copy, BarChart3, Pencil, MoreHorizontal, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppTheme } from '@/context/ThemeContext';
import { Logo } from '@/components/Logo';
import { useToast } from '@/components/Toast';

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const router = useRouter();
  const { isDark, toggleDark } = useAppTheme();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchForms = useCallback(async () => {
    try {
      const data = await getForms();
      setForms(data);
    } catch (error) {
      console.error('Failed to fetch forms:', error);
      showToast('Failed to load typeforms', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchForms();
  }, [fetchForms]);

  const handleCreateForm = async () => {
    try {
      const newForm = await createForm('My New Form');
      showToast('Typeform created');
      router.push(`/form/${newForm.id}/edit`);
    } catch (error) {
      console.error('Failed to create form:', error);
      showToast('Failed to create typeform', 'error');
    }
  };

  const handleDuplicateForm = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const copy = await duplicateForm(id);
      setForms([...forms, copy]);
      showToast(`"${title}" duplicated`);
    } catch (error) {
      console.error('Failed to duplicate form:', error);
      showToast('Failed to duplicate typeform', 'error');
    }
  };

  const handleDeleteForm = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (!confirm(`Delete "${title}"? All of its collected data will be lost. This action cannot be undone.`)) return;
    try {
      await deleteForm(id);
      setForms(forms.filter(f => f.id !== id));
      showToast('Typeform deleted');
    } catch (error) {
      console.error('Failed to delete form:', error);
      showToast('Failed to delete typeform', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F4F4F4] dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-[#191919] dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F4F4] dark:bg-gray-950 transition-colors duration-200">
      {/* Top Nav */}
      <nav className="h-16 bg-[#F4F4F4] dark:bg-gray-950 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/"><Logo className="text-2xl" /></Link>
          <span className="hidden md:inline text-sm font-medium text-[#191919] dark:text-gray-200">My workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={handleCreateForm}
            className="flex items-center gap-2 bg-[#191919] dark:bg-white dark:text-[#191919] hover:bg-black dark:hover:bg-gray-200 text-white px-4 py-2 rounded-lg transition-colors text-sm font-semibold"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create typeform
          </button>
          <div className="w-8 h-8 rounded-full bg-[#CBB7F5] flex items-center justify-center text-xs font-bold text-[#191919]" title="S">
            S
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#191919] dark:text-white tracking-tight">My workspace</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {forms.length} {forms.length === 1 ? 'typeform' : 'typeforms'}
          </span>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[#CBB7F5] flex items-center justify-center">
              <Plus size={28} className="text-[#191919]" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-1 text-lg font-semibold">Create your first typeform</p>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Ask anything. Get answers that actually mean something.</p>
            <button
              onClick={handleCreateForm}
              className="bg-[#191919] dark:bg-white dark:text-[#191919] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-black dark:hover:bg-gray-200 transition-colors"
            >
              Create typeform
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Create new card */}
            <button
              onClick={handleCreateForm}
              className="h-64 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-[#191919] dark:hover:border-gray-400 hover:text-[#191919] dark:hover:text-white transition-colors bg-transparent"
            >
              <span className="w-11 h-11 rounded-full bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                <Plus size={20} />
              </span>
              <span className="text-sm font-semibold">New typeform</span>
            </button>

            {forms.map((form) => {
              const theme = form.theme || { primary_color: '#CBB7F5', background_color: '#FFFFFF', font_family: 'sans-serif', dark_mode: false };
              return (
                <div
                  key={form.id}
                  className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md dark:hover:shadow-black/40 transition-shadow flex flex-col h-64 group cursor-pointer"
                  onClick={() => router.push(`/form/${form.id}/edit`)}
                >
                  {/* Thumbnail */}
                  <div
                    className="h-36 flex flex-col items-center justify-center px-8 overflow-hidden"
                    style={{ backgroundColor: theme.background_color }}
                  >
                    <div className="flex items-start gap-2 w-full max-w-[220px]">
                      <span className="font-bold text-sm mt-0.5 shrink-0" style={{ color: theme.primary_color }}>1 <span className="opacity-70">→</span></span>
                      <p
                        className="font-medium leading-snug text-sm line-clamp-3 text-left"
                        style={{ color: theme.dark_mode ? '#fff' : '#191919' }}
                      >
                        {form.questions?.[0]?.title || form.title}
                      </p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="p-4 flex items-start justify-between flex-grow">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[#191919] dark:text-gray-100 truncate mb-1" title={form.title}>
                        {form.title}
                      </h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: form.is_published ? '#044663' : '#A9A9A9' }} />
                        {form.is_published ? 'Live' : 'Draft'} · {form.questions?.length || 0} questions · {form.response_count || 0} responses
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === form.id ? null : form.id); }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-opacity shrink-0 ${menuOpenId === form.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      title="More options"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {/* Overflow menu */}
                  {menuOpenId === form.id && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-12 right-3 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-20"
                    >
                      <Link
                        href={`/form/${form.id}/edit`}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setMenuOpenId(null)}
                      >
                        <Pencil size={15} /> Edit
                      </Link>
                      <Link
                        href={`/form/${form.id}/results`}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setMenuOpenId(null)}
                      >
                        <BarChart3 size={15} /> Results
                      </Link>
                      {form.is_published && (
                        <Link
                          href={`/to/${form.id}`}
                          target="_blank"
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() => setMenuOpenId(null)}
                        >
                          <Plus size={15} /> View live form
                        </Link>
                      )}
                      <button
                        onClick={(e) => handleDuplicateForm(e, form.id, form.title)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Copy size={15} /> Duplicate
                      </button>
                      <button
                        onClick={(e) => handleDeleteForm(e, form.id, form.title)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
