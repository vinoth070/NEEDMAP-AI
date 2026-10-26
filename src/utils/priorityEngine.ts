import type {
  FeedbackItem,
  OpportunityCluster,
  PriorityBreakdown,
  PriorityTier,
  PriorityWeights,
  ReportedImpactLevel,
  ScoredOpportunity,
  UrgencyLevel,
} from '../types/needmap';

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  frequency: 30,
  impact: 30,
  urgency: 25,
  confidence: 15,
};

/**
 * Documented neutral fallback score (50/100) used when Reported Impact or Urgency
 * cannot be established from the available feedback evidence.
 */
export const UNKNOWN_FACTOR_NEUTRAL_SCORE = 50;

function mapImpactLevelToScore(level: ReportedImpactLevel): {
  score: number;
  isUnknown: boolean;
} {
  switch (level) {
    case 'Low':
      return { score: 25, isUnknown: false };
    case 'Medium':
      return { score: 60, isUnknown: false };
    case 'High':
      return { score: 90, isUnknown: false };
    case 'Unknown':
    default:
      return { score: UNKNOWN_FACTOR_NEUTRAL_SCORE, isUnknown: true };
  }
}

function mapUrgencyLevelToScore(level: UrgencyLevel): {
  score: number;
  isUnknown: boolean;
} {
  switch (level) {
    case 'Low':
      return { score: 25, isUnknown: false };
    case 'Medium':
      return { score: 55, isUnknown: false };
    case 'High':
      return { score: 82, isUnknown: false };
    case 'Critical':
      return { score: 98, isUnknown: false };
    case 'Unknown':
    default:
      return { score: UNKNOWN_FACTOR_NEUTRAL_SCORE, isUnknown: true };
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function normalizeWeights(weights: PriorityWeights): {
  frequency: number;
  impact: number;
  urgency: number;
  confidence: number;
} {
  const f = Math.max(0, Number(weights.frequency) || 0);
  const i = Math.max(0, Number(weights.impact) || 0);
  const u = Math.max(0, Number(weights.urgency) || 0);
  const c = Math.max(0, Number(weights.confidence) || 0);
  const sum = f + i + u + c;

  if (sum <= 0) {
    return {
      frequency: 0.3,
      impact: 0.3,
      urgency: 0.25,
      confidence: 0.15,
    };
  }

  return {
    frequency: f / sum,
    impact: i / sum,
    urgency: u / sum,
    confidence: c / sum,
  };
}

export function getPriorityTier(score: number): PriorityTier {
  if (score >= 70) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

function buildPlainLanguageNextAction(params: {
  tier: PriorityTier;
  validSupportCount: number;
  impactScore: number;
  confidenceScore: number;
  requiresFurtherInvestigation: boolean;
}): string {
  const {
    tier,
    validSupportCount,
    impactScore,
    confidenceScore,
    requiresFurtherInvestigation,
  } = params;

  if (requiresFurtherInvestigation || (impactScore >= 75 && validSupportCount < 2)) {
    return 'Verify Details First: High reported severity, but conduct a quick site/safety check to confirm scope before major spend.';
  }
  if (tier === 'High' && confidenceScore >= 65) {
    return 'Immediate Action Recommended: Assign responsible department, dispatch field specialist, and track baseline metric.';
  }
  if (tier === 'High') {
    return 'Fast-Track Review: High priority need—confirm exact affected locations and schedule repair.';
  }
  if (tier === 'Medium') {
    return 'Schedule Planned Fix: Group into upcoming department maintenance cycle and monitor incoming reports.';
  }
  return 'Monitor & Log: Keep open for additional community reports before allocating dedicated crew capacity.';
}

/**
 * Deterministically calculates normalized 0-100 component scores and the weighted
 * Priority Score for every opportunity cluster in the current dataset, while transparently
 * honoring authorized staff priority overrides alongside calculated scores.
 *
 * Formula:
 * Priority Score = (Frequency * w_freq) + (Reported Impact * w_imp) + (Urgency * w_urg) + (Evidence Confidence * w_conf)
 */
export function scoreOpportunities(
  opportunities: OpportunityCluster[],
  feedbackItems: FeedbackItem[],
  weights: PriorityWeights
): ScoredOpportunity[] {
  const feedbackMap = new Map<string, FeedbackItem>();
  for (const item of feedbackItems) {
    feedbackMap.set(item.id, item);
  }

  const effectiveWeights = normalizeWeights(weights);

  const validCounts = opportunities.map(
    (opp) => opp.relatedFeedbackIds.filter((id) => feedbackMap.has(id)).length
  );
  const maxClusterSupport = Math.max(...validCounts, 3);

  return opportunities
    .map((opp): ScoredOpportunity => {
      const validFeedbackItems = opp.relatedFeedbackIds
        .map((id) => feedbackMap.get(id))
        .filter((f): f is FeedbackItem => Boolean(f));

      const validSupportCount = validFeedbackItems.length;
      const contradictoryCount = opp.contradictoryFeedbackIds.filter((id) =>
        feedbackMap.has(id)
      ).length;

      // 1. Frequency Score (0 - 100)
      const frequencyScore =
        validSupportCount === 0
          ? 0
          : clamp(Math.round((validSupportCount / maxClusterSupport) * 100), 0, 100);

      // 2. User-Reported Impact Score (0 - 100)
      const clusterImpact = mapImpactLevelToScore(opp.reportedImpactLevel);
      const taggedImpacts = validFeedbackItems
        .filter((f) => f.reportedImpact !== 'Unknown')
        .map((f) => mapImpactLevelToScore(f.reportedImpact).score);

      let impactScore = clusterImpact.score;
      let isImpactUnknown = clusterImpact.isUnknown;

      if (taggedImpacts.length > 0) {
        const avgTagged =
          taggedImpacts.reduce((acc, v) => acc + v, 0) / taggedImpacts.length;
        impactScore = clusterImpact.isUnknown
          ? Math.round(avgTagged)
          : Math.round(clusterImpact.score * 0.65 + avgTagged * 0.35);
        isImpactUnknown = false;
      }
      impactScore = clamp(impactScore, 0, 100);

      // 3. Urgency Score (0 - 100)
      const urgencyMapped = mapUrgencyLevelToScore(opp.urgencyLevel);
      const urgencyScore = clamp(urgencyMapped.score, 0, 100);
      const isUrgencyUnknown = urgencyMapped.isUnknown;

      // 4. Evidence Confidence Score (0 - 100)
      const verifiedExcerpts = opp.evidenceExcerpts.filter(
        (ex) =>
          !ex.isContradictory &&
          feedbackMap.has(ex.feedbackId) &&
          (ex.verificationStatus === 'verified_exact' ||
            ex.verificationStatus === 'verified_matched')
      );
      const unverifiedExcerpts = opp.evidenceExcerpts.filter(
        (ex) => ex.verificationStatus === 'unverified'
      );

      const uniqueSources = new Set(
        validFeedbackItems.map((f) => (f.source || 'Unspecified').trim().toLowerCase())
      );

      let confidenceScore = 0;
      const isEvidenceUnverified = validSupportCount === 0;

      if (!isEvidenceUnverified) {
        const quoteTarget = Math.min(validSupportCount, 3);
        const quoteCoveragePart =
          quoteTarget > 0
            ? Math.min(verifiedExcerpts.length / quoteTarget, 1) * 45
            : 0;
        const corroborationPart = (Math.min(validSupportCount, 5) / 5) * 40;
        const sourceDiversityPart =
          uniqueSources.size >= 3 ? 15 : uniqueSources.size === 2 ? 10 : 5;

        let penalty = 0;
        if (contradictoryCount > 0) penalty += 14;
        if (opp.informationGaps.length >= 3) penalty += 8;
        if (unverifiedExcerpts.length > 0) penalty += 12;

        confidenceScore = clamp(
          Math.round(quoteCoveragePart + corroborationPart + sourceDiversityPart - penalty),
          10,
          100
        );
      }

      // 5. Weighted Total Priority Score (0 - 100)
      const rawTotal =
        frequencyScore * effectiveWeights.frequency +
        impactScore * effectiveWeights.impact +
        urgencyScore * effectiveWeights.urgency +
        confidenceScore * effectiveWeights.confidence;

      const calculatedScore = clamp(Math.round(rawTotal), 0, 100);
      const calculatedTier = getPriorityTier(calculatedScore);

      const isOverridden = Boolean(opp.priorityOverride);
      let effectiveTier = calculatedTier;
      let effectiveScore = calculatedScore;

      if (opp.priorityOverride) {
        effectiveTier = opp.priorityOverride.tier;
        if (typeof opp.priorityOverride.scoreOverride === 'number') {
          effectiveScore = clamp(Math.round(opp.priorityOverride.scoreOverride), 0, 100);
        } else if (effectiveTier === 'High' && calculatedScore < 70) {
          effectiveScore = 78;
        } else if (effectiveTier === 'Medium' && (calculatedScore < 45 || calculatedScore >= 70)) {
          effectiveScore = 58;
        } else if (effectiveTier === 'Low' && calculatedScore >= 45) {
          effectiveScore = 32;
        }
      }

      const explanationParts: string[] = [];
      if (isOverridden && opp.priorityOverride) {
        explanationParts.push(
          `Official Priority manually set to ${effectiveTier} by ${opp.priorityOverride.overriddenBy} ("${opp.priorityOverride.reason}"). Formula calculated ${calculatedScore}/100 (${calculatedTier}).`
        );
      } else {
        explanationParts.push(
          `Ranked ${calculatedTier} Priority (${calculatedScore}/100) from ${validSupportCount} verified ${
            validSupportCount === 1 ? 'report' : 'reports'
          } (Frequency ${frequencyScore}/100 vs dataset peak of ${Math.max(
            ...validCounts,
            0
          )}).`
        );
      }

      if (isImpactUnknown || isUrgencyUnknown) {
        const unknowns = [
          isImpactUnknown ? 'Reported Impact' : null,
          isUrgencyUnknown ? 'Urgency' : null,
        ]
          .filter(Boolean)
          .join(' and ');
        explanationParts.push(
          `${unknowns} lacked explicit evidence and received a neutral ${UNKNOWN_FACTOR_NEUTRAL_SCORE}/100 treatment.`
        );
      } else {
        explanationParts.push(
          `User-reported severity scored ${impactScore}/100 (${opp.reportedImpactLevel}) and urgency scored ${urgencyScore}/100 (${opp.urgencyLevel}).`
        );
      }

      if (contradictoryCount > 0) {
        explanationParts.push(
          `Confidence (${confidenceScore}/100) reflects ${contradictoryCount} scope-limiting ${
            contradictoryCount === 1 ? 'report' : 'reports'
          }.`
        );
      } else if (validSupportCount === 1) {
        explanationParts.push(
          `Confidence (${confidenceScore}/100) is lower because only a single report supports this issue so far.`
        );
      } else {
        explanationParts.push(
          `Evidence confidence is ${confidenceScore}/100 across ${uniqueSources.size} ${
            uniqueSources.size === 1 ? 'source' : 'distinct sources'
          }.`
        );
      }

      const recommendedNextAction = buildPlainLanguageNextAction({
        tier: effectiveTier,
        validSupportCount,
        impactScore,
        confidenceScore,
        requiresFurtherInvestigation: opp.requiresFurtherInvestigation,
      });

      const priority: PriorityBreakdown = {
        opportunityId: opp.id,
        totalScore: effectiveScore,
        calculatedScore,
        tier: effectiveTier,
        calculatedTier,
        isOverridden,
        frequencyScore,
        impactScore,
        urgencyScore,
        confidenceScore,
        effectiveWeights,
        validSupportCount,
        contradictoryCount,
        verifiedExcerptCount: verifiedExcerpts.length,
        uniqueSourceCount: uniqueSources.size,
        isImpactUnknown,
        isUrgencyUnknown,
        isEvidenceUnverified,
        explanation: explanationParts.join(' '),
        recommendedNextAction,
      };

      return {
        ...opp,
        priority,
      };
    })
    .sort((a, b) => {
      if (b.priority.totalScore !== a.priority.totalScore) {
        return b.priority.totalScore - a.priority.totalScore;
      }
      return b.priority.validSupportCount - a.priority.validSupportCount;
    });
}
