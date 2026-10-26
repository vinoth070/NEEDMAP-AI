import type { FeedbackItem, ReportedImpactLevel } from '../types/needmap';

export interface CsvRowWarning {
  rowNumber: number;
  reason: string;
}

export interface CsvParseResult {
  items: FeedbackItem[];
  totalDataRows: number;
  warnings: CsvRowWarning[];
  fatalError?: string;
}

/**
 * RFC-4180 compliant state-machine CSV parser supporting quoted fields,
 * commas and newlines inside quotes, and escaped double quotes ("").
 */
export function parseRawCsvGrid(csvText: string): {
  rows: string[][];
  unclosedQuoteRow?: number;
} {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let quoteStartedAtRow = 1;
  let currentLineNumber = 1;

  // Strip UTF-8 BOM if present
  const content = csvText.replace(/^\uFEFF/, '');

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i += 1; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') {
          currentLineNumber += 1;
        }
        currentField += char;
      }
    } else {
      if (char === '"') {
        if (currentField.trim() === '') {
          currentField = '';
          inQuotes = true;
          quoteStartedAtRow = currentLineNumber;
        } else {
          // Stray quote mid-unquoted field; keep character literally
          currentField += char;
        }
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i += 1;
        }
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        currentLineNumber += 1;
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        currentLineNumber += 1;
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return {
    rows,
    unclosedQuoteRow: inQuotes ? quoteStartedAtRow : undefined,
  };
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeImpact(raw?: string): ReportedImpactLevel {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return 'Unknown';
  if (v === 'high' || v === 'severe' || v === 'critical' || v === 'major' || v === '3') {
    return 'High';
  }
  if (v === 'medium' || v === 'moderate' || v === 'med' || v === '2') {
    return 'Medium';
  }
  if (v === 'low' || v === 'minor' || v === '1') {
    return 'Low';
  }
  return 'Unknown';
}

function normalizeDateString(raw?: string): string {
  const val = (raw || '').trim();
  if (!val) return '';

  // Match YYYY-MM-DD directly
  const isoMatch = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = Date.parse(val);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    if (y >= 1990 && y <= 2100) {
      return `${y}-${m}-${d}`;
    }
  }

  return '';
}

const HEADER_ALIASES = {
  id: ['id', 'feedbackid', 'entryid', 'ticketid', 'ref', 'reference', 'recordid'],
  text: [
    'feedback',
    'text',
    'comment',
    'comments',
    'message',
    'description',
    'body',
    'suggestion',
    'complaint',
    'issue',
    'content',
    'response',
    'note',
  ],
  category: [
    'category',
    'theme',
    'topic',
    'department',
    'area',
    'tag',
    'type',
    'domain',
    'group',
  ],
  date: ['date', 'createdat', 'timestamp', 'submittedat', 'submitted', 'day', 'recordedat'],
  source: ['source', 'channel', 'origin', 'platform', 'location', 'survey', 'submittedvia'],
  impact: [
    'impact',
    'reportedimpact',
    'severity',
    'userimpact',
    'impactlevel',
    'urgency',
    'priority',
  ],
};

export function parseFeedbackCsv(
  csvText: string,
  existingIds: Set<string> = new Set()
): CsvParseResult {
  if (!csvText || csvText.trim().length === 0) {
    return {
      items: [],
      totalDataRows: 0,
      warnings: [],
      fatalError: 'The uploaded CSV file is empty. Please choose a file containing a header row and at least one feedback entry.',
    };
  }

  const { rows, unclosedQuoteRow } = parseRawCsvGrid(csvText);
  const warnings: CsvRowWarning[] = [];

  if (unclosedQuoteRow !== undefined) {
    return {
      items: [],
      totalDataRows: Math.max(0, rows.length - 1),
      warnings: [
        {
          rowNumber: unclosedQuoteRow,
          reason: 'Unclosed double quotation mark detected; file structure could not be verified safely.',
        },
      ],
      fatalError: `Malformed CSV syntax starting near line ${unclosedQuoteRow}: unclosed quotation mark.`,
    };
  }

  // Filter completely blank trailing lines while remembering original 1-based row numbers
  const indexedRows = rows
    .map((cols, idx) => ({ cols, rowNumber: idx + 1 }))
    .filter(({ cols }) => cols.some((c) => c.trim().length > 0));

  if (indexedRows.length === 0) {
    return {
      items: [],
      totalDataRows: 0,
      warnings: [],
      fatalError: 'No non-empty rows were found in the CSV file.',
    };
  }

  const headerRow = indexedRows[0].cols.map(normalizeHeader);

  const findColIndex = (aliases: string[]): number =>
    headerRow.findIndex((h) => aliases.includes(h));

  const idIdx = findColIndex(HEADER_ALIASES.id);
  let textIdx = findColIndex(HEADER_ALIASES.text);
  const categoryIdx = findColIndex(HEADER_ALIASES.category);
  const dateIdx = findColIndex(HEADER_ALIASES.date);
  const sourceIdx = findColIndex(HEADER_ALIASES.source);
  const impactIdx = findColIndex(HEADER_ALIASES.impact);

  // If single-column CSV or unrecognized text column header, check if header looks like a recognizable column set
  if (textIdx === -1) {
    if (headerRow.length === 1) {
      // Single column CSV: check if row 1 is a header word or actual feedback sentence
      textIdx = 0;
    } else {
      return {
        items: [],
        totalDataRows: Math.max(0, indexedRows.length - 1),
        warnings: [],
        fatalError:
          'Could not locate a feedback text column. Expected a column header such as "feedback", "text", "comment", "description", or "message".',
      };
    }
  }

  const dataRows = indexedRows.slice(1);
  if (dataRows.length === 0) {
    return {
      items: [],
      totalDataRows: 0,
      warnings: [],
      fatalError: 'The CSV file contains headers but zero feedback data rows.',
    };
  }

  const nowIso = new Date().toISOString();
  const usedIds = new Set<string>(existingIds);
  const items: FeedbackItem[] = [];
  let autoCounter = existingIds.size + 1;

  for (const { cols, rowNumber } of dataRows) {
    // Warn if row has drastically more columns than header (often unquoted comma)
    if (cols.length > headerRow.length + 2) {
      warnings.push({
        rowNumber,
        reason: `Row has ${cols.length} columns (expected ${headerRow.length}); check for unquoted commas. Imported primary columns.`,
      });
    }

    const rawText = (cols[textIdx] || '').trim();
    if (!rawText) {
      warnings.push({
        rowNumber,
        reason: 'Skipped row because feedback text is empty.',
      });
      continue;
    }

    if (rawText.length < 4) {
      warnings.push({
        rowNumber,
        reason: `Skipped row because feedback text ("${rawText}") is too short to analyze.`,
      });
      continue;
    }

    let idCandidate = idIdx >= 0 ? (cols[idIdx] || '').trim() : '';
    if (!idCandidate || usedIds.has(idCandidate)) {
      if (idCandidate && usedIds.has(idCandidate)) {
        warnings.push({
          rowNumber,
          reason: `Duplicate ID "${idCandidate}" reassigned automatically to preserve unique tracking.`,
        });
      }
      while (usedIds.has(`CSV-${String(autoCounter).padStart(3, '0')}`)) {
        autoCounter += 1;
      }
      idCandidate = `CSV-${String(autoCounter).padStart(3, '0')}`;
      autoCounter += 1;
    }
    usedIds.add(idCandidate);

    const rawCategory = categoryIdx >= 0 ? (cols[categoryIdx] || '').trim() : '';
    const rawDate = dateIdx >= 0 ? cols[dateIdx] : '';
    const normalizedDate = normalizeDateString(rawDate);
    if (dateIdx >= 0 && (rawDate || '').trim() !== '' && normalizedDate === '') {
      warnings.push({
        rowNumber,
        reason: `Unrecognized date "${(rawDate || '').trim()}"; stored entry as undated.`,
      });
    }

    const rawSource = sourceIdx >= 0 ? (cols[sourceIdx] || '').trim() : '';
    const rawImpact = impactIdx >= 0 ? cols[impactIdx] : '';

    items.push({
      id: idCandidate,
      text: rawText,
      category: rawCategory || 'Uncategorized',
      date: normalizedDate,
      source: rawSource || 'CSV Import',
      reportedImpact: normalizeImpact(rawImpact),
      isDemo: false,
      createdAt: nowIso,
    });
  }

  return {
    items,
    totalDataRows: dataRows.length,
    warnings,
    fatalError:
      items.length === 0
        ? 'No valid feedback entries could be imported from the CSV rows.'
        : undefined,
  };
}

export function generateSampleCsvTemplate(): string {
  const lines = [
    'id,feedback,category,date,source,impact',
    'IMP-101,"Evening library study rooms on Floor 3 get above 30°C after 6 PM because HVAC shuts off early.",Facilities,2026-10-18,Library Suggestion Box,High',
    'IMP-102,"Air conditioning in the 3rd-floor quiet study zone turns off at 6:00 PM even though exams run until 11 PM.",Facilities,2026-10-19,Student Portal,High',
    'IMP-103,"The campus clinic online booking page throws an error on mobile Safari when selecting a morning slot.",Student Services,2026-10-20,Helpdesk Ticket,Medium',
    'IMP-104,"Cannot book a nurse appointment from my phone browser, have to walk to the health center in person.",Student Services,2026-10-21,Town Hall Survey,Medium',
    'IMP-105,"Water refill station outside Gym Court B has had a red filter-replacement light blinking for two weeks.",Waste & Sanitation,2026-10-22,QR Feedback Form,Low',
  ];
  return lines.join('\n');
}
