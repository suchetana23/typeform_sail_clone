'use client';

import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Check, ChevronDown, ChevronRight,
  GripVertical, List, Mail, MonitorSmartphone, Moon, Plus, Settings, Share2, Sun, Trash2, Type,
  Upload, X, AlignLeft, Hash, ToggleLeft, Star, Palette, Eye, Info,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Form, FormTheme, LogicJump, Question, QuestionType } from '@/types';
import { Logo } from '@/components/Logo';

type QuestionTypeOption = { type: QuestionType; label: string; description: string; icon: typeof Type; defaultTitle: string };

const QUESTION_TYPES: QuestionTypeOption[] = [
  { type: 'short_text', label: 'Short text', description: 'A concise text response', icon: Type, defaultTitle: 'Your question goes here' },
  { type: 'long_text', label: 'Long text', description: 'A longer written response', icon: AlignLeft, defaultTitle: 'Your question goes here' },
  { type: 'multiple_choice', label: 'Multiple choice', description: 'Choose one of several options', icon: List, defaultTitle: 'Pick one' },
  { type: 'dropdown', label: 'Dropdown', description: 'Select from a compact list', icon: ChevronDown, defaultTitle: 'Pick one from the list' },
  { type: 'email', label: 'Email', description: 'Collect an email address', icon: Mail, defaultTitle: "What's your email address?" },
  { type: 'number', label: 'Number', description: 'Collect a numeric answer', icon: Hash, defaultTitle: 'How many?' },
  { type: 'yes_no', label: 'Yes / No', description: 'A simple two-option answer', icon: ToggleLeft, defaultTitle: 'Yes or no?' },
  { type: 'rating', label: 'Rating', description: 'Rate from one to five', icon: Star, defaultTitle: 'How would you rate your experience?' },
  { type: 'file_upload', label: 'File upload', description: 'Let people attach a file', icon: Upload, defaultTitle: 'Upload a file' },
];

const FALLBACK_THEME: FormTheme = {
  primary_color: '#007a87', background_color: '#ffffff', font_family: 'Karla', dark_mode: false,
};

type SortableQuestionProps = {
  question: Question;
  number: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
};

function SortableQuestionRow({ question, number, active, onSelect, onDelete }: SortableQuestionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const Icon = QUESTION_TYPES.find(item => item.type === question.type)?.icon ?? Type;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className={`group flex items-center gap-1.5 rounded-lg pr-1 transition-colors ${active ? 'bg-[#e9f4f3] dark:bg-[#283837]' : 'hover:bg-[#f0f0ef] dark:hover:bg-white/[0.06]'}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={event => event.stopPropagation()}
        title="Drag to reorder"
        aria-label={`Drag to reorder ${question.title || 'question'}`}
        className="shrink-0 cursor-grab touch-none rounded-md p-1 text-[#9a969b] hover:text-[#454148] active:cursor-grabbing dark:hover:text-white"
      >
        <GripVertical size={15} />
      </button>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold ${active ? 'border-[#a9ceca] bg-white text-[#007a87] dark:border-[#416966] dark:bg-[#202b2a] dark:text-[#8ad4cc]' : 'border-[#dfdcdf] bg-white text-[#716d73] dark:border-[#4a484a] dark:bg-[#272627] dark:text-[#c5c0c5]'}`}>
          {number <= 26 ? String.fromCharCode(64 + number) : <Icon size={13} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#39363c] dark:text-[#eeebee]">{question.title || 'Untitled question'}</span>
      </button>
      <button type="button" onClick={onDelete} title={`Delete ${question.title || 'question'}`} aria-label={`Delete ${question.title || 'question'}`} className="rounded-md p-1 text-[#aaa6aa] opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-300">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007a87]/35 ${checked ? 'bg-[#007a87]' : 'bg-[#d5d2d5] dark:bg-[#575357]'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

interface BuilderWorkspaceProps {
  form: Form;
  activeQuestion: Question | undefined;
  isDark: boolean;
  toggleDark: () => void;
  onSelectQuestion: (questionId: string | null) => void;
  onReorder: (event: DragEndEvent) => void;
  onAddQuestion: (type: QuestionType) => Promise<boolean>;
  addingType: QuestionType | null;
  pickerError: string;
  onDeleteQuestion: (questionId: string) => void;
  onUpdateQuestion: (updates: Partial<Question>) => void;
  onUpdateTheme: (updates: Partial<FormTheme>) => void;
  onTitleChange: (title: string) => void;
  onSaveTitle: (title: string) => void;
  onPublish: () => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export default function BuilderWorkspace({
  form, activeQuestion, isDark, toggleDark, onSelectQuestion, onReorder, onAddQuestion,
  addingType, pickerError, onDeleteQuestion, onUpdateQuestion, onUpdateTheme,
  onTitleChange, onSaveTitle, onPublish, onToast,
}: BuilderWorkspaceProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState<'question' | 'design' | 'ending'>('question');
  const [mobilePreview, setMobilePreview] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [pageRailOpen, setPageRailOpen] = useState(true);
  const [pagesHeight, setPagesHeight] = useState(68);
  const [notice, setNotice] = useState<string | null>(null);
  const theme = { ...FALLBACK_THEME, ...(form.theme || {}) };
  const orderedQuestions = useMemo(() => [...form.questions].sort((a, b) => a.order - b.order), [form.questions]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const canvasText = theme.dark_mode ? '#f7f4f7' : '#29252a';
  const canvasMuted = theme.dark_mode ? '#b7b1b7' : '#777179';
  const canvasBackground = theme.dark_mode && theme.background_color.toLowerCase() === '#ffffff' ? '#242126' : theme.background_color;
  const panelBackground = isDark ? '#232124' : '#ffffff';
  const separatorClass = isDark ? 'border-[#3d393e]' : 'border-[#e8e5e8]';

  useEffect(() => {
    if (!addOpen && !notice) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAddOpen(false);
      setNotice(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [addOpen, notice]);

  const updateChoices = (choices: string[]) => {
    if (activeQuestion) onUpdateQuestion({ settings: { ...activeQuestion.settings, choices } });
  };

  const updateLogic = (logicJumps: LogicJump[]) => {
    if (activeQuestion) onUpdateQuestion({ settings: { ...activeQuestion.settings, logic_jumps: logicJumps } });
  };

  const openDesignPanel = () => {
    if (!activeQuestion && orderedQuestions.length > 0) onSelectQuestion(orderedQuestions[0].id);
    setSidePanel('design');
    setMobileInspectorOpen(true);
  };

  const openFeatureNotice = (feature: string) => {
    setNotice(`${feature} is coming soon.`);
  };

  const shareForm = async () => {
    const url = `${window.location.origin}/to/${form.id}`;
    if (!form.is_published) {
      onToast('Publish your form before sharing it.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      onToast('Share link copied to clipboard.');
    } catch {
      onToast(url, 'success');
    }
  };

  const handleEndingResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = event.currentTarget.parentElement;
    if (!panel) return;
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panel.getBoundingClientRect().height * (100 - pagesHeight) / 100;
    const move = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight - (moveEvent.clientY - startY);
      const nextPercent = Math.max(17, Math.min(55, nextHeight / panel.clientHeight * 100));
      setPagesHeight(100 - nextPercent);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const handleEndingSeparatorKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowUp') { event.preventDefault(); setPagesHeight(value => Math.max(45, value - 3)); }
    if (event.key === 'ArrowDown') { event.preventDefault(); setPagesHeight(value => Math.min(83, value + 3)); }
  };

  return (
    <div className="builder-workspace flex h-dvh min-h-[600px] flex-col overflow-hidden bg-[#f7f6f7] text-[13px] text-[#302c32] dark:bg-[#19171a] dark:text-[#f3eff3]" style={{ fontFamily: 'var(--font-karla), Karla, sans-serif', ['--creator-panel' as string]: panelBackground }}>
      <header className={`z-20 flex h-[58px] shrink-0 items-center justify-between border-b px-4 ${separatorClass} bg-white dark:bg-[#232124]`}>
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" aria-label="Back to forms" title="Back to forms" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777179] hover:bg-black/5 hover:text-[#29252a] dark:text-[#bab4ba] dark:hover:bg-white/[0.07] dark:hover:text-white">
            <ArrowLeft size={17} />
          </Link>
          <div className="hidden items-center md:flex"><Logo className="text-[17px]" /></div>
          <span className={`hidden h-6 border-l md:block ${separatorClass}`} />
          <div className="min-w-0">
            <input
              aria-label="Form title"
              value={form.title}
              onChange={event => onTitleChange(event.target.value)}
              onBlur={event => onSaveTitle(event.target.value)}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              className="max-w-[min(44vw,360px)] rounded-md bg-transparent px-2 py-1 text-[14px] font-semibold text-[#302c32] outline-none transition hover:bg-black/[0.035] focus:bg-white focus:ring-2 focus:ring-[#007a87]/25 dark:text-white dark:hover:bg-white/[0.05] dark:focus:bg-[#1a191b]"
            />
          </div>
          <span className="hidden rounded-full bg-[#f1eff1] px-2 py-1 text-[11px] font-medium text-[#777179] sm:inline-flex dark:bg-[#363237] dark:text-[#c5bfc5]">{form.is_published ? 'Published' : 'Draft'}</span>
        </div>

        <nav aria-label="Form sections" className="hidden h-full items-center gap-1 lg:flex">
          <button type="button" aria-current="page" className="relative h-full px-4 text-[13px] font-semibold text-[#2b272c] dark:text-white">Content<span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#29252a] dark:bg-white" /></button>
          <button type="button" onClick={() => openFeatureNotice('Workflow tools')} className="h-full cursor-not-allowed px-4 text-[13px] font-medium text-[#aaa5ac] dark:text-[#817b83]">Workflow</button>
          <button type="button" onClick={() => openFeatureNotice('Connect and integrations')} className="h-full cursor-not-allowed px-4 text-[13px] font-medium text-[#aaa5ac] dark:text-[#817b83]">Connect</button>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={toggleDark} aria-label={isDark ? 'Switch creator to light mode' : 'Switch creator to dark mode'} title={isDark ? 'Light mode' : 'Dark mode'} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777179] hover:bg-black/5 dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button type="button" onClick={() => void shareForm()} className="hidden h-8 items-center gap-2 rounded-lg border border-[#dedade] px-3 font-semibold text-[#4a454c] hover:bg-[#f7f6f7] sm:flex dark:border-[#48444a] dark:text-[#e3dee3] dark:hover:bg-[#302d31]"><Share2 size={15} />Share</button>
          <Link href={`/to/${form.id}`} target="_blank" className="hidden h-8 items-center gap-2 rounded-lg px-3 font-semibold text-[#4a454c] hover:bg-[#f1eff1] sm:flex dark:text-[#e3dee3] dark:hover:bg-white/[0.06]"><Eye size={15} />Preview</Link>
          <button type="button" onClick={onPublish} className={`h-8 rounded-lg px-4 text-[13px] font-semibold text-white shadow-sm transition-colors ${form.is_published ? 'bg-[#007a87] hover:bg-[#006b76]' : 'bg-[#29252a] hover:bg-[#171518] dark:bg-[#f1edf1] dark:text-[#272329] dark:hover:bg-white'}`}>
            {form.is_published ? 'Published' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {pageRailOpen && <button type="button" aria-label="Close pages panel" onClick={() => setPageRailOpen(false)} className="absolute inset-0 z-20 bg-black/20 md:hidden" />}
        {pageRailOpen && (
          <aside className={`absolute inset-y-0 left-0 z-30 flex w-[272px] shrink-0 flex-col border-r bg-white shadow-xl md:relative md:z-auto md:shadow-none dark:bg-[#232124] ${separatorClass}`} aria-label="Question pages and endings">
            <section className="flex min-h-0 flex-col px-3 pt-4" style={{ height: `${pagesHeight}%` }}>
              <div className="mb-3 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-[#39353b] dark:text-[#eeeaee]">Pages</h2>
                  <button type="button" onClick={() => setPageRailOpen(false)} aria-label="Hide pages panel" title="Hide pages panel" className="flex h-7 w-7 items-center justify-center rounded-lg text-[#777179] hover:bg-[#f4f2f4] lg:hidden dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]">
                    <PanelLeftClose size={15} />
                  </button>
                </div>
                <span className="text-[10px] text-[#969098]">1 page</span>
              </div>
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#f5f3f5] px-2.5 py-2 dark:bg-[#302d31]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[11px] font-semibold text-[#5b565e] shadow-sm dark:bg-[#413d43] dark:text-[#e2dde2]">1</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#464149] dark:text-[#e6e1e6]">Questions</span>
                <span className="text-[10px] text-[#969098]">Edit below</span>
              </div>
              <div className="mb-2 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#969098] dark:text-[#a49ea5]">
                <span>Questions</span><span>{orderedQuestions.length}</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onReorder}>
                <SortableContext items={orderedQuestions.map(question => question.id)} strategy={verticalListSortingStrategy}>
                  <div className="min-h-0 flex-1 overflow-y-auto px-1">
                    {orderedQuestions.map((question, index) => (
                      <SortableQuestionRow
                        key={question.id}
                        question={question}
                        number={index + 1}
                        active={activeQuestion?.id === question.id}
                        onSelect={() => { onSelectQuestion(question.id); setSidePanel('question'); setMobileInspectorOpen(true); if (window.matchMedia('(max-width: 767px)').matches) setPageRailOpen(false); }}
                        onDelete={() => onDeleteQuestion(question.id)}
                      />
                    ))}
                    {orderedQuestions.length === 0 && <div className="px-3 py-6 text-center text-[12px] leading-5 text-[#8f8991] dark:text-[#aaa4ab]">Add your first question to start building your form.</div>}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            <div
              role="separator"
              aria-label="Resize pages and endings panels"
              aria-orientation="horizontal"
              aria-valuemin={45}
              aria-valuemax={83}
              aria-valuenow={Math.round(pagesHeight)}
              tabIndex={0}
              onPointerDown={handleEndingResize}
              onKeyDown={handleEndingSeparatorKey}
              className={`group relative z-10 flex h-2 shrink-0 cursor-row-resize items-center justify-center border-y ${separatorClass} bg-[#faf9fa] outline-none hover:bg-[#eff7f6] focus-visible:bg-[#eff7f6] dark:bg-[#282629] dark:hover:bg-[#2b3b3a]`}
            ><span className="h-[2px] w-8 rounded-full bg-[#d2cfd3] group-hover:bg-[#007a87] dark:bg-[#555158]" /></div>

            <section className="min-h-[110px] flex-1 overflow-y-auto px-3 pb-3 pt-3">
              <div className="mb-2 flex items-center justify-between px-2">
                <h2 className="text-[13px] font-semibold text-[#39353b] dark:text-[#eeeaee]">Endings</h2>
                <span className="text-[10px] text-[#969098]">1 ending</span>
              </div>
              <button type="button" onClick={() => { onSelectQuestion(null); setSidePanel('ending'); }} className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${sidePanel === 'ending' ? 'border-[#b9d7d4] bg-[#f0f8f7] dark:border-[#436764] dark:bg-[#293938]' : `border-transparent hover:bg-[#f5f3f5] dark:hover:bg-white/[0.05]`}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e9e5ed] text-[#665b75] dark:bg-[#403747] dark:text-[#d1c6dd]"><Check size={15} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-semibold text-[#454048] dark:text-[#eee9ef]">Ending 1</span>
                  <span className="block truncate text-[11px] text-[#8a848d] dark:text-[#b0aab2]">{theme.thank_you_title || 'All done!'}</span>
                </span>
              </button>
              <p className="mt-2 px-2 text-[10px] leading-4 text-[#a29ca4] dark:text-[#918b93]">More endings and branching are coming soon.</p>
            </section>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={`flex h-[46px] shrink-0 items-center justify-between border-b px-3 ${separatorClass} bg-white dark:bg-[#232124]`}>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPageRailOpen(value => !value)} aria-label={pageRailOpen ? 'Hide question panel' : 'Show question panel'} title={pageRailOpen ? 'Hide question panel' : 'Show question panel'} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777179] hover:bg-[#f4f2f4] dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]">{pageRailOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}</button>
              <span className="mx-1 h-5 border-l border-[#e6e2e6] dark:border-[#49454a]" />
              <button type="button" onClick={() => setAddOpen(true)} className="flex h-8 items-center gap-2 rounded-lg bg-[#29252a] px-3 text-[12px] font-semibold text-white hover:bg-[#403a42] dark:bg-[#f1edf1] dark:text-[#272329] dark:hover:bg-white"><Plus size={15} />Add content</button>
              <button type="button" onClick={openDesignPanel} className={`flex h-8 items-center gap-2 rounded-lg px-3 text-[12px] font-medium hover:bg-[#f3f1f3] dark:hover:bg-white/[0.07] ${sidePanel === 'design' ? 'text-[#007a87]' : 'text-[#625d64] dark:text-[#d0cbd1]'}`}><Palette size={15} />Design</button>
            </div>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => setMobilePreview(value => !value)} aria-pressed={mobilePreview} title={mobilePreview ? 'Desktop canvas' : 'Mobile view'} className={`flex h-8 w-8 items-center justify-center rounded-lg ${mobilePreview ? 'bg-[#e8f3f2] text-[#007a87] dark:bg-[#2d4341] dark:text-[#8ad4cc]' : 'text-[#777179] hover:bg-[#f3f1f3] dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]'}`}><MonitorSmartphone size={16} /></button>
              <Link href={`/to/${form.id}`} target="_blank" aria-label="Preview form" title="Preview form" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777179] hover:bg-[#f3f1f3] dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]"><Eye size={16} /></Link>
              <button type="button" onClick={() => mobileInspectorOpen && sidePanel === 'design' ? setMobileInspectorOpen(false) : openDesignPanel()} aria-label="Form design settings" title="Form design settings" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777179] hover:bg-[#f3f1f3] dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]"><Settings size={16} /></button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            <main className={`relative flex min-w-0 flex-1 flex-col items-center overflow-hidden transition-[background-color] ${isDark ? 'bg-[#1b191d]' : 'bg-[#f8f7f8]'}`}>
              <div className="flex min-h-0 flex-1 w-full items-center justify-center overflow-auto px-5 py-8 sm:px-9">
                <div className={`relative flex min-h-[min(620px,74vh)] flex-col overflow-hidden rounded-[18px] border shadow-[0_10px_50px_rgba(34,28,36,0.08)] transition-all duration-200 ${mobilePreview ? 'w-[min(390px,calc(100%-12px))] rounded-[28px] border-[5px] border-[#d5d1d7] dark:border-[#55505a]' : 'w-full max-w-[900px]'} ${theme.dark_mode ? 'border-white/10' : 'border-black/[0.07]'}`} style={{ backgroundColor: canvasBackground, color: canvasText, fontFamily: theme.font_family === 'Karla' || !theme.font_family || theme.font_family === 'sans-serif' ? 'var(--font-karla), Karla, sans-serif' : theme.font_family === 'DM Sans' ? 'var(--font-dm-sans), "DM Sans", Arial, sans-serif' : theme.font_family }}>
                  {activeQuestion ? (
                    <div className="flex flex-1 flex-col justify-center px-7 py-10 sm:px-14 sm:py-14">
                      <div className="mx-auto w-full max-w-[650px]">
                        <div className="mb-4 flex items-start gap-3">
                          <span className="mt-2 shrink-0 text-[15px] font-semibold" style={{ color: theme.primary_color }}>{orderedQuestions.findIndex(question => question.id === activeQuestion.id) + 1}<span className="ml-1 opacity-70">→</span></span>
                          <div className="min-w-0 flex-1">
                            <textarea
                              aria-label="Question title"
                              data-active-question-title
                              value={activeQuestion.title}
                              onChange={event => onUpdateQuestion({ title: event.target.value })}
                              rows={Math.min(4, Math.max(1, Math.ceil(activeQuestion.title.length / 48)))}
                              placeholder="Your question here. Recall information with @"
                              className="w-full resize-none overflow-hidden bg-transparent text-[25px] font-semibold leading-[1.25] tracking-[-0.025em] outline-none placeholder:opacity-35 sm:text-[32px]"
                              style={{ color: canvasText }}
                            />
                            <textarea
                              aria-label="Question description"
                              value={activeQuestion.description || ''}
                              onChange={event => onUpdateQuestion({ description: event.target.value })}
                              rows={Math.max(1, Math.ceil((activeQuestion.description || '').length / 70))}
                              placeholder="Description (optional)"
                              className="mt-2 w-full resize-none overflow-hidden bg-transparent text-[15px] leading-6 outline-none placeholder:opacity-45 sm:text-[16px]"
                              style={{ color: canvasMuted }}
                            />
                          </div>
                        </div>

                        <div className="ml-8 mt-7">
                          {['short_text', 'email', 'number'].includes(activeQuestion.type) && (
                            <div className="max-w-[480px] border-b pb-2 text-[18px]" style={{ borderColor: `${theme.primary_color}90`, color: canvasMuted }}>
                              {activeQuestion.type === 'email' ? 'name@example.com' : activeQuestion.type === 'number' ? 'Type a number…' : 'Type your answer here…'}
                            </div>
                          )}
                          {activeQuestion.type === 'long_text' && <div className="max-w-[520px] border-b pb-10 text-[17px]" style={{ borderColor: `${theme.primary_color}90`, color: canvasMuted }}>Type your answer here…</div>}
                          {activeQuestion.type === 'multiple_choice' && (
                            <div className="max-w-[540px] space-y-2.5">
                              {(activeQuestion.settings?.choices || []).map((choice, index) => <div key={`choice-${index}`} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[14px]" style={{ borderColor: theme.dark_mode ? '#504b52' : '#e3e0e4', color: canvasText }}><span className="flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-semibold" style={{ borderColor: theme.dark_mode ? '#625c65' : '#d5d1d7', color: canvasMuted }}>{String.fromCharCode(65 + index)}</span>{choice || 'Option'}</div>)}
                            </div>
                          )}
                          {activeQuestion.type === 'dropdown' && <div className="flex max-w-[480px] items-center justify-between rounded-xl border px-4 py-3 text-[14px]" style={{ borderColor: theme.dark_mode ? '#504b52' : '#e3e0e4', color: canvasMuted }}>{activeQuestion.settings?.choices?.[0] || 'Select an option'}<ChevronDown size={16} /></div>}
                          {activeQuestion.type === 'yes_no' && <div className="flex flex-wrap gap-2.5">{['Yes', 'No'].map((choice, index) => <div key={choice} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-[14px]" style={{ borderColor: theme.dark_mode ? '#504b52' : '#e3e0e4', color: canvasText }}><span className="flex h-5 w-5 items-center justify-center rounded border text-[10px]" style={{ borderColor: theme.dark_mode ? '#625c65' : '#d5d1d7', color: canvasMuted }}>{index === 0 ? 'Y' : 'N'}</span>{choice}</div>)}</div>}
                          {activeQuestion.type === 'rating' && <div className="flex gap-1">{[1, 2, 3, 4, 5].map(value => <div key={value} className="flex h-11 w-11 items-center justify-center rounded-lg text-[23px]" style={{ color: theme.primary_color }}>☆</div>)}</div>}
                          {activeQuestion.type === 'file_upload' && <div className="flex max-w-[480px] flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center" style={{ borderColor: theme.dark_mode ? '#59535b' : '#d2ced3', color: canvasMuted }}><Upload size={22} className="mb-2" /><span className="text-[13px] font-semibold">Browse files</span><span className="mt-1 text-[11px]">or drag and drop</span></div>}
                          <div className="mt-6 flex items-center gap-2 text-[11px]" style={{ color: canvasMuted }}>
                            <button type="button" className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white" style={{ backgroundColor: theme.primary_color }}>OK <span className="ml-1">↵</span></button>
                            <span>Press <strong>Enter ↵</strong> to continue</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : sidePanel === 'ending' ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${theme.primary_color}18`, color: theme.primary_color }}><Check size={22} /></div>
                      <h1 className="max-w-[600px] text-[30px] font-semibold tracking-tight sm:text-[40px]" style={{ color: canvasText }}>{theme.thank_you_title || 'All done!'}</h1>
                      <p className="mt-4 max-w-[520px] text-[16px] leading-7" style={{ color: canvasMuted }}>{theme.thank_you_message || 'Thanks for your time!'}</p>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5f4] text-[#007a87] dark:bg-[#293b3a] dark:text-[#8ad4cc]"><Plus size={22} /></div>
                      <h2 className="text-[20px] font-semibold" style={{ color: canvasText }}>Add your first question</h2>
                      <p className="mt-2 max-w-[300px] text-[13px] leading-5" style={{ color: canvasMuted }}>Create a question and shape a more conversational way to collect responses.</p>
                      <button type="button" onClick={() => setAddOpen(true)} className="mt-5 rounded-lg px-4 py-2 text-[13px] font-semibold text-white" style={{ backgroundColor: theme.primary_color }}><Plus size={15} className="mr-1.5 inline" />Add content</button>
                    </div>
                  )}
                  <div className="pointer-events-none absolute bottom-4 right-5 text-[10px] font-semibold tracking-wide opacity-35" style={{ color: canvasText }}>TYPEFORM</div>
                </div>
              </div>
              <div className="flex w-full shrink-0 flex-col border-t border-[#e8e5e8] bg-white/95 px-4 py-2 backdrop-blur dark:border-[#3d393e] dark:bg-[#232124]/95 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setAddOpen(true)} className="flex h-8 items-center gap-2 rounded-lg bg-[#29252a] px-3 text-[12px] font-semibold text-white hover:bg-[#403a42] dark:bg-[#f1edf1] dark:text-[#272329]"><Plus size={15} />Add content</button>
                    <button type="button" onClick={openDesignPanel} className="flex h-8 items-center gap-2 rounded-lg px-3 text-[12px] font-medium text-[#625d64] hover:bg-[#f2f0f2] dark:text-[#d0cbd1] dark:hover:bg-white/[0.07]"><Palette size={15} />Design</button>
                  </div>
                  <button type="button" onClick={() => setMobilePreview(value => !value)} aria-pressed={mobilePreview} className="flex h-7 w-7 items-center justify-center rounded-lg text-[#777179] hover:bg-[#f2f0f2] dark:text-[#bcb6bc] dark:hover:bg-white/[0.07]" title="Toggle mobile preview"><MonitorSmartphone size={15} /></button>
                </div>
              </div>
            </main>

            <aside className={`${mobileInspectorOpen ? 'fixed inset-y-[104px] right-0 z-[60] flex w-[min(88vw,320px)] shadow-2xl' : 'hidden'} shrink-0 flex-col border-l bg-white lg:relative lg:inset-auto lg:z-auto lg:flex lg:w-[300px] lg:shadow-none dark:bg-[#232124] ${separatorClass}`} aria-label={sidePanel === 'question' ? 'Question settings' : sidePanel === 'design' ? 'Form design settings' : 'Ending settings'}>
              <div className={`flex h-[46px] shrink-0 items-center justify-between border-b px-4 ${separatorClass}`}>
                <h2 className="text-[13px] font-semibold text-[#454048] dark:text-[#eee9ef]">{sidePanel === 'question' ? 'Question' : sidePanel === 'design' ? 'Design' : 'Ending'}</h2>
                <div className="flex items-center gap-2">
                  {sidePanel === 'question' && activeQuestion && <span className="rounded-md bg-[#f3f1f3] px-2 py-1 text-[10px] font-medium capitalize text-[#777179] dark:bg-[#38343a] dark:text-[#bcb6bc]">{activeQuestion.type.replace('_', ' ')}</span>}
                  <button type="button" onClick={() => setMobileInspectorOpen(false)} aria-label="Close settings panel" className="rounded-md p-1 text-[#8f8991] hover:bg-[#f2f0f2] lg:hidden dark:hover:bg-white/[0.08]"><X size={15} /></button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {sidePanel === 'question' && activeQuestion && (
                  <div className="space-y-2.5">
                    <details open className="rounded-xl border border-[#e9e6e9] dark:border-[#403c42]">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-[12px] font-semibold text-[#514c54] dark:text-[#e3dee3]"><span>Question</span><ChevronDown size={14} /></summary>
                      <div className="space-y-3 px-3 pb-3">
                        <label className="block text-[11px] font-medium text-[#777179] dark:text-[#bcb6bc]">Question type</label>
                        <div className="flex items-center gap-2 rounded-lg bg-[#f6f4f6] px-2.5 py-2 text-[12px] capitalize text-[#48434a] dark:bg-[#302d31] dark:text-[#e3dee3]">{(() => { const Icon = QUESTION_TYPES.find(item => item.type === activeQuestion.type)?.icon ?? Type; return <Icon size={14} />; })()}{activeQuestion.type.replace('_', ' ')}</div>
                        <label className="block text-[11px] font-medium text-[#777179] dark:text-[#bcb6bc]">Question text</label>
                        <textarea aria-label="Question title" value={activeQuestion.title} onChange={event => onUpdateQuestion({ title: event.target.value })} rows={2} className="builder-textarea-no-scroll w-full rounded-lg border border-[#e4e0e5] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#63aaa5] dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" />
                        <label className="block text-[11px] font-medium text-[#777179] dark:text-[#bcb6bc]">Description / help text</label>
                        <textarea aria-label="Question description" value={activeQuestion.description || ''} onChange={event => onUpdateQuestion({ description: event.target.value })} rows={2} placeholder="Add extra context" className="builder-textarea-no-scroll w-full rounded-lg border border-[#e4e0e5] bg-white px-2.5 py-2 text-[12px] outline-none focus:border-[#63aaa5] dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" />
                        <label className="flex items-center justify-between text-[12px] font-medium text-[#514c54] dark:text-[#e3dee3]">Required<Switch checked={activeQuestion.is_required} label="Required question" onChange={is_required => onUpdateQuestion({ is_required })} /></label>
                        {(activeQuestion.type === 'multiple_choice' || activeQuestion.type === 'dropdown') && <div className="space-y-2 border-t border-[#eeebee] pt-3 dark:border-[#403c42]">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-[#777179] dark:text-[#bcb6bc]"><span>Answer options</span><span>{activeQuestion.settings?.choices?.length || 0}</span></div>
                          {(activeQuestion.settings?.choices || []).map((choice, index) => <div key={`option-${index}`} className="flex items-center gap-1.5"><span className="w-4 text-[10px] text-[#a39da5]">{String.fromCharCode(65 + index)}</span><input aria-label={`Answer option ${index + 1}`} value={choice} onChange={event => { const next = [...(activeQuestion.settings?.choices || [])]; next[index] = event.target.value; updateChoices(next); }} className="h-8 min-w-0 flex-1 rounded-lg border border-[#e4e0e5] bg-white px-2 text-[12px] outline-none focus:border-[#63aaa5] dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" /><button type="button" onClick={() => updateChoices((activeQuestion.settings?.choices || []).filter((_, choiceIndex) => choiceIndex !== index))} aria-label={`Remove answer option ${index + 1}`} className="rounded p-1 text-[#aaa4ab] hover:text-red-500"><X size={14} /></button></div>)}
                          <button type="button" onClick={() => updateChoices([...(activeQuestion.settings?.choices || []), `Option ${(activeQuestion.settings?.choices?.length || 0) + 1}`])} className="flex items-center gap-1 text-[11px] font-semibold text-[#007a87] hover:underline dark:text-[#8ad4cc]"><Plus size={13} />Add option</button>
                        </div>}
                      </div>
                    </details>
                    <details className="rounded-xl border border-[#e9e6e9] dark:border-[#403c42]">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-[12px] font-semibold text-[#514c54] dark:text-[#e3dee3]"><span>Logic</span><ChevronDown size={14} /></summary>
                      <div className="space-y-2 px-3 pb-3">
                        {(activeQuestion.settings?.logic_jumps || []).map((jump, index) => <div key={index} className="space-y-2 rounded-lg bg-[#f7f5f7] p-2.5 dark:bg-[#302d31]"><div className="flex items-center justify-between text-[11px] text-[#777179] dark:text-[#bcb6bc]">If answer is <button type="button" onClick={() => updateLogic((activeQuestion.settings?.logic_jumps || []).filter((_, jumpIndex) => jumpIndex !== index))} aria-label="Remove logic rule" className="text-[#aaa4ab] hover:text-red-500"><Trash2 size={13} /></button></div><input value={jump.value} onChange={event => { const next = [...(activeQuestion.settings?.logic_jumps || [])]; next[index] = { ...next[index], value: event.target.value }; updateLogic(next); }} placeholder="Answer value" className="h-8 w-full rounded-lg border border-[#e4e0e5] bg-white px-2 text-[11px] outline-none dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" /><select aria-label="Jump to question" value={jump.jump_to} onChange={event => { const next = [...(activeQuestion.settings?.logic_jumps || [])]; next[index] = { ...next[index], jump_to: event.target.value }; updateLogic(next); }} className="h-8 w-full rounded-lg border border-[#e4e0e5] bg-white px-2 text-[11px] outline-none dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white"><option value="">Jump to…</option>{orderedQuestions.filter(question => question.id !== activeQuestion.id && question.order > activeQuestion.order).map(question => <option key={question.id} value={question.id}>{question.title}</option>)}</select></div>)}
                        <button type="button" onClick={() => updateLogic([...(activeQuestion.settings?.logic_jumps || []), { condition: 'equals', value: '', jump_to: '' }])} className="flex items-center gap-1 text-[11px] font-semibold text-[#007a87] hover:underline dark:text-[#8ad4cc]"><Plus size={13} />Add logic rule</button>
                        <p className="text-[10px] leading-4 text-[#969098] dark:text-[#aaa4ab]">Branching stays optional; rules only route to later questions.</p>
                      </div>
                    </details>
                    <details className="rounded-xl border border-[#e9e6e9] dark:border-[#403c42]">
                      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-[12px] font-semibold text-[#514c54] dark:text-[#e3dee3]"><span>Comments</span><ChevronDown size={14} /></summary>
                      <p className="px-3 pb-3 text-[11px] leading-4 text-[#8c868e] dark:text-[#aaa4ab]">Comments and team collaboration are coming soon.</p>
                    </details>
                  </div>
                )}
                {sidePanel === 'question' && !activeQuestion && <p className="py-5 text-[12px] leading-5 text-[#858087] dark:text-[#aaa4ab]">Select a question on the left to edit its content and settings.</p>}
                {sidePanel === 'ending' && <div className="space-y-4"><div className="rounded-xl bg-[#f5f3f5] p-3 text-[11px] leading-4 text-[#777179] dark:bg-[#302d31] dark:text-[#bcb6bc]">This ending appears when someone completes the form.</div><label className="block text-[11px] font-semibold text-[#777179] dark:text-[#bcb6bc]">Thank-you title<input aria-label="Thank-you title" value={theme.thank_you_title || ''} onChange={event => onUpdateTheme({ thank_you_title: event.target.value })} placeholder="All done!" className="mt-1.5 h-9 w-full rounded-lg border border-[#e4e0e5] bg-white px-2.5 text-[12px] font-normal text-[#38343a] outline-none focus:border-[#63aaa5] dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" /></label><label className="block text-[11px] font-semibold text-[#777179] dark:text-[#bcb6bc]">Thank-you message<textarea aria-label="Thank-you message" value={theme.thank_you_message || ''} onChange={event => onUpdateTheme({ thank_you_message: event.target.value })} placeholder="Thanks for your time!" rows={4} className="mt-1.5 w-full resize-y rounded-lg border border-[#e4e0e5] bg-white px-2.5 py-2 text-[12px] font-normal text-[#38343a] outline-none focus:border-[#63aaa5] dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" /></label><div className="rounded-lg border border-dashed border-[#dfdbdf] p-3 text-[10px] leading-4 text-[#89838b] dark:border-[#49454b] dark:text-[#aaa4ab]">Multiple endings and branching are coming soon.</div></div>}
                {sidePanel === 'design' && <div className="space-y-5">
                  <div><h3 className="text-[12px] font-semibold text-[#514c54] dark:text-[#e3dee3]">Colors</h3><p className="mt-1 text-[10px] leading-4 text-[#908a92] dark:text-[#aaa4ab]">These choices style the form respondents see.</p></div>
                  <label className="flex items-center gap-3 text-[11px] font-medium text-[#66616a] dark:text-[#d0cbd1]"><input type="color" aria-label="Accent color" value={theme.primary_color} onChange={event => onUpdateTheme({ primary_color: event.target.value })} className="h-9 w-10 cursor-pointer rounded-md border border-[#e4e0e5] bg-white p-1 dark:border-[#4a454d] dark:bg-[#2d2a2f]" /><span>Accent color <span className="block font-mono text-[10px] text-[#969098]">{theme.primary_color}</span></span></label>
                  <label className="flex items-center gap-3 text-[11px] font-medium text-[#66616a] dark:text-[#d0cbd1]"><input type="color" aria-label="Form background color" value={theme.background_color} onChange={event => onUpdateTheme({ background_color: event.target.value })} className="h-9 w-10 cursor-pointer rounded-md border border-[#e4e0e5] bg-white p-1 dark:border-[#4a454d] dark:bg-[#2d2a2f]" /><span>Background <span className="block font-mono text-[10px] text-[#969098]">{theme.background_color}</span></span></label>
                  <label className="block text-[11px] font-semibold text-[#777179] dark:text-[#bcb6bc]">Font<select aria-label="Form font" value={theme.font_family} onChange={event => onUpdateTheme({ font_family: event.target.value })} className="mt-1.5 h-9 w-full rounded-lg border border-[#e4e0e5] bg-white px-2.5 text-[12px] font-normal text-[#38343a] outline-none dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white"><option value="Karla">Karla</option><option value="DM Sans">DM Sans</option><option value="serif">Serif</option><option value="monospace">Monospace</option><option value="sans-serif">Sans-serif (legacy)</option></select></label>
                  <label className="flex items-center justify-between text-[11px] font-medium text-[#514c54] dark:text-[#e3dee3]">Dark form background<Switch checked={theme.dark_mode} label="Dark respondent form background" onChange={dark_mode => onUpdateTheme({ dark_mode })} /></label>
                  <div className="border-t border-[#eeebee] pt-4 dark:border-[#403c42]"><h3 className="text-[12px] font-semibold text-[#514c54] dark:text-[#e3dee3]">Ending</h3><label className="mt-3 block text-[11px] font-medium text-[#777179] dark:text-[#bcb6bc]">Thank-you title<input aria-label="Design thank-you title" value={theme.thank_you_title || ''} onChange={event => onUpdateTheme({ thank_you_title: event.target.value })} placeholder="All done!" className="mt-1.5 h-9 w-full rounded-lg border border-[#e4e0e5] bg-white px-2.5 text-[12px] font-normal text-[#38343a] outline-none dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" /></label><label className="mt-3 block text-[11px] font-medium text-[#777179] dark:text-[#bcb6bc]">Thank-you message<textarea aria-label="Design thank-you message" value={theme.thank_you_message || ''} onChange={event => onUpdateTheme({ thank_you_message: event.target.value })} placeholder="Thanks for your time!" rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-[#e4e0e5] bg-white px-2.5 py-2 text-[12px] font-normal text-[#38343a] outline-none dark:border-[#4a454d] dark:bg-[#2d2a2f] dark:text-white" /></label></div>
                </div>}
              </div>
            </aside>
          </div>
        </div>
      </div>

          {addOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171419]/30 p-4 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget && addingType === null) setAddOpen(false); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="add-content-title" className="w-full max-w-[660px] overflow-hidden rounded-2xl border border-[#e7e3e8] bg-white shadow-[0_24px_90px_rgba(25,19,28,0.25)] dark:border-[#464148] dark:bg-[#262327]">
                <header className="flex items-start justify-between border-b border-[#efecf0] px-5 py-4 dark:border-[#403c42] sm:px-6">
                  <div><h2 id="add-content-title" className="text-[16px] font-semibold text-[#312d33] dark:text-[#f3eff3]">Add content</h2><p className="mt-1 text-[12px] text-[#89838b] dark:text-[#aaa4ab]">Choose a question type to add to your form.</p></div>
                  <button type="button" onClick={() => setAddOpen(false)} aria-label="Close add content dialog" disabled={addingType !== null} className="rounded-lg p-1.5 text-[#817b83] hover:bg-[#f2f0f2] disabled:opacity-40 dark:hover:bg-white/[0.08]"><X size={17} /></button>
                </header>
                <div className="grid max-h-[min(62vh,480px)] grid-cols-1 gap-2 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
                  {QUESTION_TYPES.map(({ type, label, description, icon: Icon }) => <button key={type} type="button" onClick={async () => { if (await onAddQuestion(type)) setAddOpen(false); }} disabled={addingType !== null} className="group flex min-h-[66px] items-center gap-3 rounded-xl border border-[#eeebef] p-3 text-left transition hover:border-[#bfd9d6] hover:bg-[#f6faf9] disabled:opacity-55 dark:border-[#403c42] dark:hover:border-[#476a67] dark:hover:bg-[#2c3635]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f0f3] text-[#66606a] group-hover:bg-[#e7f2f1] group-hover:text-[#007a87] dark:bg-[#343137] dark:text-[#d0cad1] dark:group-hover:bg-[#344846] dark:group-hover:text-[#8ad4cc]"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#403b43] dark:text-[#eee9ef]">{addingType === type ? 'Adding…' : label}</span><span className="mt-0.5 block text-[10px] leading-4 text-[#918b94] dark:text-[#aaa4ab]">{description}</span></span><ChevronRight size={14} className="text-[#aaa4ab]" /></button>)}
                  {pickerError && <p role="alert" className="col-span-full rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-950/40 dark:text-red-200">{pickerError}</p>}
                </div>
                <footer className="border-t border-[#efecf0] px-5 py-3 text-[10px] text-[#969098] dark:border-[#403c42] dark:text-[#aaa4ab]">Add one question at a time; drag it in Pages to change the order.</footer>
              </section>
            </div>
          )}

          {notice && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setNotice(null); }}><section className="w-full max-w-[360px] rounded-2xl border border-[#e6e2e7] bg-white p-5 shadow-2xl dark:border-[#48434a] dark:bg-[#29262b]"><div className="mb-3 flex items-center gap-2 text-[#007a87]"><Info size={17} /><span className="text-[13px] font-semibold text-[#363139] dark:text-white">Coming soon</span></div><p className="text-[12px] leading-5 text-[#777179] dark:text-[#c0bac1]">{notice}</p><button type="button" autoFocus onClick={() => setNotice(null)} className="mt-4 w-full rounded-lg bg-[#29252a] py-2 text-[12px] font-semibold text-white dark:bg-[#f1edf1] dark:text-[#272329]">Got it</button></section></div>}
    </div>
  );
}
