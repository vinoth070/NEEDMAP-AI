import type {
  AnalysisOrigin,
  EvidenceExcerpt,
  FeedbackItem,
  InterventionItem,
  OpportunityCluster,
  ReportedImpactLevel,
  UrgencyLevel,
  VerificationStatus,
} from '../types/needmap';

export interface RawAiExcerpt {
  feedbackId?: string;
  excerpt?: string;
  isContradictory?: boolean;
}

export interface RawAiIntervention {
  title?: string;
  problemAddressed?: string;
  effort?: string;
  potentialImpact?: string;
  dependencies?: string[];
  responsibleRole?: string;
  implementationSteps?: string[];
  expectedOutcome?: string;
  successMetric?: string;
  infoRequiredBeforeImpl?: string[];
}

export interface RawAiOpportunity {
  title?: string;
  problemDescription?: string;
  category?: string;
  affectedUsers?: string;
  reportedConsequences?: string;
  relatedFeedbackIds?: string[];
  contradictoryFeedbackIds?: string[];
  evidenceExcerpts?: RawAiExcerpt[];
  reportedImpactLevel?: string;
  urgencyLevel?: string;
  aiConfidenceNote?: string;
  informationGaps?: string[];
  suggestedSuccessMetrics?: string[];
  requiresFurtherInvestigation?: boolean;
  interventions?: RawAiIntervention[];
}

function normalizeWhitespace(input: string): string {
  return input
    .toLowerCase()
    .replace(/['’"`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeWords(input: string): string[] {
  return normalizeWhitespace(input)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Verifies whether an AI-extracted quote corresponds to actual supplied feedback text.
 * Never invents quotes; marks unverifiable claims explicitly.
 */
export function verifyExcerptAgainstFeedback(
  excerpt: string,
  sourceText: string
): VerificationStatus {
  const cleanExcerpt = normalizeWhitespace(excerpt);
  const cleanSource = normalizeWhitespace(sourceText);

  if (!cleanExcerpt || !cleanSource) {
    return 'unverified';
  }

  if (cleanSource.includes(cleanExcerpt)) {
    return 'verified_exact';
  }

  // Strip surrounding ellipsis or punctuation and check substring again
  const strippedExcerpt = cleanExcerpt.replace(/^\.+|\.+$/g, '').trim();
  if (strippedExcerpt.length >= 8 && cleanSource.includes(strippedExcerpt)) {
    return 'verified_exact';
  }

  // Check content-word overlap for minor punctuation/casing normalization
  const excerptTokens = tokenizeWords(excerpt);
  const sourceTokenSet = new Set(tokenizeWords(sourceText));
  if (excerptTokens.length >= 3) {
    const matched = excerptTokens.filter((tok) => sourceTokenSet.has(tok)).length;
    const ratio = matched / excerptTokens.length;
    if (ratio >= 0.8) {
      return 'verified_matched';
    }
  }

  return 'unverified';
}

function sanitizeImpactLevel(val?: string): ReportedImpactLevel {
  if (val === 'Low' || val === 'Medium' || val === 'High' || val === 'Unknown') {
    return val;
  }
  const norm = (val || '').trim().toLowerCase();
  if (norm === 'low') return 'Low';
  if (norm === 'medium' || norm === 'moderate') return 'Medium';
  if (norm === 'high' || norm === 'severe' || norm === 'critical') return 'High';
  return 'Unknown';
}

function sanitizeUrgencyLevel(val?: string): UrgencyLevel {
  if (
    val === 'Low' ||
    val === 'Medium' ||
    val === 'High' ||
    val === 'Critical' ||
    val === 'Unknown'
  ) {
    return val;
  }
  const norm = (val || '').trim().toLowerCase();
  if (norm === 'low') return 'Low';
  if (norm === 'medium' || norm === 'moderate') return 'Medium';
  if (norm === 'high') return 'High';
  if (norm === 'critical' || norm === 'immediate' || norm === 'urgent') return 'Critical';
  return 'Unknown';
}

function sanitizeEffort(val?: string): 'Low' | 'Medium' | 'High' {
  const norm = (val || '').trim().toLowerCase();
  if (norm === 'low') return 'Low';
  if (norm === 'high') return 'High';
  return 'Medium';
}

export interface ValidatedAnalysisOutput {
  opportunities: OpportunityCluster[];
  interventions: InterventionItem[];
  strippedHallucinatedIdCount: number;
}

/**
 * Validates raw Gemini JSON output against the actual loaded feedback entries,
 * strips non-existent IDs, verifies every excerpt against original text,
 * and constructs stable OpportunityCluster and InterventionItem records.
 */
export function validateAndGroundAiAnalysis(
  rawOpportunities: RawAiOpportunity[],
  feedbackItems: FeedbackItem[],
  origin: AnalysisOrigin
): ValidatedAnalysisOutput {
  const feedbackMap = new Map<string, FeedbackItem>();
  for (const item of feedbackItems) {
    feedbackMap.set(item.id, item);
  }

  const nowIso = new Date().toISOString();
  const opportunities: OpportunityCluster[] = [];
  const interventions: InterventionItem[] = [];
  let strippedHallucinatedIdCount = 0;

  rawOpportunities.forEach((raw, idx) => {
    const oppId = `OPP-${String(idx + 1).padStart(2, '0')}`;
    const title = (raw.title || '').trim() || `Unnamed Issue Cluster ${idx + 1}`;
    const problemDescription =
      (raw.problemDescription || '').trim() ||
      'No detailed synthesis was returned; review linked feedback directly.';

    const rawRelated = Array.isArray(raw.relatedFeedbackIds) ? raw.relatedFeedbackIds : [];
    const rawContradictory = Array.isArray(raw.contradictoryFeedbackIds)
      ? raw.contradictoryFeedbackIds
      : [];

    const validRelatedSet = new Set<string>();
    for (const id of rawRelated) {
      const trimmedId = String(id).trim();
      if (feedbackMap.has(trimmedId)) {
        validRelatedSet.add(trimmedId);
      } else {
        strippedHallucinatedIdCount += 1;
      }
    }

    const validContradictorySet = new Set<string>();
    for (const id of rawContradictory) {
      const trimmedId = String(id).trim();
      if (feedbackMap.has(trimmedId)) {
        validContradictorySet.add(trimmedId);
      } else {
        strippedHallucinatedIdCount += 1;
      }
    }

    const verifiedExcerpts: EvidenceExcerpt[] = [];
    const rawExcerpts = Array.isArray(raw.evidenceExcerpts) ? raw.evidenceExcerpts : [];

    for (const ex of rawExcerpts) {
      let targetId = String(ex.feedbackId || '').trim();
      const excerptText = String(ex.excerpt || '').trim();
      if (!excerptText) continue;

      // If AI cited a slightly malformed ID, attempt exact substring lookup across input items
      if (!feedbackMap.has(targetId)) {
        const cleanEx = normalizeWhitespace(excerptText);
        if (cleanEx.length >= 12) {
          const matchedItem = feedbackItems.find((fb) =>
            normalizeWhitespace(fb.text).includes(cleanEx)
          );
          if (matchedItem) {
            targetId = matchedItem.id;
          }
        }
      }

      const sourceItem = feedbackMap.get(targetId);
      if (!sourceItem) {
        strippedHallucinatedIdCount += 1;
        continue;
      }

      const status = verifyExcerptAgainstFeedback(excerptText, sourceItem.text);
      const isContra = Boolean(ex.isContradictory) || validContradictorySet.has(targetId);

      if (isContra) {
        validContradictorySet.add(targetId);
      } else {
        validRelatedSet.add(targetId);
      }

      verifiedExcerpts.push({
        feedbackId: targetId,
        excerpt: excerptText,
        isContradictory: isContra,
        verificationStatus: status,
      });
    }

    // If validRelatedSet has items but verifiedExcerpts is empty, pull ground-truth snippets directly from real items
    if (validRelatedSet.size > 0 && verifiedExcerpts.length === 0) {
      Array.from(validRelatedSet)
        .slice(0, 3)
        .forEach((fbId) => {
          const fb = feedbackMap.get(fbId);
          if (fb) {
            const snippet = fb.text.length > 160 ? `${fb.text.slice(0, 157)}...` : fb.text;
            verifiedExcerpts.push({
              feedbackId: fbId,
              excerpt: snippet,
              isContradictory: false,
              verificationStatus: 'verified_exact',
            });
          }
        });
    }

    const validRelatedIds = Array.from(validRelatedSet);
    const validContradictoryIds = Array.from(validContradictorySet);

    const hasInsufficientEvidence =
      validRelatedIds.length < 2 ||
      verifiedExcerpts.every((e) => e.verificationStatus === 'unverified');

    const infoGaps = Array.isArray(raw.informationGaps)
      ? raw.informationGaps.map((g) => String(g).trim()).filter(Boolean)
      : [];

    if (validRelatedIds.length === 0) {
      infoGaps.unshift(
        'Unverified cluster: No matching source feedback IDs could be confirmed in the current inbox.'
      );
    } else if (validRelatedIds.length === 1) {
      if (!infoGaps.some((g) => g.toLowerCase().includes('single'))) {
        infoGaps.push(
          'Single-source report: Only one feedback entry currently reports this issue; corroborate before major spend.'
        );
      }
    }

    const opp: OpportunityCluster = {
      id: oppId,
      title,
      problemDescription,
      category: (raw.category || '').trim() || 'General Operations',
      affectedUsers:
        (raw.affectedUsers || '').trim() || 'Not explicitly specified in feedback reports',
      reportedConsequences:
        (raw.reportedConsequences || '').trim() ||
        'Specific consequences require follow-up confirmation',
      relatedFeedbackIds: validRelatedIds,
      contradictoryFeedbackIds: validContradictoryIds,
      evidenceExcerpts: verifiedExcerpts,
      reportedImpactLevel: sanitizeImpactLevel(raw.reportedImpactLevel),
      urgencyLevel: sanitizeUrgencyLevel(raw.urgencyLevel),
      aiConfidenceNote:
        (raw.aiConfidenceNote || '').trim() ||
        (validRelatedIds.length >= 3
          ? 'Supported by multiple independent feedback entries.'
          : 'Limited report volume; treat interpretation with caution.'),
      informationGaps: infoGaps,
      suggestedSuccessMetrics: Array.isArray(raw.suggestedSuccessMetrics)
        ? raw.suggestedSuccessMetrics.map((m) => String(m).trim()).filter(Boolean)
        : ['Post-intervention complaint volume reduction'],
      requiresFurtherInvestigation:
        Boolean(raw.requiresFurtherInvestigation) || hasInsufficientEvidence,
      analysisOrigin: origin,
      updatedAt: nowIso,
    };

    opportunities.push(opp);

    const rawInterventions = Array.isArray(raw.interventions) ? raw.interventions : [];
    rawInterventions.forEach((rawInt, intIdx) => {
      const intTitle = (rawInt.title || '').trim();
      if (!intTitle) return;

      interventions.push({
        id: `INT-${String(idx + 1).padStart(2, '0')}-${intIdx + 1}`,
        opportunityId: oppId,
        title: intTitle,
        problemAddressed:
          (rawInt.problemAddressed || '').trim() || opp.title,
        effort: sanitizeEffort(rawInt.effort),
        potentialImpact: sanitizeEffort(rawInt.potentialImpact),
        dependencies: Array.isArray(rawInt.dependencies)
          ? rawInt.dependencies.map((d) => String(d).trim()).filter(Boolean)
          : [],
        responsibleRole: (rawInt.responsibleRole || '').trim() || 'Operations Team',
        implementationSteps: Array.isArray(rawInt.implementationSteps)
          ? rawInt.implementationSteps.map((s) => String(s).trim()).filter(Boolean)
          : [],
        expectedOutcome:
          (rawInt.expectedOutcome || '').trim() ||
          'Estimated reduction in recurring user friction once validated.',
        successMetric:
          (rawInt.successMetric || '').trim() ||
          opp.suggestedSuccessMetrics[0] ||
          'Complaint recurrence rate',
        infoRequiredBeforeImpl: Array.isArray(rawInt.infoRequiredBeforeImpl)
          ? rawInt.infoRequiredBeforeImpl.map((r) => String(r).trim()).filter(Boolean)
          : [],
        status: 'Proposed',
        isSelected: false,
        userNotes: '',
        isAiGenerated: true,
        analysisOrigin: origin,
        updatedAt: nowIso,
      });
    });
  });

  return {
    opportunities,
    interventions,
    strippedHallucinatedIdCount,
  };
}
