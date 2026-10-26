import { enrichDemoOpportunitiesWithLocations } from '../data/platformDemoData';
import type {
  AnalysisProgress,
  FeedbackItem,
  InterventionItem,
  OpportunityCluster,
} from '../types/needmap';
import {
  type RawAiOpportunity,
  validateAndGroundAiAnalysis,
} from '../utils/evidenceVerifier';

const BATCH_SIZE = 45;
export const MAX_FEEDBACK_PER_ANALYSIS = 180;
const REQUEST_TIMEOUT_MS = 55_000;

export interface LiveAnalysisResult {
  opportunities: OpportunityCluster[];
  interventions: InterventionItem[];
  summaryNarrative: string;
  analyzedAt: string;
  model: string;
  analyzedFeedbackIds: string[];
  truncatedWarning?: string;
}

interface ServerAnalyzeResponse {
  model?: string;
  analyzedAt?: string;
  data?: {
    summaryNarrative?: string;
    opportunities?: RawAiOpportunity[];
  };
  error?: string;
  code?: string;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Deterministic fallback cluster merger used if multi-batch AI consolidation fails,
 * ensuring no feedback entries or batch clusters are silently discarded.
 */
function deterministicMergeBatchClusters(
  allRawClusters: RawAiOpportunity[]
): RawAiOpportunity[] {
  const mergedByNormalizedTitle = new Map<string, RawAiOpportunity>();

  for (const cluster of allRawClusters) {
    const normKey = `${(cluster.category || '').toLowerCase()}::${(cluster.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 36)}`;

    const existing = mergedByNormalizedTitle.get(normKey);
    if (!existing) {
      mergedByNormalizedTitle.set(normKey, { ...cluster });
      continue;
    }

    existing.relatedFeedbackIds = Array.from(
      new Set([...(existing.relatedFeedbackIds || []), ...(cluster.relatedFeedbackIds || [])])
    );
    existing.contradictoryFeedbackIds = Array.from(
      new Set([
        ...(existing.contradictoryFeedbackIds || []),
        ...(cluster.contradictoryFeedbackIds || []),
      ])
    );
    existing.evidenceExcerpts = [
      ...(existing.evidenceExcerpts || []),
      ...(cluster.evidenceExcerpts || []),
    ].slice(0, 6);
    existing.informationGaps = Array.from(
      new Set([...(existing.informationGaps || []), ...(cluster.informationGaps || [])])
    );
    existing.interventions = [
      ...(existing.interventions || []),
      ...(cluster.interventions || []),
    ].slice(0, 4);
  }

  return Array.from(mergedByNormalizedTitle.values());
}

/**
 * Attaches real coordinates from linked geo-tagged feedback items when available,
 * or maps well-known campus landmarks without ever inventing coordinates for unmapped items.
 */
function attachGroundedLocations(
  opportunities: OpportunityCluster[],
  feedbackItems: FeedbackItem[]
): OpportunityCluster[] {
  const fbMap = new Map<string, FeedbackItem>();
  feedbackItems.forEach((f) => fbMap.set(f.id, f));

  const enrichedKnown = enrichDemoOpportunitiesWithLocations(opportunities);

  return enrichedKnown.map((opp) => {
    const geoFeedback = opp.relatedFeedbackIds
      .map((id) => fbMap.get(id))
      .find((f) => f?.coordinates && Number.isFinite(f.coordinates.lat));

    if (geoFeedback?.coordinates) {
      return {
        ...opp,
        coordinates: geoFeedback.coordinates,
      };
    }
    return opp;
  });
}

async function fetchJsonWithTimeout(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<{ response: Response; payload: ServerAnalyzeResponse }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'AI analysis timed out before completing. Your feedback entries are safe—please retry or explore Sample Demo Results.'
      );
    }
    throw new Error(
      'Network error while contacting the AI analysis service. Check your connection and retry.'
    );
  } finally {
    clearTimeout(timer);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      response.status === 504 || response.status === 502
        ? 'The AI request exceeded the gateway timeout (HTTP 504). Please retry—fast Gemini analysis is ready.'
        : `Analysis endpoint returned an unexpected format (HTTP ${response.status}). Ensure the backend server is running and retry.`
    );
  }

  let payload: ServerAnalyzeResponse;
  try {
    payload = (await response.json()) as ServerAnalyzeResponse;
  } catch {
    throw new Error(
      `Analysis endpoint returned unreadable JSON (HTTP ${response.status}). Please retry.`
    );
  }

  return { response, payload };
}

export async function runLiveGeminiAnalysis(
  feedbackItems: FeedbackItem[],
  workspaceName: string,
  onProgress?: (progress: AnalysisProgress) => void,
  targetLanguage: string = 'en'
): Promise<LiveAnalysisResult> {
  if (!feedbackItems || feedbackItems.length === 0) {
    throw new Error(
      'Cannot analyze an empty inbox. Add feedback entries, import a CSV file, or load sample data first.'
    );
  }

  let itemsToProcess = feedbackItems;
  let truncatedWarning: string | undefined;

  if (feedbackItems.length > MAX_FEEDBACK_PER_ANALYSIS) {
    itemsToProcess = feedbackItems.slice(0, MAX_FEEDBACK_PER_ANALYSIS);
    truncatedWarning = `Dataset contains ${feedbackItems.length} entries. Processed the first ${MAX_FEEDBACK_PER_ANALYSIS} entries to stay within interactive response limits; filter by category or date to analyze remaining segments.`;
  }

  const batches = chunkArray(itemsToProcess, BATCH_SIZE);
  const totalBatches = batches.length;
  const collectedRawOpportunities: RawAiOpportunity[] = [];
  const batchSummaries: string[] = [];
  let usedModel = 'gemini-3.8-flash';
  let lastAnalyzedAt = new Date().toISOString();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const startIdx = i * BATCH_SIZE + 1;
    const endIdx = startIdx + batch.length - 1;

    onProgress?.({
      isAnalyzing: true,
      currentBatch: i + 1,
      totalBatches,
      stageMessage:
        totalBatches === 1
          ? `Analyzing ${batch.length} feedback entries with Gemini AI...`
          : `Analyzing batch ${i + 1} of ${totalBatches} (entries ${startIdx}–${endIdx})...`,
    });

    const { response, payload } = await fetchJsonWithTimeout(
      '/api/analyze',
      {
        workspaceName,
        targetLanguage,
        feedback: batch.map((f) => ({
          id: f.id,
          text: f.text,
          category: f.category,
          date: f.date,
          source: f.source,
          reportedImpact: f.reportedImpact,
        })),
      },
      REQUEST_TIMEOUT_MS
    );

    if (!response.ok) {
      throw new Error(
        payload?.error ||
          `AI analysis failed with HTTP status ${response.status}. Retry or explore sample results.`
      );
    }

    const batchOpps = payload?.data?.opportunities;
    if (!Array.isArray(batchOpps)) {
      throw new Error(
        'Gemini returned an unexpected schema without an opportunities list. Please retry.'
      );
    }

    if (payload.model) usedModel = payload.model;
    if (payload.analyzedAt) lastAnalyzedAt = payload.analyzedAt;
    if (payload.data?.summaryNarrative) {
      batchSummaries.push(payload.data.summaryNarrative);
    }

    collectedRawOpportunities.push(...batchOpps);
  }

  let finalRawOpportunities = collectedRawOpportunities;
  let finalSummary =
    batchSummaries.join(' ') ||
    `Analyzed ${itemsToProcess.length} feedback entries into ${collectedRawOpportunities.length} opportunity clusters.`;

  if (batches.length > 1 && collectedRawOpportunities.length > 1) {
    onProgress?.({
      isAnalyzing: true,
      currentBatch: totalBatches,
      totalBatches,
      stageMessage: `Consolidating ${collectedRawOpportunities.length} clusters across ${totalBatches} batches...`,
    });

    try {
      const { response: consRes, payload: consPayload } = await fetchJsonWithTimeout(
        '/api/consolidate',
        {
          workspaceName,
          opportunities: collectedRawOpportunities,
        },
        REQUEST_TIMEOUT_MS
      );

      if (
        consRes.ok &&
        Array.isArray(consPayload?.data?.opportunities) &&
        consPayload.data.opportunities.length > 0
      ) {
        finalRawOpportunities = consPayload.data.opportunities;
        if (consPayload.data.summaryNarrative) {
          finalSummary = consPayload.data.summaryNarrative;
        }
      } else {
        finalRawOpportunities = deterministicMergeBatchClusters(collectedRawOpportunities);
      }
    } catch {
      finalRawOpportunities = deterministicMergeBatchClusters(collectedRawOpportunities);
    }
  }

  onProgress?.({
    isAnalyzing: true,
    currentBatch: totalBatches,
    totalBatches,
    stageMessage: 'Verifying evidence quotes and computing deterministic priority scores...',
  });

  const validated = validateAndGroundAiAnalysis(
    finalRawOpportunities,
    itemsToProcess,
    'live_ai'
  );

  if (validated.opportunities.length === 0) {
    throw new Error(
      'AI analysis completed, but no valid clusters could be grounded to the supplied feedback entries. Add clearer feedback items or retry.'
    );
  }

  const geoGroundedOpportunities = attachGroundedLocations(
    validated.opportunities,
    itemsToProcess
  );

  return {
    opportunities: geoGroundedOpportunities,
    interventions: validated.interventions,
    summaryNarrative: finalSummary,
    analyzedAt: lastAnalyzedAt,
    model: usedModel,
    analyzedFeedbackIds: itemsToProcess.map((f) => f.id),
    truncatedWarning,
  };
}

export async function checkAiHealthStatus(): Promise<{
  ok: boolean;
  hasApiKey: boolean;
  model: string;
  fallbackModel?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) {
      return {
        ok: false,
        hasApiKey: false,
        model: 'unknown',
        error: `Health endpoint returned HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      status?: string;
      hasApiKey?: boolean;
      model?: string;
      fallbackModel?: string;
    };
    return {
      ok: Boolean(data.ok) || data.status === 'ready' || data.status === 'ok',
      hasApiKey: Boolean(data.hasApiKey),
      model: data.model || 'gemini-3.1-flash-lite',
      fallbackModel: data.fallbackModel,
    };
  } catch {
    return {
      ok: false,
      hasApiKey: false,
      model: 'unavailable',
      error: 'Could not reach backend /api/health endpoint.',
    };
  }
}

/**
 * Functional local demo analysis engine:
 * Clusters the user's actual loaded feedback items deterministically without external API calls.
 * Clearly labeled: "Demo Analysis — not generated by live AI".
 * 100% grounded in real feedback IDs and verbatim quotes, never inventing fake records.
 */
export async function runDemoLocalAnalysis(
  feedbackItems: FeedbackItem[],
  workspaceName: string,
  onProgress?: (progress: AnalysisProgress) => void
): Promise<LiveAnalysisResult> {
  if (!feedbackItems || feedbackItems.length === 0) {
    throw new Error('No feedback items available for demo analysis.');
  }

  onProgress?.({
    isAnalyzing: true,
    currentBatch: 1,
    totalBatches: 2,
    stageMessage: `Local Demo Analysis: Grouping ${feedbackItems.length} feedback items by category and keywords...`,
  });

  await new Promise((resolve) => setTimeout(resolve, 350));

  // Semantic category buckets
  const buckets = new Map<string, FeedbackItem[]>();
  for (const item of feedbackItems) {
    const rawCat = (item.category || '').toLowerCase();
    let bucketKey = 'General Operations & Facilities';
    if (rawCat.includes('water') || item.text.toLowerCase().includes('water') || item.text.toLowerCase().includes('leak') || item.text.toLowerCase().includes('tap')) {
      bucketKey = 'Water Supply, Plumbing & Drainage';
    } else if (rawCat.includes('elect') || rawCat.includes('light') || item.text.toLowerCase().includes('light') || item.text.toLowerCase().includes('power') || item.text.toLowerCase().includes('socket')) {
      bucketKey = 'Electrical Systems, Lighting & Outlets';
    } else if (rawCat.includes('sanit') || rawCat.includes('waste') || item.text.toLowerCase().includes('trash') || item.text.toLowerCase().includes('garbage') || item.text.toLowerCase().includes('restroom') || item.text.toLowerCase().includes('clean')) {
      bucketKey = 'Sanitation, Restroom Hygiene & Waste Disposal';
    } else if (rawCat.includes('road') || rawCat.includes('footpath') || item.text.toLowerCase().includes('pothole') || item.text.toLowerCase().includes('pavement')) {
      bucketKey = 'Roads, Footpaths & Physical Safety';
    } else if (rawCat.includes('access') || item.text.toLowerCase().includes('ramp') || item.text.toLowerCase().includes('wheelchair') || item.text.toLowerCase().includes('lift') || item.text.toLowerCase().includes('elevator')) {
      bucketKey = 'Accessibility, Lifts & Inclusive Access';
    } else if (rawCat.includes('wi-fi') || rawCat.includes('wifi') || rawCat.includes('it') || item.text.toLowerCase().includes('internet') || item.text.toLowerCase().includes('portal')) {
      bucketKey = 'Digital Infrastructure & Campus Wi-Fi';
    } else if (rawCat.includes('dining') || rawCat.includes('canteen') || item.text.toLowerCase().includes('food') || item.text.toLowerCase().includes('meal')) {
      bucketKey = 'Dining, Food Quality & Canteen Operations';
    } else if (rawCat.includes('transport') || item.text.toLowerCase().includes('bus') || item.text.toLowerCase().includes('shuttle')) {
      bucketKey = 'Transit, Shuttle Schedules & Mobility';
    } else {
      bucketKey = item.category || 'General Operations & Facilities';
    }

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(item);
  }

  onProgress?.({
    isAnalyzing: true,
    currentBatch: 2,
    totalBatches: 2,
    stageMessage: 'Extracting verbatim evidence quotes and computing priority scores...',
  });

  await new Promise((resolve) => setTimeout(resolve, 300));

  const rawOpportunities: RawAiOpportunity[] = [];
  let clusterIdx = 1;

  for (const [clusterTitle, items] of buckets.entries()) {
    const relatedFeedbackIds = items.map((i) => i.id);
    const excerpts = items.slice(0, 3).map((item) => {
      const snippet = item.text.length > 140 ? `${item.text.slice(0, 137)}...` : item.text;
      return {
        feedbackId: item.id,
        excerpt: snippet,
        isContradictory: false,
      };
    });

    const hasHighImpact = items.some((i) => i.reportedImpact === 'High');
    const urgency = items.length >= 4 ? 'High' : items.length >= 2 ? 'Medium' : 'Low';
    const impact = hasHighImpact ? 'High' : items.length >= 3 ? 'Medium' : 'Low';

    rawOpportunities.push({
      title: `${clusterTitle} (${items.length} Reports)`,
      problemDescription: `Recurring issues identified across ${items.length} community feedback submissions regarding ${clusterTitle.toLowerCase()}.`,
      category: items[0].category || 'General Operations',
      affectedUsers: `${items.length} Community Reporters`,
      reportedConsequences: 'Reported disruption to daily routine and accessibility.',
      relatedFeedbackIds,
      contradictoryFeedbackIds: [],
      evidenceExcerpts: excerpts,
      reportedImpactLevel: impact,
      urgencyLevel: urgency,
      aiConfidenceNote: `Deterministically clustered from ${items.length} verified feedback entries (Rule-based Local Engine).`,
      informationGaps: items.length === 1 ? ['Single feedback entry — corroborate with on-site inspection.'] : [],
      suggestedSuccessMetrics: ['Reduction in category complaints by 50% post-resolution'],
      requiresFurtherInvestigation: items.length === 1,
      interventions: [
        {
          title: `Dispatch Targeted Inspection for ${clusterTitle}`,
          problemAddressed: `Address ${items.length} reported issues regarding ${clusterTitle.toLowerCase()}.`,
          effort: items.length > 3 ? 'Medium' : 'Low',
          potentialImpact: hasHighImpact ? 'High' : 'Medium',
          dependencies: ['Responsible department review', 'Field specialist availability'],
          responsibleRole: 'Field Operations Specialist',
          implementationSteps: [
            'Inspect cited locations in the feedback records',
            'Conduct root-cause diagnostic check',
            'Perform required repairs and log completion evidence',
          ],
          expectedOutcome: 'Restored service functionality verified by reporters.',
          successMetric: 'Zero repeat complaints within 14 days.',
          infoRequiredBeforeImpl: ['Site access schedule'],
        },
      ],
    });
    clusterIdx++;
  }

  const validated = validateAndGroundAiAnalysis(rawOpportunities, feedbackItems, 'sample_demo');
  const geoGrounded = attachGroundedLocations(validated.opportunities, feedbackItems);
  const nowIso = new Date().toISOString();

  return {
    opportunities: geoGrounded,
    interventions: validated.interventions,
    summaryNarrative: `Demo Analysis (Offline Engine): Evaluated ${feedbackItems.length} community feedback entries into ${geoGrounded.length} categorized clusters with 100% verified quotes and deterministic priority scores.`,
    analyzedAt: nowIso,
    model: 'Demo Analysis — not generated by live AI (Local Rule-Based Clustering)',
    analyzedFeedbackIds: feedbackItems.map((f) => f.id),
  };
}
