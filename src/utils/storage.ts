import { buildDemoSampleAnalysis, DEMO_FEEDBACK_ITEMS } from '../data/demoData';
import {
  DEFAULT_ROUTING_RULES,
  DEMO_ACCOUNTS,
  DEMO_COMPLAINTS,
  DEMO_DEPARTMENTS,
  DEMO_JOB_APPLICATIONS,
  DEMO_VACANCIES,
  DEMO_WORKERS,
  enrichDemoOpportunitiesWithLocations,
} from '../data/platformDemoData';
import type {
  ComplaintPreferences,
  NotificationPreferences,
  WorkspaceState,
} from '../types/needmap';
import { DEFAULT_PRIORITY_WEIGHTS } from './priorityEngine';

const STORAGE_KEY_V2 = 'needmap_ai_workspace_v2';
const LEGACY_STORAGE_KEY_V1 = 'needmap_ai_workspace_v1';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  inAppStatusUpdates: true,
  inAppAssignments: true,
  inAppAiSummaries: true,
  quietHoursEnabled: false,
};

export const DEFAULT_COMPLAINT_PREFS: ComplaintPreferences = {
  defaultAnonymous: false,
  defaultContactMethod: 'in_app',
  defaultAreaZone: 'Main Academic Block',
  sharePublicSummaryByDefault: true,
};

export function createInitialDemoWorkspaceState(): WorkspaceState {
  const sample = buildDemoSampleAnalysis();
  const initialTimestamp = '2026-10-25T09:00:00.000Z';
  const enrichedOpps = enrichDemoOpportunitiesWithLocations(sample.opportunities);

  return {
    workspaceName: 'Northbridge Campus & Civic Service Desk',
    workspaceContext:
      'Public Issue Reporting, Department Dispatch & AI Feedback Prioritization',
    feedback: DEMO_FEEDBACK_ITEMS,
    analyzedFeedbackIds: DEMO_FEEDBACK_ITEMS.map((f) => f.id),
    opportunities: enrichedOpps,
    interventions: sample.interventions,
    impactTrackers: sample.impactTrackers,
    weights: { ...DEFAULT_PRIORITY_WEIGHTS },
    analysisLogs: [
      {
        id: 'LOG-DEMO-INIT',
        timestamp: initialTimestamp,
        origin: 'sample_demo',
        feedbackCount: DEMO_FEEDBACK_ITEMS.length,
        clusterCount: enrichedOpps.length,
        summaryNarrative: sample.summaryNarrative,
      },
    ],
    notifications: [
      {
        id: 'NOTIF-WELCOME',
        timestamp: initialTimestamp,
        title: 'Demo Workspace Ready',
        message:
          'Loaded sample citizen complaints, 36 feedback items, department queues, and demo job vacancies. Use "Report a Problem" or "Analyze Feedback" anytime.',
        type: 'info',
        read: false,
        targetView: 'overview',
      },
    ],
    lastAnalyzedAt: initialTimestamp,
    currentAnalysisOrigin: 'sample_demo',
    accounts: DEMO_ACCOUNTS,
    activeAccountId: DEMO_ACCOUNTS[0].id, // Default Citizen: Ananya Krishnan
    departments: DEMO_DEPARTMENTS,
    routingRules: DEFAULT_ROUTING_RULES,
    workers: DEMO_WORKERS,
    complaints: DEMO_COMPLAINTS,
    vacancies: DEMO_VACANCIES,
    jobApplications: DEMO_JOB_APPLICATIONS,
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    complaintPrefs: { ...DEFAULT_COMPLAINT_PREFS },
    onboardingDismissed: false,
  };
}

export function createEmptyWorkspaceState(workspaceName?: string): WorkspaceState {
  const nowIso = new Date().toISOString();
  return {
    workspaceName: workspaceName || 'My NEEDMAP Workspace',
    workspaceContext: 'Community Service Desk & Feedback Prioritization',
    feedback: [],
    analyzedFeedbackIds: [],
    opportunities: [],
    interventions: [],
    impactTrackers: [],
    weights: { ...DEFAULT_PRIORITY_WEIGHTS },
    analysisLogs: [],
    notifications: [
      {
        id: `NOTIF-${Date.now()}`,
        timestamp: nowIso,
        title: 'Workspace Cleared',
        message:
          'All complaints, feedback, and analysis clusters have been cleared. Report a new problem, paste feedback, or load sample data anytime.',
        type: 'info',
        read: false,
        targetView: 'overview',
      },
    ],
    lastAnalyzedAt: null,
    currentAnalysisOrigin: null,
    accounts: DEMO_ACCOUNTS,
    activeAccountId: DEMO_ACCOUNTS[0].id,
    departments: DEMO_DEPARTMENTS,
    routingRules: DEFAULT_ROUTING_RULES,
    workers: DEMO_WORKERS,
    complaints: [],
    vacancies: [],
    jobApplications: [],
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    complaintPrefs: { ...DEFAULT_COMPLAINT_PREFS },
    onboardingDismissed: true,
  };
}

export function loadWorkspaceState(): {
  state: WorkspaceState;
  storageWarning?: string;
} {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        state: createInitialDemoWorkspaceState(),
        storageWarning:
          'Browser localStorage is unavailable; changes will only persist for this tab session.',
      };
    }

    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    const rawLegacy = !rawV2 ? window.localStorage.getItem(LEGACY_STORAGE_KEY_V1) : null;
    const raw = rawV2 || rawLegacy;

    if (!raw) {
      const initial = createInitialDemoWorkspaceState();
      saveWorkspaceState(initial);
      return { state: initial };
    }

    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    if (!parsed || !Array.isArray(parsed.feedback) || !Array.isArray(parsed.opportunities)) {
      const fallback = createInitialDemoWorkspaceState();
      return {
        state: fallback,
        storageWarning:
          'Saved workspace data had an outdated format and was reset to the default workspace.',
      };
    }

    const baseDemo = createInitialDemoWorkspaceState();
    const accounts =
      Array.isArray(parsed.accounts) && parsed.accounts.length > 0
        ? parsed.accounts
        : baseDemo.accounts;
    const activeAccountId =
      parsed.activeAccountId && accounts.some((a) => a.id === parsed.activeAccountId)
        ? parsed.activeAccountId
        : accounts[0].id;

    const hydrated: WorkspaceState = {
      workspaceName: parsed.workspaceName || baseDemo.workspaceName,
      workspaceContext: parsed.workspaceContext || baseDemo.workspaceContext,
      feedback: parsed.feedback,
      analyzedFeedbackIds: Array.isArray(parsed.analyzedFeedbackIds)
        ? parsed.analyzedFeedbackIds
        : [],
      opportunities: enrichDemoOpportunitiesWithLocations(parsed.opportunities),
      interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [],
      impactTrackers: Array.isArray(parsed.impactTrackers) ? parsed.impactTrackers : [],
      weights: parsed.weights || { ...DEFAULT_PRIORITY_WEIGHTS },
      analysisLogs: Array.isArray(parsed.analysisLogs) ? parsed.analysisLogs : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      lastAnalyzedAt: parsed.lastAnalyzedAt ?? null,
      currentAnalysisOrigin: parsed.currentAnalysisOrigin ?? null,
      accounts,
      activeAccountId,
      departments:
        Array.isArray(parsed.departments) && parsed.departments.length > 0
          ? parsed.departments
          : baseDemo.departments,
      routingRules:
        Array.isArray(parsed.routingRules) && parsed.routingRules.length > 0
          ? parsed.routingRules
          : baseDemo.routingRules,
      workers:
        Array.isArray(parsed.workers) && parsed.workers.length > 0
          ? parsed.workers
          : baseDemo.workers,
      complaints: Array.isArray(parsed.complaints)
        ? parsed.complaints
        : baseDemo.complaints,
      vacancies: Array.isArray(parsed.vacancies) ? parsed.vacancies : baseDemo.vacancies,
      jobApplications: Array.isArray(parsed.jobApplications)
        ? parsed.jobApplications
        : baseDemo.jobApplications,
      notificationPrefs: parsed.notificationPrefs
        ? { ...DEFAULT_NOTIFICATION_PREFS, ...parsed.notificationPrefs }
        : { ...DEFAULT_NOTIFICATION_PREFS },
      complaintPrefs: parsed.complaintPrefs
        ? { ...DEFAULT_COMPLAINT_PREFS, ...parsed.complaintPrefs }
        : { ...DEFAULT_COMPLAINT_PREFS },
      onboardingDismissed: Boolean(parsed.onboardingDismissed),
    };

    if (rawLegacy && !rawV2) {
      saveWorkspaceState(hydrated);
    }

    return { state: hydrated };
  } catch {
    return {
      state: createInitialDemoWorkspaceState(),
      storageWarning:
        'Could not read browser localStorage; initialized in-memory session state.',
    };
  }
}

export function saveWorkspaceState(state: WorkspaceState): { ok: boolean; error?: string } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: false, error: 'localStorage is unavailable in this browser context.' };
    }
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(state));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error && err.name === 'QuotaExceededError'
        ? 'Browser localStorage limit reached (often due to large image/PDF attachments). Export a JSON backup or remove older attachments.'
        : 'Unable to persist changes to browser storage.';
    return { ok: false, error: message };
  }
}
