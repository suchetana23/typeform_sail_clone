'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { getForm, submitResponse, updateResponse, uploadFile } from '@/lib/api';
import { Form, Question } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronUp, ChevronDown, UploadCloud } from 'lucide-react';
import { Logo } from '@/components/Logo';

type Stage = 'loading' | 'welcome' | 'questions' | 'done';

export default function RespondentFlow({ params }: { params: { id: string } }) {
  const [form, setForm] = useState<Form | null>(null);
  const [stage, setStage] = useState<Stage>('loading');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const inputRef = useRef<any>(null);

  useEffect(() => {
    getForm(params.id).then(data => {
      setForm(data);
      if (!data.is_published) {
        setLoadError('This typeform is not published yet.');
        return;
      }
      setStage('welcome');
    }).catch(err => {
      console.error(err);
      setLoadError('Typeform not found or could not be loaded.');
    });
  }, [params.id]);

  useEffect(() => {
    if (stage !== 'questions') return;
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentIdx, stage]);

  const savePartialResponse = useCallback(async (isCompleted = false, currentAnswers = answers) => {
    if (!form || !responseId) return false;
    const formattedAnswers = Object.entries(currentAnswers).map(([question_id, value]) => ({
      question_id,
      value
    }));
    try {
      await updateResponse(responseId, formattedAnswers, isCompleted);
      return true;
    } catch (e) {
      console.error('Failed to save response:', e);
      return false;
    }
  }, [answers, form, responseId]);

  const handleStart = useCallback(async () => {
    if (!form) return;
    // Start tracking the response session only once the respondent begins
    try {
      const resp = await submitResponse(form.id, [], false);
      setResponseId(resp.id);
      setError('');
      setStage('questions');
    } catch (e) {
      console.error('Failed to start response session:', e);
      setError('We could not start this form. Please try again.');
    }
  }, [form]);

  const handleNext = useCallback(async (currentAnswers = answers) => {
    if (!form) return;
    const activeQuestion = form.questions[currentIdx];
    const currentAnswer = currentAnswers[activeQuestion.id] || '';

    // Validation
    if (activeQuestion.is_required && !currentAnswer.trim()) {
      setError('This question is required.');
      return;
    }

    if (activeQuestion.type === 'email' && currentAnswer) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(currentAnswer)) {
        setError('Hmm... that email doesn\'t look right.');
        return;
      }
    }

    if (activeQuestion.type === 'number' && currentAnswer) {
      if (!Number.isFinite(Number(currentAnswer))) {
        setError('Please enter a valid number.');
        return;
      }
    }

    setError('');

    // Logic Jumps
    const logicJumps = activeQuestion.settings?.logic_jumps;
    let nextIdx = currentIdx + 1;
    if (logicJumps && logicJumps.length > 0) {
      const answer = currentAnswer;
       for (const jump of logicJumps) {
         if (jump.value === answer && jump.jump_to) {
            const targetIdx = form.questions.findIndex(q => q.id === jump.jump_to);
            if (targetIdx !== -1) {
               nextIdx = targetIdx;
               break;
            }
         }
       }
    }

    const isCompleted = nextIdx >= form.questions.length;
    const saved = await savePartialResponse(isCompleted, currentAnswers);
    if (!saved) {
      setError('Your answer could not be saved. Check your connection and try again.');
      return;
    }

    if (!isCompleted) {
      setCurrentIdx(nextIdx);
    } else {
      setStage('done');
    }
  }, [answers, currentIdx, form, savePartialResponse]);

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setError('');
    }
  }, [currentIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage === 'welcome' && e.key === 'Enter') {
        e.preventDefault();
        void handleStart();
        return;
      }
      if (stage !== 'questions') return;

      const target = e.target;
      const isEditingControl = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement;
      if ((e.altKey && e.key === 'ArrowDown') || (!isEditingControl && e.key === 'ArrowDown')) {
        e.preventDefault();
        void handleNext();
        return;
      }
      if ((e.altKey && e.key === 'ArrowUp') || (!isEditingControl && e.key === 'ArrowUp')) {
        e.preventDefault();
        handlePrev();
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        const activeQuestion = form?.questions[currentIdx];
        if (activeQuestion?.type !== 'long_text' || e.ctrlKey || e.metaKey) {
          e.preventDefault();
          void handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, form, stage, handleNext, handlePrev, handleStart]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(current => ({ ...current, [questionId]: value }));
    setError('');
  };

  const handleFileUpload = async (questionId: string, file: File) => {
    setUploading(true);
    setError('');
    try {
      const { url } = await uploadFile(file);
      handleAnswerChange(questionId, url);
    } catch (e) {
      setError('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F4F4F4] text-gray-600 text-lg">
        {loadError}
      </div>
    );
  }
  if (!form) return null;

  const theme = form.theme || { primary_color: '#007a87', background_color: '#FFFFFF', font_family: 'DM Sans', dark_mode: false };
  const bgColor = theme.dark_mode && (!theme.background_color || theme.background_color.toUpperCase() === '#FFFFFF')
    ? '#191919'
    : theme.background_color;
  const textColor = theme.dark_mode ? 'text-white' : 'text-[#191919]';
  const subtextColor = theme.dark_mode ? 'text-gray-400' : 'text-gray-500';
  const fontFamily = theme.font_family === 'Karla'
    ? 'var(--font-karla), Karla, sans-serif'
    : !theme.font_family || theme.font_family === 'sans-serif' || theme.font_family === 'DM Sans'
      ? 'var(--font-dm-sans), "DM Sans", Arial, sans-serif'
      : theme.font_family;

  const PoweredBy = () => (
    <a
      href="https://www.typeform.com"
      target="_blank"
      rel="noreferrer"
      className={`fixed bottom-4 left-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm ${theme.dark_mode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white text-[#191919] hover:bg-gray-50'}`}
      style={{ fontFamily: 'sans-serif' }}
    >
      <span className={`font-extrabold tracking-tight ${theme.dark_mode ? 'text-white' : 'text-[#191919]'}`}>Typeform</span>
      <span className={subtextColor}>| powered by you</span>
    </a>
  );

  if (stage === 'loading') {
    return <div className="h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }} />;
  }

  if (stage === 'welcome') {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: bgColor, fontFamily }}>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col items-center justify-center px-6"
          >
            <h1 className={`text-4xl md:text-5xl font-bold text-center max-w-3xl leading-tight ${textColor}`}>
              {form.title}
            </h1>
            <p className={`mt-5 text-lg text-center max-w-xl ${subtextColor}`}>
              It will take about a minute. Ready?
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              className="mt-10 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-sm flex items-center gap-2"
              style={{ backgroundColor: theme.primary_color }}
            >
              Start
            </motion.button>
            <p className={`mt-3 text-xs ${subtextColor}`}>press <strong>Enter ↵</strong></p>
            {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p>}
          </motion.div>
        </AnimatePresence>
        <PoweredBy />
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="h-screen flex flex-col" style={{ backgroundColor: bgColor, fontFamily }}>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${textColor}`}>
              {theme.thank_you_title || 'All done!'}
            </h1>
            <p className={`text-lg ${subtextColor}`}>
              {theme.thank_you_message || 'Thanks for your time!'}
            </p>
          </motion.div>
        </div>
        <PoweredBy />
      </div>
    );
  }

  const activeQuestion = form.questions[currentIdx];
  if (!activeQuestion) {
     return <div className="h-screen flex items-center justify-center text-gray-500">This typeform has no questions.</div>;
  }

  const progress = ((currentIdx) / form.questions.length) * 100;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: bgColor, fontFamily }}>
      <div className="h-1 bg-black/10 w-full fixed top-0 z-50">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, backgroundColor: theme.primary_color }}
        />
      </div>

      <div className="flex-1 flex flex-col justify-center relative max-w-4xl w-full mx-auto p-6 md:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeQuestion.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full"
          >
            <div className="flex items-start gap-4 mb-4">
               <span className="font-bold mt-1 text-lg flex items-center gap-2 shrink-0" style={{ color: theme.primary_color }}>
                 {currentIdx + 1} <span className="opacity-70">→</span>
               </span>
               <div className="flex-1">
                 <h2 className={`text-2xl md:text-3xl font-normal leading-snug ${textColor}`}>
                   {activeQuestion.title}
                   {activeQuestion.is_required && <span className="text-red-500 ml-2">*</span>}
                 </h2>
                 {activeQuestion.description && (
                   <p className={`text-lg md:text-xl mt-4 leading-relaxed ${subtextColor}`}>
                     {activeQuestion.description}
                   </p>
                 )}
               </div>
            </div>

            <div className="mt-8 ml-10">
              {(activeQuestion.type === 'short_text' || activeQuestion.type === 'email' || activeQuestion.type === 'number') && (
                <input
                  ref={inputRef}
                  type={activeQuestion.type === 'number' ? 'number' : activeQuestion.type === 'email' ? 'email' : 'text'}
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className={`w-full md:w-3/4 border-b pb-2 text-2xl md:text-3xl bg-transparent focus:outline-none transition-colors ${theme.dark_mode ? 'text-white placeholder-gray-600' : 'text-[#191919] placeholder-gray-300'}`}
                  style={{ borderBottomColor: answers[activeQuestion.id] ? theme.primary_color : (theme.dark_mode ? '#4b5563' : '#d1d5db') }}
                  autoFocus
                />
              )}

              {activeQuestion.type === 'long_text' && (
                <textarea
                  ref={inputRef}
                  value={answers[activeQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(activeQuestion.id, e.target.value)}
                  placeholder="Type your answer here..."
                  className={`w-full md:w-3/4 border-b pb-2 text-xl md:text-2xl bg-transparent focus:outline-none transition-colors min-h-[100px] resize-none ${theme.dark_mode ? 'text-white placeholder-gray-600' : 'text-[#191919] placeholder-gray-300'}`}
                  style={{ borderBottomColor: answers[activeQuestion.id] ? theme.primary_color : (theme.dark_mode ? '#4b5563' : '#d1d5db') }}
                  autoFocus
                />
              )}

              {activeQuestion.type === 'multiple_choice' && (
                <div className="space-y-3 mt-4">
                  {activeQuestion.settings?.choices?.map((choice, i) => {
                    const isSelected = answers[activeQuestion.id] === choice;
                    const letter = String.fromCharCode(65 + i);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          handleAnswerChange(activeQuestion.id, choice);
                          setTimeout(() => handleNext({ ...answers, [activeQuestion.id]: choice }), 400);
                        }}
                        className={`group flex items-center p-3 rounded-md cursor-pointer transition-all max-w-md border ${isSelected ? '' : 'hover:bg-black/5'}`}
                        style={{
                          borderColor: isSelected ? theme.primary_color : (theme.dark_mode ? '#4b5563' : '#e5e7eb'),
                          backgroundColor: isSelected ? theme.primary_color + '10' : 'transparent',
                        }}
                      >
                        <div
                          className={`w-7 h-7 flex items-center justify-center rounded text-sm font-semibold mr-4 border shrink-0`}
                          style={
                            isSelected
                              ? { backgroundColor: theme.primary_color, borderColor: theme.primary_color, color: '#fff' }
                              : { backgroundColor: theme.dark_mode ? '#1f2937' : '#fff', borderColor: theme.dark_mode ? '#4b5563' : '#d1d5db', color: theme.dark_mode ? '#d1d5db' : '#6b7280' }
                          }
                        >
                          {letter}
                        </div>
                        <span className={`text-lg ${isSelected ? 'font-medium' : ''} ${textColor}`}>
                          {choice}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeQuestion.type === 'dropdown' && (
                <select
                  ref={inputRef}
                  value={answers[activeQuestion.id] || ''}
                  onChange={(event) => handleAnswerChange(activeQuestion.id, event.target.value)}
                  className={`w-full md:w-3/4 border rounded-lg px-4 py-3 text-lg bg-transparent focus:outline-none focus:ring-2 ${theme.dark_mode ? 'text-white border-gray-600 bg-gray-900' : 'text-[#191919] border-gray-300 bg-white'}`}
                >
                  <option value="" disabled>Select an option…</option>
                  {(activeQuestion.settings?.choices || []).map(choice => <option key={choice} value={choice}>{choice}</option>)}
                </select>
              )}

              {activeQuestion.type === 'yes_no' && (
                <div className="flex gap-4 mt-4">
                  {['Yes', 'No'].map((choice) => {
                    const isSelected = answers[activeQuestion.id] === choice;
                    const letter = choice === 'Yes' ? 'Y' : 'N';
                    return (
                      <div
                        key={choice}
                        onClick={() => {
                          handleAnswerChange(activeQuestion.id, choice);
                          setTimeout(() => handleNext({ ...answers, [activeQuestion.id]: choice }), 400);
                        }}
                        className={`group flex items-center px-6 py-4 rounded-md cursor-pointer transition-all border ${isSelected ? '' : 'hover:bg-black/5'}`}
                        style={{
                          borderColor: isSelected ? theme.primary_color : (theme.dark_mode ? '#4b5563' : '#e5e7eb'),
                          backgroundColor: isSelected ? theme.primary_color + '10' : 'transparent',
                        }}
                      >
                        <div
                          className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold mr-3 border shrink-0"
                          style={
                            isSelected
                              ? { backgroundColor: theme.primary_color, borderColor: theme.primary_color, color: '#fff' }
                              : { backgroundColor: theme.dark_mode ? '#1f2937' : '#fff', borderColor: theme.dark_mode ? '#4b5563' : '#d1d5db', color: theme.dark_mode ? '#d1d5db' : '#6b7280' }
                          }
                        >
                          {letter}
                        </div>
                        <span className={`text-xl ${isSelected ? 'font-medium' : ''} ${textColor}`}>
                          {choice}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {activeQuestion.type === 'rating' && (
                <div className="flex gap-2 mt-4">
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const currentRating = parseInt(answers[activeQuestion.id] || '0');
                    return (
                      <button
                        key={rating}
                        onClick={() => {
                          handleAnswerChange(activeQuestion.id, rating.toString());
                          setTimeout(() => handleNext({ ...answers, [activeQuestion.id]: rating.toString() }), 400);
                        }}
                        className={`w-14 h-14 flex items-center justify-center text-3xl transition-transform hover:scale-110 focus:outline-none ${rating <= currentRating ? '' : (theme.dark_mode ? 'text-gray-700 hover:text-gray-600' : 'text-gray-200 hover:text-gray-300')}`}
                        style={rating <= currentRating ? { color: theme.primary_color } : {}}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
              )}

              {activeQuestion.type === 'file_upload' && (
                <div className="mt-4">
                  {answers[activeQuestion.id] ? (
                    <div className={`p-4 rounded-md flex items-center gap-3 max-w-md border ${theme.dark_mode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                      <Check className="text-green-500" size={18} />
                      <span className={textColor}>File uploaded successfully</span>
                      <button onClick={() => {
                        const newAnswers = {...answers};
                        delete newAnswers[activeQuestion.id];
                        setAnswers(newAnswers);
                      }} className="ml-auto text-sm text-red-500">Remove</button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full md:w-3/4 h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${theme.dark_mode ? 'border-gray-600 hover:bg-gray-800/50' : 'border-gray-300 hover:bg-gray-50'}`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className={`w-8 h-8 mb-3 ${subtextColor}`} />
                        <p className={`mb-2 text-sm ${subtextColor}`}><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(activeQuestion.id, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  )}
                  {uploading && <div className={`mt-2 text-sm ${subtextColor}`}>Uploading...</div>}
                </div>
              )}

              {error && (
                <div className="mt-4 text-red-700 bg-red-50 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800 p-3 rounded-md text-sm inline-block">
                  {error}
                </div>
              )}

              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => void handleNext()}
                  className="text-white px-6 py-2 md:py-2.5 rounded-lg font-semibold text-lg transition-opacity hover:opacity-90 focus:outline-none flex items-center gap-2 shadow-sm"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  {currentIdx === form.questions.length - 1 ? 'Submit' : 'OK'} <Check size={20} />
                </button>
                <span className={`text-xs font-medium hidden md:inline-block ${subtextColor}`}>press <strong>Enter ↵</strong></span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-4 right-4 p-0 flex gap-2 z-40">
        <button
          onClick={handlePrev}
          disabled={currentIdx === 0}
          className={`w-11 h-11 flex items-center justify-center rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm ${theme.dark_mode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <ChevronUp size={20} />
        </button>
        <button
          onClick={() => void handleNext()}
          className={`w-11 h-11 flex items-center justify-center rounded-full transition-colors shadow-sm ${theme.dark_mode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          <ChevronDown size={20} />
        </button>
      </div>

      <PoweredBy />
    </div>
  );
}
