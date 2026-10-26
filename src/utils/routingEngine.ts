import type {
  CategoryRoutingRule,
  ComplaintCategory,
  ComplaintRecord,
  Department,
  PriorityTier,
  ScoredOpportunity,
  UrgencyLevel,
  WorkerProfile,
} from '../types/needmap';

export interface RoutingDecision {
  departmentId: string;
  departmentName: string;
  priorityTier: PriorityTier;
  expectedResolutionDate: string;
  rationale: string;
}

export interface WorkerRecommendation {
  worker: WorkerProfile;
  activeTaskCount: number;
  remainingCapacity: number;
  matchScore: number; // 0 - 100
  reasons: string[];
  isEligible: boolean;
}

export interface InferredWorkforceDemand {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  category: string;
  suggestedRoleTitle: string;
  departmentId?: string;
  priorityScore: number;
  supportingReportsCount: number;
  openComplaintsInCategory: number;
  rationale: string;
}

const ACTIVE_COMPLAINT_STATUSES = new Set([
  'assigned',
  'accepted',
  'in_progress',
  'reopened',
]);

export function computeInitialComplaintPriority(
  urgency: UrgencyLevel,
  ruleDefault: PriorityTier
): PriorityTier {
  if (urgency === 'Critical' || urgency === 'High') return 'High';
  if (urgency === 'Medium') {
    return ruleDefault === 'High' ? 'High' : 'Medium';
  }
  if (urgency === 'Low') {
    return ruleDefault === 'High' ? 'Medium' : 'Low';
  }
  return ruleDefault;
}

export function routeComplaintToDepartment(params: {
  category: ComplaintCategory;
  urgency: UrgencyLevel;
  departments: Department[];
  routingRules: CategoryRoutingRule[];
  submittedAt?: Date;
}): RoutingDecision {
  const { category, urgency, departments, routingRules, submittedAt = new Date() } = params;

  const matchedRule =
    routingRules.find((r) => r.category === category) ||
    routingRules.find((r) => r.category === 'other');

  const fallbackDept = departments[0];
  const targetDept =
    departments.find((d) => d.id === matchedRule?.departmentId) || fallbackDept;

  const slaDays = matchedRule?.slaDays ?? targetDept?.slaDaysDefault ?? 4;
  const adjustedSlaDays = urgency === 'Critical' ? Math.max(1, Math.floor(slaDays / 2)) : slaDays;

  const expectedDate = new Date(submittedAt.getTime() + adjustedSlaDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const priorityTier = computeInitialComplaintPriority(
    urgency,
    matchedRule?.defaultPriority ?? 'Medium'
  );

  return {
    departmentId: targetDept?.id || 'DEPT-FAC',
    departmentName: targetDept?.name || 'Central Triage Desk',
    priorityTier,
    expectedResolutionDate: expectedDate,
    rationale:
      matchedRule?.rationale ||
      `Routed to ${targetDept?.name || 'Central Triage Desk'} based on category mapping (${adjustedSlaDays}-day target window).`,
  };
}

/**
 * Deterministically ranks workers for a complaint using skill match, service zone match,
 * availability status, and current active task load. Never auto-assigns unavailable or
 * overloaded workers; explains clearly if no eligible worker is free.
 */
export function recommendWorkersForComplaint(params: {
  complaint: ComplaintRecord;
  workers: WorkerProfile[];
  allComplaints: ComplaintRecord[];
}): {
  recommendations: WorkerRecommendation[];
  bestMatch: WorkerRecommendation | null;
  noMatchExplanation?: string;
} {
  const { complaint, workers, allComplaints } = params;

  const activeCounts = new Map<string, number>();
  for (const c of allComplaints) {
    if (c.assignedWorkerId && ACTIVE_COMPLAINT_STATUSES.has(c.status)) {
      activeCounts.set(c.assignedWorkerId, (activeCounts.get(c.assignedWorkerId) || 0) + 1);
    }
  }

  const scored: WorkerRecommendation[] = workers.map((worker) => {
    const activeTaskCount = activeCounts.get(worker.id) || 0;
    const remainingCapacity = Math.max(0, worker.maxConcurrentTasks - activeTaskCount);

    let score = 0;
    const reasons: string[] = [];

    const hasCategorySkill = worker.skills.includes(complaint.category);
    if (hasCategorySkill) {
      score += 45;
      reasons.push('Matches issue category specialty');
    }

    if (worker.departmentId === complaint.assignedDepartmentId) {
      score += 20;
      reasons.push('Member of assigned department');
    }

    const complaintZone = (complaint.location.areaZone || complaint.location.address || '').toLowerCase();
    const zoneMatch = worker.serviceZones.some(
      (z) => complaintZone.includes(z.toLowerCase()) || z.toLowerCase().includes(complaintZone)
    );
    if (zoneMatch && complaintZone.length > 0) {
      score += 18;
      reasons.push('Covers reported location zone');
    }

    if (worker.availability === 'available' && remainingCapacity > 0) {
      score += 17;
      reasons.push(`Available (${activeTaskCount}/${worker.maxConcurrentTasks} active tasks)`);
    } else if (worker.availability === 'busy' && remainingCapacity > 0) {
      score += 5;
      reasons.push(`Currently marked Busy (${activeTaskCount}/${worker.maxConcurrentTasks} tasks)`);
    } else if (worker.availability === 'off_duty') {
      score -= 40;
      reasons.push('Currently Off Duty');
    } else {
      score -= 30;
      reasons.push(`At max workload (${activeTaskCount}/${worker.maxConcurrentTasks} tasks)`);
    }

    const isEligible =
      worker.availability !== 'off_duty' &&
      remainingCapacity > 0 &&
      (hasCategorySkill || worker.departmentId === complaint.assignedDepartmentId);

    return {
      worker,
      activeTaskCount,
      remainingCapacity,
      matchScore: Math.max(0, Math.min(100, score)),
      reasons,
      isEligible,
    };
  });

  scored.sort((a, b) => {
    if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return b.remainingCapacity - a.remainingCapacity;
  });

  const bestMatch = scored.find((r) => r.isEligible && r.worker.availability === 'available') || null;

  let noMatchExplanation: string | undefined;
  if (!bestMatch) {
    const anyDeptWorker = scored.some(
      (r) => r.worker.departmentId === complaint.assignedDepartmentId
    );
    noMatchExplanation = anyDeptWorker
      ? 'All qualified specialists in this department are currently Busy, Off Duty, or at maximum task capacity. Complaint remains safely in the Department Unassigned Queue for manual dispatch.'
      : 'No field worker profile currently lists skills for this category. A Department Admin can assign a cross-functional technician or post a workforce role.';
  }

  return {
    recommendations: scored,
    bestMatch,
    noMatchExplanation,
  };
}

/**
 * Generates clearly labeled "Inferred Workforce Demand" cards from recurring high-priority
 * opportunity clusters and active complaint backlogs—never presented as official job openings.
 */
export function computeInferredWorkforceDemand(
  opportunities: ScoredOpportunity[],
  complaints: ComplaintRecord[]
): InferredWorkforceDemand[] {
  return opportunities
    .filter((o) => o.priority.validSupportCount >= 3 && o.priority.totalScore >= 55)
    .slice(0, 4)
    .map((opp) => {
      const catLower = opp.category.toLowerCase();
      let suggestedRoleTitle = 'Operations & Field Support Specialist';
      if (catLower.includes('wi-fi') || catLower.includes('it')) {
        suggestedRoleTitle = 'Evening Network & Wireless Support Technician';
      } else if (catLower.includes('access')) {
        suggestedRoleTitle = 'Accessibility & Lift Maintenance Coordinator';
      } else if (catLower.includes('canteen') || catLower.includes('dining')) {
        suggestedRoleTitle = 'Peak-Hour Dining POS & Food-Safety Attendant';
      } else if (catLower.includes('classroom') || catLower.includes('av')) {
        suggestedRoleTitle = 'Morning Lecture Hall AV Readiness Technician';
      } else if (catLower.includes('student') || catLower.includes('registrar')) {
        suggestedRoleTitle = 'Extended-Hours Student Documentation Associate';
      } else if (catLower.includes('waste') || catLower.includes('sanitation')) {
        suggestedRoleTitle = 'Weekend Sanitation & Recycling Crew Member';
      }

      const openComplaintsInCategory = complaints.filter(
        (c) =>
          c.status !== 'closed' &&
          c.status !== 'cancelled' &&
          c.status !== 'rejected' &&
          (catLower.includes(c.category.replace('_', ' ')) ||
            c.assignedDepartmentId === opp.assignedDepartmentId)
      ).length;

      return {
        id: `DEMAND-${opp.id}`,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        category: opp.category,
        suggestedRoleTitle,
        departmentId: opp.assignedDepartmentId,
        priorityScore: opp.priority.totalScore,
        supportingReportsCount: opp.priority.validSupportCount,
        openComplaintsInCategory,
        rationale: `Inferred from ${opp.priority.validSupportCount} verified feedback reports (Priority ${opp.priority.totalScore}/100)${
          openComplaintsInCategory > 0
            ? ` and ${openComplaintsInCategory} open service complaint(s) in the same department`
            : ''
        }.`,
      };
    });
}
