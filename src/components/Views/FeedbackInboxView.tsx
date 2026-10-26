import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  Edit3,
  Eye,
  FileUp,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import type {
  FeedbackItem,
  ReportedImpactLevel,
  ScoredOpportunity,
} from '../../types/needmap';
import {
  type CsvRowWarning,
  generateSampleCsvTemplate,
  parseFeedbackCsv,
} from '../../utils/csvParser';
import {
  calculateFeedbackSentiment,
  type SentimentLabel,
} from '../../utils/sentiment';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface FeedbackInboxViewProps {
  feedback: FeedbackItem[];
  analyzedFeedbackIds: string[];
  opportunities: ScoredOpportunity[];
  initialIntakeMode?: 'paste' | 'csv' | 'demo' | null;
  onClearInitialIntakeMode?: () => void;
  highlightedFeedbackId: string | null;
  onClearHighlightedFeedback: () => void;
  globalSearch: string;
  onAddFeedbackItems: (items: FeedbackItem[], sourceDescription: string) => void;
  onUpdateFeedbackItem: (updated: FeedbackItem) => void;
  onDeleteFeedbackItems: (ids: string[]) => void;
  onReloadDemoDataset: () => void;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
  onNavigateToOpportunity: (oppId: string) => void;
}

const DEFAULT_CATEGORIES = [
  'Wi-Fi & IT',
  'Dining & Canteen',
  'Classroom Facilities',
  'Accessibility',
  'Student Services',
  'Waste & Sanitation',
  'Safety & Transport',
  'General Operations',
];

function getSentimentDotStyle(label: SentimentLabel): {
  dot: string;
  text: string;
} {
  switch (label) {
    case 'positive':
      return {
        dot: 'bg-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-400',
      };
    case 'negative':
      return {
        dot: 'bg-rose-500',
        text: 'text-rose-700 dark:text-rose-400',
      };
    case 'neutral':
    default:
      return {
        dot: 'bg-slate-400 dark:bg-slate-500',
        text: 'text-slate-600 dark:text-slate-300',
      };
  }
}

export const FeedbackInboxView: React.FC<FeedbackInboxViewProps> = ({
  feedback,
  analyzedFeedbackIds,
  opportunities,
  initialIntakeMode,
  onClearInitialIntakeMode,
  highlightedFeedbackId,
  onClearHighlightedFeedback,
  globalSearch,
  onAddFeedbackItems,
  onUpdateFeedbackItem,
  onDeleteFeedbackItems,
  onReloadDemoDataset,
  onRunAnalysis,
  isAnalyzing,
  onNavigateToOpportunity,
}) => {
  const { tr, tSentiment, tCategory } = useI18n();

  const [activeIntakeTab, setActiveIntakeTab] = useState<'paste' | 'csv' | 'demo'>('paste');
  const [isIntakeOpen, setIsIntakeOpen] = useState<boolean>(feedback.length === 0);

  // Paste state
  const [pasteText, setPasteText] = useState('');
  const [pasteCategory, setPasteCategory] = useState('Uncategorized');
  const [pasteSource, setPasteSource] = useState('Manual Entry');
  const [pasteDate, setPasteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pasteImpact, setPasteImpact] = useState<ReportedImpactLevel>('Unknown');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

  // CSV Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFeedbackMsg, setCsvFeedbackMsg] = useState<{
    type: 'success' | 'error';
    message: string;
    warnings: CsvRowWarning[];
  } | null>(null);

  // Table Filters & Selection
  const [localSearch, setLocalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sentimentFilter, setSentimentFilter] = useState<'ALL' | SentimentLabel>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ANALYZED' | 'PENDING'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inspect / Edit Modal State
  const [inspectingItem, setInspectingItem] = useState<FeedbackItem | null>(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    text: string;
    category: string;
    source: string;
    date: string;
    reportedImpact: ReportedImpactLevel;
  }>({
    text: '',
    category: '',
    source: '',
    date: '',
    reportedImpact: 'Unknown',
  });

  // Delete Confirmation State
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [confirmReloadDemo, setConfirmReloadDemo] = useState(false);

  useEffect(() => {
    if (initialIntakeMode) {
      setActiveIntakeTab(initialIntakeMode);
      setIsIntakeOpen(true);
      onClearInitialIntakeMode?.();
    }
  }, [initialIntakeMode, onClearInitialIntakeMode]);

  useEffect(() => {
    if (highlightedFeedbackId) {
      const target = feedback.find((f) => f.id === highlightedFeedbackId);
      if (target) {
        setInspectingItem(target);
        setIsEditingModal(false);
      }
    }
  }, [highlightedFeedbackId, feedback]);

  const analyzedSet = useMemo(() => new Set(analyzedFeedbackIds), [analyzedFeedbackIds]);

  // Pre-compute deterministic sentiment per feedback item
  const sentimentById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateFeedbackSentiment>>();
    for (const item of feedback) {
      map.set(item.id, calculateFeedbackSentiment(item.text));
    }
    return map;
  }, [feedback]);

  const linkedOppsByFeedbackId = useMemo(() => {
    const map = new Map<string, ScoredOpportunity[]>();
    for (const opp of opportunities) {
      const allIds = [...opp.relatedFeedbackIds, ...opp.contradictoryFeedbackIds];
      for (const fbId of allIds) {
        const list = map.get(fbId) || [];
        if (!list.some((o) => o.id === opp.id)) {
          list.push(opp);
        }
        map.set(fbId, list);
      }
    }
    return map;
  }, [opportunities]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    for (const f of feedback) {
      if (f.category) set.add(f.category);
    }
    return Array.from(set).sort();
  }, [feedback]);

  const combinedSearch = (localSearch || globalSearch).trim().toLowerCase();

  const filteredFeedback = useMemo(() => {
    return feedback.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (sentimentFilter !== 'ALL') {
        const sent = sentimentById.get(item.id)?.label || 'neutral';
        if (sent !== sentimentFilter) return false;
      }
      if (statusFilter === 'ANALYZED' && !analyzedSet.has(item.id)) {
        return false;
      }
      if (statusFilter === 'PENDING' && analyzedSet.has(item.id)) {
        return false;
      }
      if (dateFrom && (!item.date || item.date < dateFrom)) {
        return false;
      }
      if (dateTo && (!item.date || item.date > dateTo)) {
        return false;
      }
      if (combinedSearch) {
        const matches =
          item.text.toLowerCase().includes(combinedSearch) ||
          item.id.toLowerCase().includes(combinedSearch) ||
          item.category.toLowerCase().includes(combinedSearch) ||
          item.source.toLowerCase().includes(combinedSearch);
        if (!matches) return false;
      }
      return true;
    });
  }, [
    feedback,
    categoryFilter,
    sentimentFilter,
    statusFilter,
    dateFrom,
    dateTo,
    combinedSearch,
    analyzedSet,
    sentimentById,
  ]);

  const parsedPasteLines = useMemo(
    () =>
      pasteText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [pasteText]
  );

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);
    setPasteSuccess(null);

    if (parsedPasteLines.length === 0) {
      setPasteError(
        tr(
          'Enter at least one feedback entry (one entry per line).',
          'குறைந்தது ஒரு கருத்தையாவது உள்ளிடவும் (ஒரு வரிக்கு ஒன்று).'
        )
      );
      return;
    }

    const validLines = parsedPasteLines.filter((l) => l.length >= 5);
    if (validLines.length === 0) {
      setPasteError(
        tr(
          'Each feedback entry must contain at least 5 characters.',
          'ஒவ்வொரு கருத்தும் குறைந்தது 5 எழுத்துகளைக் கொண்டிருக்க வேண்டும்.'
        )
      );
      return;
    }

    const existingIds = new Set(feedback.map((f) => f.id));
    let nextNum = feedback.length + 1;
    const nowIso = new Date().toISOString();

    const newItems: FeedbackItem[] = validLines.map((line) => {
      while (existingIds.has(`USR-${String(nextNum).padStart(3, '0')}`)) {
        nextNum += 1;
      }
      const id = `USR-${String(nextNum).padStart(3, '0')}`;
      existingIds.add(id);
      nextNum += 1;

      return {
        id,
        text: line,
        category: pasteCategory || 'Uncategorized',
        date: pasteDate || '',
        source: pasteSource.trim() || 'Manual Entry',
        reportedImpact: pasteImpact,
        isDemo: false,
        createdAt: nowIso,
      };
    });

    const skippedCount = parsedPasteLines.length - validLines.length;
    onAddFeedbackItems(newItems, 'pasted text intake');
    setPasteText('');
    setPasteSuccess(
      tr(
        `Added ${newItems.length} feedback ${newItems.length === 1 ? 'entry' : 'entries'}${
          skippedCount > 0 ? ` (${skippedCount} short line skipped)` : ''
        }. Click "Analyze Feedback" to update clusters.`,
        `${newItems.length} கருத்துப் பதிவுகள் சேர்க்கப்பட்டன. "AI பகுப்பாய்வு செய்" பொத்தானை அழுத்தவும்.`
      )
    );
  };

  const handleCsvFileUpload = async (file: File | undefined) => {
    if (!file) return;
    setCsvFeedbackMsg(null);

    try {
      const content = await file.text();
      const existingIds = new Set(feedback.map((f) => f.id));
      const result = parseFeedbackCsv(content, existingIds);

      if (result.fatalError) {
        setCsvFeedbackMsg({
          type: 'error',
          message: result.fatalError,
          warnings: result.warnings,
        });
        return;
      }

      onAddFeedbackItems(result.items, `CSV file "${file.name}"`);
      setCsvFeedbackMsg({
        type: 'success',
        message: tr(
          `Imported ${result.items.length} of ${result.totalDataRows} rows from "${file.name}".`,
          `"${file.name}" கோப்பிலிருந்து ${result.items.length} பதிவுகள் சேர்க்கப்பட்டன.`
        ),
        warnings: result.warnings,
      });
    } catch {
      setCsvFeedbackMsg({
        type: 'error',
        message: tr(
          'Could not read the selected file. Ensure it is a UTF-8 CSV file.',
          'தேர்ந்தெடுத்த CSV கோப்பைப் படிக்க இயலவில்லை.'
        ),
        warnings: [],
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadSampleCsv = () => {
    const csv = generateSampleCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'needmap-sample-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleSelectAllVisible = () => {
    const allVisibleSelected =
      filteredFeedback.length > 0 &&
      filteredFeedback.every((f) => selectedIds.has(f.id));

    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      filteredFeedback.forEach((f) => next.delete(f.id));
    } else {
      filteredFeedback.forEach((f) => next.add(f.id));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const openModalForItem = (item: FeedbackItem, editMode: boolean) => {
    setInspectingItem(item);
    setIsEditingModal(editMode);
    setEditDraft({
      text: item.text,
      category: item.category,
      source: item.source,
      date: item.date,
      reportedImpact: item.reportedImpact,
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectingItem) return;
    if (editDraft.text.trim().length < 5) return;

    const updated: FeedbackItem = {
      ...inspectingItem,
      text: editDraft.text.trim(),
      category: editDraft.category.trim() || 'Uncategorized',
      source: editDraft.source.trim() || 'Manual Entry',
      date: editDraft.date,
      reportedImpact: editDraft.reportedImpact,
      isDemo: false,
      updatedAt: new Date().toISOString(),
    };
    onUpdateFeedbackItem(updated);
    setInspectingItem(updated);
    setIsEditingModal(false);
  };

  const closeInspector = () => {
    setInspectingItem(null);
    setIsEditingModal(false);
    onClearHighlightedFeedback();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            {tr('Feedback Inbox', 'கருத்துப் பெட்டி (Feedback Inbox)')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {tr(
              'Collect, search, inspect sentiment, and curate community feedback before running Gemini AI clustering.',
              'AI பகுப்பாய்வுக்கு முன் சமூகக் கருத்துகளைச் சேகரித்து, உணர்வு நிலை (Sentiment) மற்றும் பிரிவு வாரியாகப் பரிசீலிக்கவும்.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsIntakeOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            {isIntakeOpen
              ? tr('Hide Intake Panel', 'சேர்க்கைப் பகுதியை மறை')
              : tr('Add / Import Feedback', 'கருத்துச் சேர் / CSV பதிவேற்று')}
          </button>

          <button
            type="button"
            onClick={onRunAnalysis}
            disabled={isAnalyzing || feedback.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            {tr('Analyze Inbox', 'AI பகுப்பாய்வு')} ({feedback.length})
          </button>
        </div>
      </div>

      {/* Expandable 3-Mode Intake Panel */}
      {isIntakeOpen && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div
              className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeIntakeTab === 'paste'}
                onClick={() => setActiveIntakeTab('paste')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeIntakeTab === 'paste'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {tr('Paste Feedback Lines', 'வரிகளை ஒட்டுக')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeIntakeTab === 'csv'}
                onClick={() => setActiveIntakeTab('csv')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeIntakeTab === 'csv'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {tr('Import CSV File', 'CSV பதிவேற்று')}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeIntakeTab === 'demo'}
                onClick={() => setActiveIntakeTab('demo')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeIntakeTab === 'demo'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                {tr('Sample Dataset', 'மாதிரி தரவு')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsIntakeOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close intake panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {activeIntakeTab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="paste-feedback-textarea"
                    className="block text-xs font-semibold text-slate-800 dark:text-slate-200"
                  >
                    {tr('Paste One Feedback Item Per Line', 'ஒரு வரிக்கு ஒரு கருத்தை உள்ளிடவும்')}
                  </label>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {parsedPasteLines.length}{' '}
                    {tr('detected', 'வரிகள்')}
                  </span>
                </div>
                <textarea
                  id="paste-feedback-textarea"
                  rows={4}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={tr(
                    'Example:\nShuttle bus from South Hostel was full at 8:15 AM three days in a row.\nLibrary ground-floor wheelchair restroom lock is jammed.',
                    'உதாரணம்:\nதெற்கு விடுதிப் பேருந்து காலை 8:15 மணிக்குத் தொடர்ந்து நிரம்பி வழிகிறது.\nநூலகத் தரைத்தள மாற்றுத்திறனாளி கழிப்பறை பூட்டு பழுதடைந்துள்ளது.'
                  )}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {tr('Category', 'பிரிவு')}
                  </label>
                  <select
                    value={pasteCategory}
                    onChange={(e) => setPasteCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Uncategorized">{tr('Uncategorized', 'வகைப்படுத்தப்படாதது')}</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {tCategory(c)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {tr('Source Label', 'மூலம்')}
                  </label>
                  <input
                    type="text"
                    value={pasteSource}
                    onChange={(e) => setPasteSource(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {tr('Date', 'தேதி')}
                  </label>
                  <input
                    type="date"
                    value={pasteDate}
                    onChange={(e) => setPasteDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {tr('Reported Impact', 'தாக்கம்')}
                  </label>
                  <select
                    value={pasteImpact}
                    onChange={(e) => setPasteImpact(e.target.value as ReportedImpactLevel)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {pasteError && (
                <p className="text-xs font-medium text-rose-700 dark:text-rose-400">{pasteError}</p>
              )}
              {pasteSuccess && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-teal-800 dark:text-teal-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
                  {pasteSuccess}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  <Plus className="h-4 w-4" />
                  {tr('Add Entries to Inbox', 'பெட்டியில் சேர்')}
                </button>
              </div>
            </form>
          )}

          {activeIntakeTab === 'csv' && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {tr(
                    'Supports UTF-8 CSV headers: id, feedback/text/comment, category, date, source, impact.',
                    'CSV நிரல்கள்: id, feedback/text, category, date, source, impact.'
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  {tr('Download CSV Template', 'மாதிரி CSV பதிவிறக்கு')}
                </button>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleCsvFileUpload(e.dataTransfer.files?.[0]);
                }}
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-800/40"
              >
                <FileUp className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                  {tr('Select a CSV file or drag and drop here', 'CSV கோப்பைத் தேர்ந்தெடுக்கவும்')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={(e) => void handleCsvFileUpload(e.target.files?.[0])}
                  className="sr-only"
                  id="csv-file-upload-input"
                />
                <label
                  htmlFor="csv-file-upload-input"
                  className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  {tr('Choose CSV File', 'CSV கோப்பைத் தேர்ந்தெடு')}
                </label>
              </div>

              {csvFeedbackMsg && (
                <div
                  className={`rounded-lg border p-4 text-xs ${
                    csvFeedbackMsg.type === 'error'
                      ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                      : 'border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200'
                  }`}
                >
                  <div className="font-semibold">{csvFeedbackMsg.message}</div>
                </div>
              )}
            </div>
          )}

          {activeIntakeTab === 'demo' && (
            <div className="mt-5 flex flex-col gap-4 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800/60">
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <Database className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                  <span>
                    {tr(
                      'Northbridge Campus Fictional Demo Dataset (36 Entries)',
                      '36 மாதிரி வளாகக் கருத்துப் பதிவுகள் (Demo)'
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {tr(
                    'All 36 items are explicitly labeled as fictional demo data for immediate hackathon testing.',
                    'அனைத்துப் பதிவுகளும் சோதனைக்கான மாதிரி தரவுகளாகக் குறிக்கப்பட்டுள்ளன.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmReloadDemo(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700 whitespace-nowrap shrink-0"
              >
                {tr('Load / Reset Demo Dataset', 'மாதிரி தரவை ஏற்று')}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Search, Filters (including Sentiment!) & Bulk Actions Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="relative xl:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={tr('Filter inbox by text, ID, or source...', 'உரை, எண் அல்லது மூலம் தேடுக...')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-1.5 pl-9 pr-3 text-sm text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{tr('All Categories', 'அனைத்து பிரிவுகள்')}</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {tCategory(c)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by sentiment"
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as 'ALL' | SentimentLabel)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{tr('All Sentiments', 'அனைத்து உணர்வு நிலைகள்')}</option>
            <option value="negative">{tSentiment('negative')}</option>
            <option value="neutral">{tSentiment('neutral')}</option>
            <option value="positive">{tSentiment('positive')}</option>
          </select>

          <select
            aria-label="Filter by analysis status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ANALYZED' | 'PENDING')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{tr('All Statuses', 'அனைத்து நிலைகள்')}</option>
            <option value="ANALYZED">{tr('Analyzed', 'பகுப்பாய்வு முடிந்தது')}</option>
            <option value="PENDING">{tr('Pending Analysis', 'நிலுவையில்')}</option>
          </select>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              aria-label="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="date"
              aria-label="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span>
              {tr('Showing', 'காட்டப்படுபவை')} {filteredFeedback.length} / {feedback.length}
            </span>
            {(localSearch ||
              categoryFilter !== 'ALL' ||
              sentimentFilter !== 'ALL' ||
              statusFilter !== 'ALL' ||
              dateFrom ||
              dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  setCategoryFilter('ALL');
                  setSentimentFilter('ALL');
                  setStatusFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="font-sans font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                {tr('Reset filters', 'வடிகட்டிகளை மீட்டமை')}
              </button>
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {selectedIds.size} {tr('selected', 'தேர்வு')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300"
              >
                {tr('Deselect', 'நீக்கு')}
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteIds(Array.from(selectedIds))}
                className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 font-medium text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tr('Delete Selected', 'தேர்ந்தெடுத்தவற்றை நீக்கு')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Data Table with Calculated Sentiment Indicator */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {filteredFeedback.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-100">
              {feedback.length === 0
                ? tr('Your Feedback Inbox is empty', 'கருத்துப் பெட்டி காலியாக உள்ளது')
                : tr('No feedback entries match your active filters', 'வடிகட்டிகளுக்குப் பொருந்தும் பதிவுகள் இல்லை')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-300">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        filteredFeedback.length > 0 &&
                        filteredFeedback.every((f) => selectedIds.has(f.id))
                      }
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible feedback entries"
                      className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                    />
                  </th>
                  <th className="w-24 px-3 py-3">ID</th>
                  <th className="px-3 py-3">{tr('Feedback Entry', 'கருத்து விவரம்')}</th>
                  <th className="w-32 px-3 py-3">{tr('Sentiment', 'உணர்வு நிலை')}</th>
                  <th className="w-40 px-3 py-3 hidden md:table-cell">
                    {tr('Category & Source', 'பிரிவு & மூலம்')}
                  </th>
                  <th className="w-28 px-3 py-3 hidden lg:table-cell">{tr('Date', 'தேதி')}</th>
                  <th className="w-28 px-3 py-3 hidden sm:table-cell">{tr('Status', 'நிலை')}</th>
                  <th className="w-24 px-4 py-3 text-right">{tr('Actions', 'செயல்கள்')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFeedback.map((item) => {
                  const isAnalyzed = analyzedSet.has(item.id);
                  const linkedOpps = linkedOppsByFeedbackId.get(item.id) || [];
                  const isSelected = selectedIds.has(item.id);
                  const sentiment = sentimentById.get(item.id) || {
                    label: 'neutral' as SentimentLabel,
                    score: 0,
                  };
                  const sentStyle = getSentimentDotStyle(sentiment.label);

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-50/90 dark:hover:bg-slate-800/50 ${
                        isSelected ? 'bg-teal-50/40 dark:bg-teal-950/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(item.id)}
                          aria-label={`Select feedback ${item.id}`}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                        />
                      </td>
                      <td className="px-3 py-3 align-top font-mono text-xs font-medium text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        <div>{item.id}</div>
                        {item.isDemo && (
                          <div className="text-[10px] font-sans text-slate-400">Demo</div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top max-w-xl">
                        <button
                          type="button"
                          onClick={() => openModalForItem(item, false)}
                          className="text-left text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white line-clamp-2 leading-relaxed"
                        >
                          {item.text}
                        </button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {item.reportedImpact !== 'Unknown' && (
                            <span>Impact: {item.reportedImpact}</span>
                          )}
                          {linkedOpps.length > 0 && (
                            <>
                              {item.reportedImpact !== 'Unknown' && <span>·</span>}
                              <button
                                type="button"
                                onClick={() => onNavigateToOpportunity(linkedOpps[0].id)}
                                className="font-medium text-teal-700 hover:underline dark:text-teal-400 truncate max-w-xs"
                              >
                                {linkedOpps[0].id}: {linkedOpps[0].title}
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Sentiment Indicator Column */}
                      <td className="px-3 py-3 align-top text-xs whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${sentStyle.text}`}
                          title={`Calculated lexical sentiment score: ${sentiment.score}`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${sentStyle.dot}`}
                            aria-hidden="true"
                          />
                          <span>{tSentiment(sentiment.label)}</span>
                        </span>
                      </td>

                      <td className="px-3 py-3 align-top hidden md:table-cell text-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {tCategory(item.category)}
                        </div>
                        <div className="mt-0.5 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                          {item.source}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top hidden lg:table-cell font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                        {item.date || ' - '}
                      </td>
                      <td className="px-3 py-3 align-top hidden sm:table-cell text-xs whitespace-nowrap">
                        {isAnalyzed ? (
                          <span className="text-teal-700 dark:text-teal-400 font-medium">
                            {tr('Analyzed', 'முடிந்தது')}
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            {tr('Pending', 'நிலுவை')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openModalForItem(item, false)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label={`View ${item.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openModalForItem(item, true)}
                            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            aria-label={`Edit ${item.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteIds([item.id])}
                            className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                            aria-label={`Delete ${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect / Edit Modal */}
      {inspectingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                  {inspectingItem.id} ·{' '}
                  {inspectingItem.isDemo ? 'Sample Demo Record' : 'User Feedback Record'}
                </div>
                <h2 className="mt-1 font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {isEditingModal
                    ? tr('Edit Feedback Entry', 'கருத்தைத் திருத்து')
                    : tr('Feedback Record Details', 'கருத்து முழு விவரம்')}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeInspector}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isEditingModal ? (
              <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
                <textarea
                  rows={4}
                  required
                  value={editDraft.text}
                  onChange={(e) =>
                    setEditDraft((prev) => ({ ...prev, text: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editDraft.category}
                    onChange={(e) =>
                      setEditDraft((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="date"
                    value={editDraft.date}
                    onChange={(e) =>
                      setEditDraft((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingModal(false)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                  >
                    {tr('Cancel', 'ரத்து')}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    {tr('Save Changes', 'சேமி')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  {inspectingItem.text}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <span>
                    <strong>{tr('Sentiment:', 'உணர்வு:')}</strong>{' '}
                    {tSentiment(calculateFeedbackSentiment(inspectingItem.text).label)}
                  </span>
                  <span>
                    <strong>{tr('Category:', 'பிரிவு:')}</strong> {tCategory(inspectingItem.category)}
                  </span>
                  <span>
                    <strong>{tr('Source:', 'மூலம்:')}</strong> {inspectingItem.source}
                  </span>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingModal(true)}
                    className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  >
                    {tr('Edit', 'திருத்து')}
                  </button>
                  <button
                    type="button"
                    onClick={closeInspector}
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white dark:bg-teal-600"
                  >
                    {tr('Close', 'மூடு')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteIds && pendingDeleteIds.length > 0)}
        title={tr('Delete Feedback Entries?', 'கருத்துப் பதிவுகளை நீக்கவா?')}
        description={tr(
          `Remove ${pendingDeleteIds?.length ?? 0} selected entry(s) from this workspace?`,
          `தேர்ந்தெடுத்த ${pendingDeleteIds?.length ?? 0} பதிவுகளை நீக்க விரும்புகிறீர்களா?`
        )}
        confirmLabel={tr('Delete', 'நீக்கு')}
        onCancel={() => setPendingDeleteIds(null)}
        onConfirm={() => {
          if (pendingDeleteIds) {
            onDeleteFeedbackItems(pendingDeleteIds);
            setSelectedIds((prev) => {
              const next = new Set(prev);
              pendingDeleteIds.forEach((id) => next.delete(id));
              return next;
            });
          }
          setPendingDeleteIds(null);
        }}
      />

      <ConfirmDialog
        isOpen={confirmReloadDemo}
        title={tr('Reset to Sample Demo Dataset?', 'மாதிரி தரவை மீண்டும் ஏற்றவா?')}
        description={tr(
          'This restores the 36 sample campus feedback entries, demo complaints, and sample clusters.',
          'இது 36 மாதிரி கருத்துகள் மற்றும் மாதிரி புகார்களை மீண்டும் அமைக்கும்.'
        )}
        confirmLabel={tr('Load Sample Data', 'மாதிரி தரவை ஏற்று')}
        variant="primary"
        onCancel={() => setConfirmReloadDemo(false)}
        onConfirm={() => {
          setConfirmReloadDemo(false);
          onReloadDemoDataset();
        }}
      />
    </div>
  );
};
