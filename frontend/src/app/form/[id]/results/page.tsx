'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_URL, getForm, getResponses } from '@/lib/api';
import { Form, Response, Question } from '@/types';
import Link from 'next/link';
import { ArrowLeft, Settings, ExternalLink, Download, Sun, Moon, X } from 'lucide-react';
import { useAppTheme } from '@/context/ThemeContext';

type QuestionType = Question['type'];

const CHOICE_TYPES: QuestionType[] = ['multiple_choice', 'dropdown', 'yes_no'];

export default function ResultsPage({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'responses' | 'summary'>('responses');
  const [selectedResponse, setSelectedResponse] = useState<Response | null>(null);
  const { isDark, toggleDark } = useAppTheme();

  useEffect(() => {
    Promise.all([
      getForm(params.id),
      getResponses(params.id)
    ]).then(([formData, responsesData]) => {
      setForm(formData);
      setResponses(responsesData);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  }, [params.id]);

  const completedCount = useMemo(() => responses.filter(r => r.is_completed).length, [responses]);
  const completionRate = responses.length > 0 ? Math.round((completedCount / responses.length) * 100) : 0;

  const getSummary = (q: Question) => {
    const answered = responses
      .map(r => r.answers.find(a => a.question_id === q.id)?.value)
      .filter((v): v is string => v !== undefined && v !== '');

    if (CHOICE_TYPES.includes(q.type)) {
      const options = q.type === 'yes_no' ? ['Yes', 'No'] : (q.settings?.choices || []);
      const counts = options.map(opt => ({
        label: opt,
        count: answered.filter(v => v === opt).length,
      }));
      return { answeredCount: answered.length, rows: counts };
    }

    if (q.type === 'rating') {
      const counts = [1, 2, 3, 4, 5].map(n => ({
        label: `${n} ${n === 1 ? 'star' : 'stars'}`,
        count: answered.filter(v => v === n.toString()).length,
      }));
      const total = answered.reduce((sum, v) => sum + (parseInt(v) || 0), 0);
      const average = answered.length > 0 ? (total / answered.length).toFixed(1) : null;
      return { answeredCount: answered.length, rows: counts, average };
    }

    return { answeredCount: answered.length, rows: [] as { label: string; count: number }[], average: null as string | null };
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#F4F4F4] dark:bg-gray-950 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!form) return <div className="h-screen flex items-center justify-center bg-[#F4F4F4] dark:bg-gray-950 text-red-500">Typeform not found</div>;

  return (
    <div className="min-h-screen bg-[#F4F4F4] dark:bg-gray-950 flex flex-col transition-colors duration-200">
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <span className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[200px]">{form.title}</span>
          <span className="text-gray-400 dark:text-gray-600">/</span>
          <span className="text-gray-600 dark:text-gray-300 font-medium">Results</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href={`${API_URL}/forms/${form.id}/responses/csv`}
            download
            className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            <Download size={16} /> Export CSV
          </a>
          <Link href={`/form/${form.id}/edit`} className="flex items-center gap-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded transition-colors text-sm">
            <Settings size={16} /> Edit Form
          </Link>
          <Link href={`/to/${form.id}`} target="_blank" className="flex items-center gap-1 bg-[#191919] text-white hover:bg-black px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold">
            <ExternalLink size={16} /> View typeform
          </Link>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">Total Started</div>
            <div className="text-3xl font-light text-gray-800 dark:text-gray-100">{responses.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">Completed</div>
            <div className="text-3xl font-light text-gray-800 dark:text-gray-100">{completedCount}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 mb-1">Completion Rate</div>
            <div className="text-3xl font-light text-gray-800 dark:text-gray-100">{completionRate}%</div>
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-[#044663] rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-4 border-b border-gray-200 dark:border-gray-800">
          {(['responses', 'summary'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t
                  ? 'text-[#191919] dark:text-white border-[#191919] dark:border-white'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'responses' && (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
              <div>
                <h2 className="text-xl font-medium text-gray-800 dark:text-gray-100">Responses</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{responses.length} total responses · click a row to view details</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold tracking-wider">
                    <th className="px-6 py-4 whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">Submitted at</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    {form.questions.map((q, i) => (
                      <th key={q.id} className="px-6 py-4 min-w-[200px]">
                        <span className="text-gray-400 dark:text-gray-600 mr-2">{i + 1}</span>
                        {q.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                  {responses.length === 0 ? (
                    <tr>
                      <td colSpan={form.questions.length + 2} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900">
                        No responses yet. Share your typeform to start collecting data!
                      </td>
                    </tr>
                  ) : (
                    responses.map((response) => (
                      <tr
                        key={response.id}
                        onClick={() => setSelectedResponse(response)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors bg-white dark:bg-gray-900 cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 sticky left-0 bg-inherit z-10 font-medium">
                          {new Date(response.submitted_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            response.is_completed
                              ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400'
                          }`}>
                            {response.is_completed ? 'Completed' : 'Partial'}
                          </span>
                        </td>
                        {form.questions.map(q => {
                          const answer = response.answers.find(a => a.question_id === q.id);
                          return (
                            <td key={q.id} className="px-6 py-4 text-gray-800 dark:text-gray-200 truncate max-w-xs">
                              {answer ? answer.value : <span className="text-gray-300 dark:text-gray-600 italic">Skipped</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'summary' && (
          <div className="space-y-4">
            {form.questions.length === 0 && (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400 text-sm">
                This form has no questions yet.
              </div>
            )}
            {form.questions.map((q, i) => {
              const summary = getSummary(q);
              return (
                <div key={q.id} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        <span className="text-gray-400 dark:text-gray-600 mr-2">{i + 1}.</span>
                        {q.title}
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 capitalize">
                        {q.type.replace('_', ' ')} · answered {summary.answeredCount} of {responses.length} times
                      </p>
                    </div>
                    {summary.average !== null && (
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-light text-gray-800 dark:text-gray-100">{summary.average}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">average rating</div>
                      </div>
                    )}
                  </div>

                  {summary.rows.length > 0 && (
                    <div className="space-y-2">
                      {summary.rows.map(row => {
                        const pct = responses.length > 0 ? Math.round((row.count / responses.length) * 100) : 0;
                        return (
                          <div key={row.label} className="flex items-center gap-3">
                            <div className="w-40 shrink-0 text-sm text-gray-700 dark:text-gray-300 truncate" title={row.label}>{row.label}</div>
                            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                              <div className="h-full bg-[#044663] rounded" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="w-16 text-right text-sm text-gray-500 dark:text-gray-400 shrink-0">
                              {row.count} · {pct}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Individual Response Detail */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedResponse(null)}>
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />
          <div
            className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-14 px-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-gray-100">Response details</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(selectedResponse.submitted_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedResponse(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  selectedResponse.is_completed
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400'
                }`}>
                  {selectedResponse.is_completed ? 'Completed' : 'Partial'}
                </span>
              </div>

              {form.questions.map((q, i) => {
                const answer = selectedResponse.answers.find(a => a.question_id === q.id);
                return (
                  <div key={q.id} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                      {i + 1}. {q.title}
                      {q.is_required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                    </p>
                    {answer ? (
                      <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{answer.value}</p>
                    ) : (
                      <p className="text-sm text-gray-300 dark:text-gray-600 italic">Skipped</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
