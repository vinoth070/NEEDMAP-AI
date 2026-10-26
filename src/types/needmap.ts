export type WorkspaceViewId =
  | 'overview'
  | 'report_problem'
  | 'my_complaints'
  | 'central_registry'
  | 'inbox'
  | 'opportunities'
  | 'department_portal'
  | 'worker_portal'
  | 'jobs_portal'
  | 'evidence'
  | 'interventions'
  | 'impact'
  | 'reports'
  | 'settings';

export type LanguageCode =
  | 'en'
  | 'ta'
  | 'hi'
  | 'te'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'mr'
  | 'gu'
  | 'pa'
  | 'ur'
  | 'or'
  | 'es'
  | 'fr'
  | 'de'
  | 'ar'
  | 'pt'
  | 'ja'
  | 'zh';

export type ThemeMode = 'light' | 'dark' | 'system';

export type UserRole = 'citizen' | 'dept_admin' | 'worker' | 'platform_admin';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  username?: string;
  password?: string;
  portalTitle?: string;
  email: string;
  phone?: string;
  departmentId?: string;
  workerProfileId?: string;
  preferredLanguage?: LanguageCode;
  isDemoAccount?: boolean;
}

export type ReportedImpactLevel = 'Low' | 'Medium' | 'High' | 'Unknown';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'Unknown';
export type PriorityTier = 'High' | 'Medium' | 'Low';
export type EffortLevel = 'Low' | 'Medium' | 'High';

export type InterventionStatus =
  | 'Proposed'
  | 'Planned'
  | 'In Progress'
  | 'Completed'
  | 'Rejected';

export type VerificationStatus =
  | 'verified_exact'
  | 'verified_matched'
  | 'unverified';

export type AnalysisOrigin = 'live_ai' | 'sample_demo';

export type ComplaintCategory =
  | 'water_supply'
  | 'electricity'
  | 'roads'
  | 'sanitation'
  | 'waste_collection'
  | 'public_facilities'
  | 'accessibility'
  | 'transport'
  | 'wifi_it'
  | 'education'
  | 'dining_canteen'
  | 'other';

export type ComplaintStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'resolved_awaiting_confirmation'
  | 'closed'
  | 'rejected'
  | 'more_info_required'
  | 'escalated'
  | 'reopened'
  | 'cancelled';

export interface GeoLocationInfo {
  lat?: number;
  lng?: number;
  hasCoordinates: boolean;
  address: string;
  areaZone?: string;
  source: 'pin_selected' | 'gps_detected' | 'address_only';
}

export interface ComplaintAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  uploadedByRole: UserRole;
  uploadedByName: string;
  uploadedAt: string;
  visibility: 'reporter_and_staff' | 'public_summary';
  stage: 'submission' | 'followup' | 'resolution';
}

export interface ComplaintTimelineEvent {
  id: string;
  timestamp: string;
  status: ComplaintStatus;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  note: string;
  isPublic: boolean;
  attachmentIds?: string[];
}

export interface SatisfactionFeedback {
  isSatisfied: boolean;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  submittedAt: string;
}

export interface PriorityOverrideRecord {
  tier: PriorityTier;
  scoreOverride?: number;
  reason: string;
  overriddenBy: string;
  overriddenRole: UserRole;
  overriddenAt: string;
}

export interface ComplaintRecord {
  id: string;
  title: string;
  category: ComplaintCategory;
  description: string;
  urgency: UrgencyLevel;
  priorityTier: PriorityTier;
  priorityOverride?: PriorityOverrideRecord;
  status: ComplaintStatus;
  location: GeoLocationInfo;
  incidentDateTime: string;
  createdAt: string;
  updatedAt: string;
  expectedResolutionDate?: string;
  // Reporter & Privacy
  reporterAccountId: string;
  isAnonymous: boolean;
  reporterDisplayName: string; // 'Anonymous Citizen' if isAnonymous
  privateContactName?: string;
  privateContactEmail?: string;
  privateContactPhone?: string;
  preferredContactMethod: 'in_app' | 'email' | 'phone' | 'none';
  // Routing & Assignment
  assignedDepartmentId: string;
  routingExplanation: string;
  assignedWorkerId?: string;
  assignmentRationale?: string;
  unassignedReason?: string;
  // Evidence & Resolution
  attachments: ComplaintAttachment[];
  timeline: ComplaintTimelineEvent[];
  resolutionNotes?: string;
  satisfaction?: SatisfactionFeedback;
  linkedFeedbackId?: string;
  isDemo: boolean;
}

export interface Department {
  id: string;
  name: string;
  shortCode: string;
  description: string;
  headTitle: string;
  contactEmail: string;
  slaDaysDefault: number;
  serviceZones: string[];
}

export interface CategoryRoutingRule {
  category: ComplaintCategory;
  departmentId: string;
  defaultPriority: PriorityTier;
  slaDays: number;
  rationale: string;
}

export interface WorkerProfile {
  id: string;
  accountId: string;
  name: string;
  roleTitle: string;
  departmentId: string;
  skills: ComplaintCategory[];
  skillTags: string[];
  serviceZones: string[];
  availability: 'available' | 'busy' | 'off_duty';
  maxConcurrentTasks: number;
  completedTasksCount: number;
  phone: string;
  isDemo: boolean;
}

export interface JobVacancy {
  id: string;
  title: string;
  departmentId: string;
  category: ComplaintCategory;
  locationText: string;
  coordinates?: { lat: number; lng: number };
  employmentType: 'full_time' | 'contract' | 'student_fellowship' | 'part_time';
  positionsCount: number;
  compensationRange: string;
  requiredSkills: string[];
  description: string;
  closingDate: string;
  status: 'open' | 'closed';
  origin: 'sample_demo' | 'admin_managed';
  linkedOpportunityId?: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  vacancyId: string;
  applicantAccountId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  relevantSkills: string[];
  experienceSummary: string;
  availabilityNote: string;
  attachment?: ComplaintAttachment;
  status: 'submitted' | 'under_review' | 'shortlisted' | 'selected' | 'not_selected';
  submittedAt: string;
  updatedAt: string;
  reviewerNote?: string;
  isDemo?: boolean;
}

export interface FeedbackItem {
  id: string;
  text: string;
  category: string;
  date: string; // YYYY-MM-DD or ''
  source: string;
  reportedImpact: ReportedImpactLevel;
  isDemo: boolean;
  createdAt: string;
  updatedAt?: string;
  coordinates?: {
    lat: number;
    lng: number;
    locationLabel: string;
  };
  linkedComplaintId?: string;
}

export interface PriorityWeights {
  frequency: number; // default 30
  impact: number; // default 30
  urgency: number; // default 25
  confidence: number; // default 15
}

export interface EvidenceExcerpt {
  feedbackId: string;
  excerpt: string;
  isContradictory: boolean;
  verificationStatus: VerificationStatus;
}

export interface OpportunityCluster {
  id: string;
  title: string;
  problemDescription: string;
  category: string;
  affectedUsers: string;
  reportedConsequences: string;
  relatedFeedbackIds: string[];
  contradictoryFeedbackIds: string[];
  evidenceExcerpts: EvidenceExcerpt[];
  reportedImpactLevel: ReportedImpactLevel;
  urgencyLevel: UrgencyLevel;
  aiConfidenceNote: string;
  informationGaps: string[];
  suggestedSuccessMetrics: string[];
  requiresFurtherInvestigation: boolean;
  analysisOrigin: AnalysisOrigin;
  updatedAt: string;
  coordinates?: {
    lat: number;
    lng: number;
    locationLabel: string;
  };
  assignedDepartmentId?: string;
  priorityOverride?: PriorityOverrideRecord;
}

export interface PriorityBreakdown {
  opportunityId: string;
  totalScore: number; // Effective score (0 - 100)
  calculatedScore: number; // Deterministic formula score (0 - 100)
  tier: PriorityTier; // Effective tier (respects priorityOverride if present)
  calculatedTier: PriorityTier; // Formula tier
  isOverridden: boolean;
  frequencyScore: number; // 0 - 100
  impactScore: number; // 0 - 100
  urgencyScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  effectiveWeights: {
    frequency: number; // 0 - 1
    impact: number;
    urgency: number;
    confidence: number;
  };
  validSupportCount: number;
  contradictoryCount: number;
  verifiedExcerptCount: number;
  uniqueSourceCount: number;
  isImpactUnknown: boolean;
  isUrgencyUnknown: boolean;
  isEvidenceUnverified: boolean;
  explanation: string;
  recommendedNextAction: string;
}

export interface ScoredOpportunity extends OpportunityCluster {
  priority: PriorityBreakdown;
}

export interface InterventionItem {
  id: string;
  opportunityId: string;
  title: string;
  problemAddressed: string;
  effort: EffortLevel;
  potentialImpact: EffortLevel;
  dependencies: string[];
  responsibleRole: string;
  implementationSteps: string[];
  expectedOutcome: string;
  successMetric: string;
  infoRequiredBeforeImpl: string[];
  status: InterventionStatus;
  isSelected: boolean;
  userNotes: string;
  isAiGenerated: boolean;
  analysisOrigin: AnalysisOrigin | 'user_created';
  updatedAt: string;
}

export interface MeasurementRecord {
  id: string;
  value: number;
  date: string;
  notes: string;
}

export interface ImpactMetricTracker {
  id: string;
  opportunityId: string;
  interventionId?: string;
  metricName: string;
  unit: string;
  desiredDirection: 'decrease' | 'increase';
  baseline: MeasurementRecord | null;
  followUps: MeasurementRecord[];
  isDemoIllustration: boolean;
  updatedAt: string;
}

export interface AnalysisRunLog {
  id: string;
  timestamp: string;
  origin: AnalysisOrigin;
  model?: string;
  feedbackCount: number;
  clusterCount: number;
  summaryNarrative: string;
}

export interface AppNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  targetView?: WorkspaceViewId;
  targetComplaintId?: string;
}

export interface NotificationPreferences {
  inAppStatusUpdates: boolean;
  inAppAssignments: boolean;
  inAppAiSummaries: boolean;
  quietHoursEnabled: boolean;
}

export interface ComplaintPreferences {
  defaultAnonymous: boolean;
  defaultContactMethod: 'in_app' | 'email' | 'phone' | 'none';
  defaultAreaZone: string;
  sharePublicSummaryByDefault: boolean;
}

export interface WorkspaceState {
  workspaceName: string;
  workspaceContext: string;
  feedback: FeedbackItem[];
  analyzedFeedbackIds: string[];
  opportunities: OpportunityCluster[];
  interventions: InterventionItem[];
  impactTrackers: ImpactMetricTracker[];
  weights: PriorityWeights;
  analysisLogs: AnalysisRunLog[];
  notifications: AppNotification[];
  lastAnalyzedAt: string | null;
  currentAnalysisOrigin: AnalysisOrigin | null;
  // Upgraded Multi-Portal Entities
  accounts: UserAccount[];
  activeAccountId: string;
  departments: Department[];
  routingRules: CategoryRoutingRule[];
  workers: WorkerProfile[];
  complaints: ComplaintRecord[];
  vacancies: JobVacancy[];
  jobApplications: JobApplication[];
  notificationPrefs: NotificationPreferences;
  complaintPrefs: ComplaintPreferences;
  onboardingDismissed?: boolean;
}

export interface AnalysisProgress {
  isAnalyzing: boolean;
  currentBatch: number;
  totalBatches: number;
  stageMessage: string;
}
