export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface SentimentResult {
  label: SentimentLabel;
  score: number; // -5 to +5
}

const POSITIVE_WORDS = new Set([
  'good',
  'great',
  'excellent',
  'fast',
  'fixed',
  'resolved',
  'working',
  'helpful',
  'clean',
  'improved',
  'smooth',
  'reliable',
  'solid',
  'satisfied',
  'happy',
  'appreciate',
  'thanks',
  'thank',
  'safe',
  'accessible',
  'efficient',
  'quick',
  'clear',
]);

const NEGATIVE_WORDS = new Set([
  'bad',
  'broken',
  'drops',
  'drop',
  'disconnecting',
  'disconnect',
  'disconnects',
  'slow',
  'delay',
  'delays',
  'delayed',
  'waiting',
  'queue',
  'freezes',
  'freeze',
  'frozen',
  'missing',
  'outage',
  'overflow',
  'overflowing',
  'trash',
  'odor',
  'broken',
  'flickers',
  'dim',
  'wasted',
  'voicemail',
  'unread',
  'clash',
  'risking',
  'slick',
  'dangerously',
  'steep',
  'preventing',
  'miss',
  'missed',
  'skip',
  'skipped',
  'unstable',
  'instability',
  'loss',
  'exhausted',
  'burned',
  'error',
  'fail',
  'failed',
  'failure',
  'jammed',
  'leak',
  'leaking',
  'damaged',
  'pothole',
  'dark',
  'unsafe',
  'allergy',
  'ruining',
]);

const NEGATION_TOKENS = new Set([
  'not',
  'no',
  'never',
  'neither',
  'without',
  'zero',
  'cannot',
  'cant',
  "can't",
  "don't",
  "doesn't",
  "isn't",
  "aren't",
  "wasn't",
]);

/**
 * Lightweight, deterministic lexical + negation-aware sentiment calculator
 * for FeedbackInboxView items.
 */
export function calculateFeedbackSentiment(text: string): SentimentResult {
  if (!text || !text.trim()) {
    return { label: 'neutral', score: 0 };
  }

  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let rawScore = 0;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    const prev1 = i > 0 ? tokens[i - 1] : '';
    const prev2 = i > 1 ? tokens[i - 2] : '';
    const isNegated = NEGATION_TOKENS.has(prev1) || NEGATION_TOKENS.has(prev2);

    if (POSITIVE_WORDS.has(word)) {
      rawScore += isNegated ? -1.5 : 1.5;
    } else if (NEGATIVE_WORDS.has(word)) {
      rawScore += isNegated ? 0.5 : -1.25;
    }
  }

  // Phrase-level signals
  const lower = text.toLowerCase();
  if (lower.includes('out of service') || lower.includes('does not') || lower.includes('still says')) {
    rawScore -= 1.5;
  }
  if (lower.includes('rock solid') || lower.includes('completely fine')) {
    rawScore += 2;
  }

  const clamped = Math.max(-5, Math.min(5, Math.round(rawScore * 10) / 10));

  if (clamped >= 1.2) {
    return { label: 'positive', score: clamped };
  }
  if (clamped <= -1.0) {
    return { label: 'negative', score: clamped };
  }
  return { label: 'neutral', score: clamped };
}
