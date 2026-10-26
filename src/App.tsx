/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthScreen } from './components/Auth/AuthScreen';
import { AnalysisBanner } from './components/Common/AnalysisBanner';
import { DemoPortalLoginModal } from './components/Common/DemoPortalLoginModal';
import { KeyboardShortcutsModal } from './components/Common/KeyboardShortcutsModal';
import { Sidebar } from './components/Layout/Sidebar';
import { TopBar } from './components/Layout/TopBar';
import { CentralComplaintsPortalView } from './components/Views/CentralComplaintsPortalView';
import { DepartmentPortalView } from './components/Views/DepartmentPortalView';
import { EvidenceExplorerView } from './components/Views/EvidenceExplorerView';
import { FeedbackInboxView } from './components/Views/FeedbackInboxView';
import { ImpactTrackerView } from './components/Views/ImpactTrackerView';
import { InterventionPlannerView } from './components/Views/InterventionPlannerView';
import { JobsPortalView } from './components/Views/JobsPortalView';
import { MyComplaintsView } from './components/Views/MyComplaintsView';
import { OpportunityMapView } from './components/Views/OpportunityMapView';
import { OverviewView } from './components/Views/OverviewView';
import { ReportProblemView } from './components/Views/ReportProblemView';
import { ReportsExportView } from './components/Views/ReportsExportView';
import { SettingsHelpView } from './components/Views/SettingsHelpView';
import { WorkerPortalView } from './components/Views/WorkerPortalView';
import { buildDemoSampleAnalysis } from './data/demoData';
import { enrichDemoOpportunitiesWithLocations } from './data/platformDemoData';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useI18n } from './i18n/I18nContext';
import {
  authorizeComplaintStatusChange,
  authorizeDepartmentManagement,
  authorizePriorityOverride,
  isStaffRole,
} from './services/accessControl';
import { runDemoLocalAnalysis, runLiveGeminiAnalysis } from './services/analysisService';
import { AIAssistantWidget } from './components/Common/AIAssistantWidget';
import { FirebaseAuthAdapter, LocalDemoAuthAdapter } from './services/authAdapter';
import {
  auth,
  onAuthStateChanged,
  syncUserProfile,
  testFirestoreConnection,
  saveComplaintToFirestore,
  updateComplaintInFirestore,
  subscribeToComplaints,
  saveJobApplicationToFirestore,
} from './services/firebase';
import type {
  AnalysisProgress,
  AppNotification,
  ComplaintAttachment,
  ComplaintCategory,
  ComplaintPreferences,
  ComplaintRecord,
  ComplaintStatus,
  FeedbackItem,
  ImpactMetricTracker,
  InterventionItem,
  InterventionStatus,
  JobApplication,
  JobVacancy,
  NotificationPreferences,
  PriorityTier,
  PriorityWeights,
  UserAccount,
  WorkspaceState,
  WorkspaceViewId,
} from './types/needmap';
import { scoreOpportunities } from './utils/priorityEngine';
import { recommendWorkersForComplaint } from './utils/routingEngine';
import {
  createEmptyWorkspaceState,
  createInitialDemoWorkspaceState,
  loadWorkspaceState,
  saveWorkspaceState,
} from './utils/storage';

export default function App() {
  const { lang, tCategory } = useI18n();
  const initialLoaded = useMemo(() => loadWorkspaceState(), []);

  const [workspace, setWorkspace] = useState<WorkspaceState>(initialLoaded.state);
  const [storageWarning, setStorageWarning] = useState<string | null>(
    initialLoaded.storageWarning || null
  );

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(LocalDemoAuthAdapter.getCurrentSession())
  );
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Navigation & Cross-View Focus State
  const [activeView, setActiveView] = useState<WorkspaceViewId>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDemoLoginOpen, setIsDemoLoginOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(
    initialLoaded.state.opportunities[0]?.id || null
  );
  const [focusedComplaintId, setFocusedComplaintId] = useState<string | null>(
    initialLoaded.state.complaints[0]?.id || null
  );
  const [highlightedFeedbackId, setHighlightedFeedbackId] = useState<string | null>(null);
  const [inboxIntakeMode, setInboxIntakeMode] = useState<'paste' | 'csv' | 'demo' | null>(
    null
  );
  const [focusedImpactIds, setFocusedImpactIds] = useState<{
    opportunityId: string | null;
    interventionId: string | null;
  }>({ opportunityId: null, interventionId: null });

  // Live AI Execution State
  const isAnalyzingRef = useRef(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    isAnalyzing: false,
    currentBatch: 0,
    totalBatches: 0,
    stageMessage: '',
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Active User Account
  const activeAccount = useMemo(
    () =>
      workspace.accounts.find((a) => a.id === workspace.activeAccountId) ||
      workspace.accounts[0],
    [workspace.accounts, workspace.activeAccountId]
  );

  // Persist workspace changes safely to localStorage
  useEffect(() => {
    const res = saveWorkspaceState(workspace);
    if (!res.ok && res.error) {
      setStorageWarning(res.error);
    }
  }, [workspace]);

  // Test Firestore connection on boot and listen for Firebase Auth state changes
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await syncUserProfile(firebaseUser);
          setWorkspace((prev) => {
            const exists = prev.accounts.some((a) => a.id === profile.id);
            return {
              ...prev,
              accounts: exists
                ? prev.accounts.map((a) => (a.id === profile.id ? profile : a))
                : [profile, ...prev.accounts],
              activeAccountId: profile.id,
            };
          });
          setIsAuthenticated(true);
        } catch (e) {
          console.error('[Firebase Auth Sync Error]:', e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of complaints from Firestore
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribeToComplaints(
      (remoteComplaints) => {
        if (remoteComplaints && remoteComplaints.length > 0) {
          setWorkspace((prev) => {
            const remoteMap = new Map(remoteComplaints.map((c) => [c.id, c]));
            const merged = prev.complaints.map((c) => remoteMap.get(c.id) || c);
            const existingIds = new Set(prev.complaints.map((c) => c.id));
            const newRecords = remoteComplaints.filter((c) => !existingIds.has(c.id));
            return {
              ...prev,
              complaints: [...newRecords, ...merged],
            };
          });
        }
      },
      (err) => {
        console.warn('[Firestore Sync Notice]:', err.message);
      }
    );
    return () => unsub();
  }, [isAuthenticated]);

  // Deterministically calculate Priority Scores for all opportunities (including staff overrides)
  const scoredOpportunities = useMemo(
    () =>
      scoreOpportunities(
        workspace.opportunities,
        workspace.feedback,
        workspace.weights
      ),
    [workspace.opportunities, workspace.feedback, workspace.weights]
  );

  const unanalyzedCount = useMemo(() => {
    const analyzedSet = new Set(workspace.analyzedFeedbackIds);
    return workspace.feedback.filter((f) => !analyzedSet.has(f.id)).length;
  }, [workspace.feedback, workspace.analyzedFeedbackIds]);

  const activeInterventionCount = useMemo(
    () =>
      workspace.interventions.filter(
        (i) => i.status === 'Planned' || i.status === 'In Progress' || i.status === 'Completed'
      ).length,
    [workspace.interventions]
  );

  // Sidebar Badge Counts
  const myComplaintsCount = useMemo(
    () =>
      workspace.complaints.filter((c) => c.reporterAccountId === activeAccount.id).length,
    [workspace.complaints, activeAccount.id]
  );

  const deptQueueCount = useMemo(
    () =>
      workspace.complaints.filter(
        (c) =>
          c.status !== 'closed' &&
          c.status !== 'cancelled' &&
          c.status !== 'rejected' &&
          (!activeAccount.departmentId || c.assignedDepartmentId === activeAccount.departmentId)
      ).length,
    [workspace.complaints, activeAccount.departmentId]
  );

  const workerTaskCount = useMemo(() => {
    const targetWorkerId = activeAccount.workerProfileId || workspace.workers[0]?.id;
    return workspace.complaints.filter(
      (c) =>
        c.assignedWorkerId === targetWorkerId &&
        c.status !== 'closed' &&
        c.status !== 'cancelled' &&
        c.status !== 'rejected'
    ).length;
  }, [workspace.complaints, workspace.workers, activeAccount.workerProfileId]);

  const openVacanciesCount = useMemo(
    () => workspace.vacancies.filter((v) => v.status === 'open').length,
    [workspace.vacancies]
  );

  const pushNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const entry: AppNotification = {
        ...notif,
        id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setWorkspace((prev) => ({
        ...prev,
        notifications: [entry, ...prev.notifications].slice(0, 25),
      }));
    },
    []
  );

  const handleMarkNotificationRead = useCallback((notificationId: string) => {
    setWorkspace((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));
  }, []);

  // Switch Active Role / Demo Account
  const handleSwitchAccount = useCallback((accountId: string) => {
    setWorkspace((prev) => {
      if (!prev.accounts.some((a) => a.id === accountId)) return prev;
      return { ...prev, activeAccountId: accountId };
    });
  }, []);

  const handleSelectAccountFromPortal = useCallback(
    (accountId: string, navigateView?: WorkspaceViewId) => {
      handleSwitchAccount(accountId);
      if (navigateView) {
        setActiveView(navigateView);
      }
    },
    [handleSwitchAccount]
  );

  const handleUpdateAccountProfile = useCallback(
    (name: string, email: string, phone: string) => {
      setWorkspace((prev) => ({
        ...prev,
        accounts: prev.accounts.map((acc) =>
          acc.id === prev.activeAccountId
            ? { ...acc, name, email, phone: phone || undefined }
            : acc
        ),
      }));
    },
    []
  );

  const handleAuthenticated = useCallback(
    (account: UserAccount, targetView?: WorkspaceViewId) => {
      // Ensure account is in state
      setWorkspace((prev) => {
        const exists = prev.accounts.some((a) => a.id === account.id);
        const nextAccounts = exists ? prev.accounts : [account, ...prev.accounts];
        return {
          ...prev,
          accounts: nextAccounts,
          activeAccountId: account.id,
        };
      });
      if (targetView) {
        setActiveView(targetView);
      }
      setIsAuthenticated(true);
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    await FirebaseAuthAdapter.logout();
    await LocalDemoAuthAdapter.logout();
    setIsAuthenticated(false);
    setActiveView('overview');
  }, []);

  const handleQuickSaveWorkspace = useCallback(() => {
    const res = saveWorkspaceState(workspace);
    if (res.ok) {
      setSuccessBanner('Workspace successfully saved to browser storage.');
    } else if (res.error) {
      setStorageWarning(res.error);
    }
  }, [workspace]);

  // Global Keyboard Shortcut Manager
  useKeyboardShortcuts({
    enabled: isAuthenticated,
    onSelectView: setActiveView,
    onOpenShortcutsModal: () => setIsShortcutsModalOpen(true),
    onCloseAnyModal: () => {
      setIsShortcutsModalOpen(false);
      setIsDemoLoginOpen(false);
      setIsMobileMenuOpen(false);
    },
    onQuickSave: handleQuickSaveWorkspace,
    onFocusSearch: () => {
      const el = document.querySelector<HTMLInputElement>('[data-global-search]');
      el?.focus();
    },
  });

  // Run Real Gemini Feedback Analysis
  const handleRunAnalysis = useCallback(async () => {
    if (isAnalyzingRef.current) return;

    if (workspace.feedback.length === 0) {
      setAnalysisError(
        'Your Feedback Inbox is empty. Add feedback entries, submit a problem report, or load sample data before analyzing.'
      );
      return;
    }

    isAnalyzingRef.current = true;
    setAnalysisError(null);
    setSuccessBanner(null);
    setAnalysisProgress({
      isAnalyzing: true,
      currentBatch: 1,
      totalBatches: Math.max(1, Math.ceil(Math.min(workspace.feedback.length, 180) / 45)),
      stageMessage: `Preparing ${workspace.feedback.length} feedback entries for Gemini AI analysis...`,
    });

    try {
      const result = await runLiveGeminiAnalysis(
        workspace.feedback,
        workspace.workspaceName,
        (prog) => setAnalysisProgress(prog),
        lang
      );

      const logId = `LOG-${Date.now().toString().slice(-6)}`;

      setWorkspace((prev): WorkspaceState => ({
        ...prev,
        opportunities: result.opportunities,
        interventions: [
          ...prev.interventions.filter((i) => !i.isAiGenerated),
          ...result.interventions,
        ],
        impactTrackers: prev.impactTrackers.filter((t) => !t.isDemoIllustration),
        analyzedFeedbackIds: result.analyzedFeedbackIds,
        lastAnalyzedAt: result.analyzedAt,
        currentAnalysisOrigin: 'live_ai',
        analysisLogs: [
          {
            id: logId,
            timestamp: result.analyzedAt,
            origin: 'live_ai' as const,
            model: result.model,
            feedbackCount: result.analyzedFeedbackIds.length,
            clusterCount: result.opportunities.length,
            summaryNarrative: result.summaryNarrative,
          },
          ...prev.analysisLogs,
        ].slice(0, 15),
        notifications: prev.notificationPrefs.inAppAiSummaries
          ? [
              {
                id: `NOTIF-${Date.now()}`,
                timestamp: result.analyzedAt,
                title: 'Live Gemini Analysis Complete',
                message: `Identified ${result.opportunities.length} verified opportunity clusters across ${result.analyzedFeedbackIds.length} feedback items.`,
                type: 'success' as const,
                read: false,
                targetView: 'opportunities' as const,
              },
              ...prev.notifications,
            ].slice(0, 25)
          : prev.notifications,
      }));

      if (result.opportunities.length > 0) {
        setSelectedOpportunityId(result.opportunities[0].id);
      }

      if (!workspace.notificationPrefs.quietHoursEnabled) {
        setSuccessBanner(
          result.truncatedWarning
            ? `Live Gemini analysis succeeded (${result.opportunities.length} clusters). Note: ${result.truncatedWarning}`
            : `Live Gemini AI analysis completed: ${result.opportunities.length} evidence-verified opportunity clusters ranked.`
        );
      }

      if (activeView === 'inbox') {
        setActiveView('opportunities');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during AI analysis.';
      setAnalysisError(msg);
      pushNotification({
        title: 'AI Analysis Failed',
        message: msg,
        type: 'error',
        targetView: 'inbox',
      });
    } finally {
      isAnalyzingRef.current = false;
      setAnalysisProgress({
        isAnalyzing: false,
        currentBatch: 0,
        totalBatches: 0,
        stageMessage: '',
      });
    }
  }, [
    workspace.feedback,
    workspace.workspaceName,
    workspace.notificationPrefs,
    activeView,
    lang,
    pushNotification,
  ]);

  // Local Offline Deterministic Demo Analysis (Honest Fallback)
  const handleRunDemoLocalAnalysis = useCallback(async () => {
    if (isAnalyzingRef.current) return;

    if (workspace.feedback.length === 0) {
      setAnalysisError(
        'Your Feedback Inbox is empty. Add feedback entries, submit a problem report, or load sample data before analyzing.'
      );
      return;
    }

    isAnalyzingRef.current = true;
    setAnalysisError(null);
    setSuccessBanner(null);
    setAnalysisProgress({
      isAnalyzing: true,
      currentBatch: 1,
      totalBatches: 1,
      stageMessage: 'Clustering user feedback using deterministic offline heuristic engine...',
    });

    try {
      const result = await runDemoLocalAnalysis(
        workspace.feedback,
        workspace.workspaceName,
        (prog) => setAnalysisProgress(prog)
      );

      const logId = `LOG-${Date.now().toString().slice(-6)}`;

      setWorkspace((prev): WorkspaceState => ({
        ...prev,
        opportunities: result.opportunities,
        interventions: [
          ...prev.interventions.filter((i) => !i.isAiGenerated),
          ...result.interventions,
        ],
        impactTrackers: prev.impactTrackers.filter((t) => !t.isDemoIllustration),
        analyzedFeedbackIds: result.analyzedFeedbackIds,
        lastAnalyzedAt: result.analyzedAt,
        currentAnalysisOrigin: 'sample_demo',
        analysisLogs: [
          {
            id: logId,
            timestamp: result.analyzedAt,
            origin: 'sample_demo' as const,
            model: result.model,
            feedbackCount: result.analyzedFeedbackIds.length,
            clusterCount: result.opportunities.length,
            summaryNarrative: result.summaryNarrative,
          },
          ...prev.analysisLogs,
        ].slice(0, 15),
        notifications: prev.notificationPrefs.inAppAiSummaries
          ? [
              {
                id: `NOTIF-${Date.now()}`,
                timestamp: result.analyzedAt,
                title: 'Local Demo Analysis Complete',
                message: `Clustered ${result.analyzedFeedbackIds.length} feedback items into ${result.opportunities.length} opportunities offline without API key.`,
                type: 'info' as const,
                read: false,
                targetView: 'opportunities' as const,
              },
              ...prev.notifications,
            ].slice(0, 25)
          : prev.notifications,
      }));

      if (result.opportunities.length > 0) {
        setSelectedOpportunityId(result.opportunities[0].id);
      }

      setSuccessBanner(
        `Local demo analysis completed: Clustered ${result.opportunities.length} opportunities from real user feedback (no API key required).`
      );

      if (activeView === 'inbox') {
        setActiveView('opportunities');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during local demo analysis.';
      setAnalysisError(msg);
    } finally {
      isAnalyzingRef.current = false;
      setAnalysisProgress({
        isAnalyzing: false,
        currentBatch: 0,
        totalBatches: 0,
        stageMessage: '',
      });
    }
  }, [
    workspace.feedback,
    workspace.workspaceName,
    workspace.notificationPrefs,
    activeView,
  ]);

  // Fallback / Demo Exploration Handler (Honest Sample Labeling)
  const handleLoadSampleResults = useCallback(() => {
    setAnalysisError(null);
    const demoState = createInitialDemoWorkspaceState();
    const sample = buildDemoSampleAnalysis();
    const enrichedOpps = enrichDemoOpportunitiesWithLocations(sample.opportunities);

    setWorkspace((prev) => {
      const hasDemoFeedback = prev.feedback.some((f) => f.id === 'FB-001');
      if (hasDemoFeedback) {
        return {
          ...prev,
          opportunities: enrichedOpps,
          interventions: sample.interventions,
          impactTrackers: sample.impactTrackers,
          currentAnalysisOrigin: 'sample_demo',
          lastAnalyzedAt: new Date().toISOString(),
        };
      }
      return demoState;
    });

    setSelectedOpportunityId('OPP-01');
    setSuccessBanner(
      'Loaded clearly labeled Illustrative Sample Analysis Results (Demo Dataset).'
    );
    setActiveView('opportunities');
  }, []);

  // ============================================================================
  // CITIZEN COMPLAINT & SERVICE REQUEST HANDLERS
  // ============================================================================

  const handleSubmitComplaint = useCallback(
    (params: {
      complaint: Omit<ComplaintRecord, 'id' | 'createdAt' | 'updatedAt' | 'timeline'>;
      alsoAddToFeedbackInbox: boolean;
    }): { ok: boolean; createdId?: string; error?: string } => {
      const { complaint: draft, alsoAddToFeedbackInbox } = params;
      if (!draft.title.trim() || !draft.description.trim()) {
        return { ok: false, error: 'Title and description are required.' };
      }

      const nowIso = new Date().toISOString();
      const seqNum = 1000 + workspace.complaints.length + 1 + Math.floor(Math.random() * 80);
      const createdId = `CMP-2026-${seqNum}`;
      const linkedFeedbackId = alsoAddToFeedbackInbox ? `FB-CMP-${seqNum}` : undefined;

      // Check worker availability in the routed department so unassigned reason is honest
      const tempRecord: ComplaintRecord = {
        ...draft,
        id: createdId,
        createdAt: nowIso,
        updatedAt: nowIso,
        linkedFeedbackId,
        timeline: [],
      };
      const workerRecs = recommendWorkersForComplaint({
        complaint: tempRecord,
        workers: workspace.workers,
        allComplaints: workspace.complaints,
      });
      const unassignedReason = !workerRecs.bestMatch
        ? workerRecs.noMatchExplanation ||
          'No available field workers currently match this department/skill - queued for Department Admin dispatch.'
        : 'Queued in Department Portal awaiting dispatcher assignment.';

      const newComplaint: ComplaintRecord = {
        ...tempRecord,
        unassignedReason,
        timeline: [
          {
            id: `TL-${Date.now()}`,
            timestamp: nowIso,
            status: 'submitted',
            actorId: activeAccount.id,
            actorName: draft.isAnonymous ? 'Anonymous Citizen' : activeAccount.name,
            actorRole: activeAccount.role,
            note: `Complaint submitted and routed to department (${draft.routingExplanation})`,
            isPublic: true,
            attachmentIds: draft.attachments.map((a) => a.id),
          },
        ],
      };

      const newFeedbackItem: FeedbackItem | null = alsoAddToFeedbackInbox
        ? {
            id: linkedFeedbackId!,
            text: `${draft.title}: ${draft.description}`,
            category: tCategory(draft.category),
            date: nowIso.slice(0, 10),
            source: 'Citizen Portal',
            reportedImpact:
              draft.urgency === 'Critical' || draft.urgency === 'High'
                ? 'High'
                : draft.urgency === 'Medium'
                ? 'Medium'
                : 'Low',
            isDemo: false,
            createdAt: nowIso,
            linkedComplaintId: createdId,
            coordinates:
              draft.location.hasCoordinates &&
              typeof draft.location.lat === 'number' &&
              typeof draft.location.lng === 'number'
                ? {
                    lat: draft.location.lat,
                    lng: draft.location.lng,
                    locationLabel: draft.location.address,
                  }
                : undefined,
          }
        : null;

      const nextState: WorkspaceState = {
        ...workspace,
        complaints: [newComplaint, ...workspace.complaints],
        feedback: newFeedbackItem
          ? [newFeedbackItem, ...workspace.feedback]
          : workspace.feedback,
        notifications: workspace.notificationPrefs.inAppStatusUpdates
          ? [
              {
                id: `NOTIF-${Date.now()}`,
                timestamp: nowIso,
                title: `Complaint Logged (${createdId})`,
                message: `"${draft.title}" was saved and routed for review.`,
                type: 'success' as const,
                read: false,
                targetView: 'my_complaints' as const,
              },
              ...workspace.notifications,
            ].slice(0, 25)
          : workspace.notifications,
      };

      // Confirm local persistence BEFORE returning the reference ID
      const saveRes = saveWorkspaceState(nextState);
      if (!saveRes.ok) {
        return {
          ok: false,
          error:
            saveRes.error ||
            'Browser storage quota reached. Try removing large attachments and submitting again.',
        };
      }

      setWorkspace(nextState);
      setFocusedComplaintId(createdId);
      // Persist to Cloud Firestore for cross-session shared synchronization
      saveComplaintToFirestore(newComplaint).catch((err) => {
        console.warn('[Firestore saveComplaint notice]:', err.message);
      });
      return { ok: true, createdId };
    },
    [workspace, activeAccount, tCategory]
  );

  const handleAddFollowUp = useCallback(
    (params: {
      complaintId: string;
      note: string;
      attachments: ComplaintAttachment[];
    }): { ok: boolean; error?: string } => {
      const target = workspace.complaints.find((c) => c.id === params.complaintId);
      if (!target) {
        return { ok: false, error: 'Complaint record not found.' };
      }

      const isOwner = activeAccount.id === target.reporterAccountId;
      const isAuthorizedStaff =
        isStaffRole(activeAccount.role) ||
        (activeAccount.role === 'worker' &&
          activeAccount.workerProfileId === target.assignedWorkerId);

      if (!isOwner && !isAuthorizedStaff) {
        return {
          ok: false,
          error: 'Only the original reporter or assigned staff can add follow-up updates.',
        };
      }

      if (!params.note.trim() && params.attachments.length === 0) {
        return { ok: false, error: 'Provide a note or supporting attachment.' };
      }

      const nowIso = new Date().toISOString();
      const nextStatus: ComplaintStatus =
        target.status === 'more_info_required' && isOwner ? 'under_review' : target.status;

      setWorkspace((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) =>
          c.id === params.complaintId
            ? {
                ...c,
                status: nextStatus,
                updatedAt: nowIso,
                attachments: [...c.attachments, ...params.attachments],
                timeline: [
                  ...c.timeline,
                  {
                    id: `TL-${Date.now()}`,
                    timestamp: nowIso,
                    status: nextStatus,
                    actorId: activeAccount.id,
                    actorName:
                      c.isAnonymous && isOwner ? 'Anonymous Citizen' : activeAccount.name,
                    actorRole: activeAccount.role,
                    note: params.note.trim() || 'Added supporting attachment.',
                    isPublic: true,
                    attachmentIds: params.attachments.map((a) => a.id),
                  },
                ],
              }
            : c
        ),
      }));

      return { ok: true };
    },
    [workspace.complaints, activeAccount]
  );

  const handleCitizenStatusAction = useCallback(
    (params: {
      complaintId: string;
      nextStatus: 'cancelled' | 'closed' | 'reopened';
      note: string;
      rating?: 1 | 2 | 3 | 4 | 5;
    }): { ok: boolean; error?: string } => {
      const target = workspace.complaints.find((c) => c.id === params.complaintId);
      if (!target) return { ok: false, error: 'Complaint record not found.' };

      const auth = authorizeComplaintStatusChange({
        actor: activeAccount,
        complaint: target,
        nextStatus: params.nextStatus,
        note: params.note,
      });

      if (!auth.allowed) {
        return { ok: false, error: auth.reason };
      }

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) => {
          if (c.id !== params.complaintId) return c;
          const satisfaction =
            params.nextStatus === 'closed'
              ? {
                  isSatisfied: true,
                  rating: params.rating || (5 as const),
                  comment: params.note.trim() || 'Confirmed resolved.',
                  submittedAt: nowIso,
                }
              : params.nextStatus === 'reopened'
              ? {
                  isSatisfied: false,
                  rating: params.rating || (2 as const),
                  comment: params.note.trim(),
                  submittedAt: nowIso,
                }
              : c.satisfaction;

          return {
            ...c,
            status: params.nextStatus,
            satisfaction,
            updatedAt: nowIso,
            timeline: [
              ...c.timeline,
              {
                id: `TL-${Date.now()}`,
                timestamp: nowIso,
                status: params.nextStatus,
                actorId: activeAccount.id,
                actorName: c.isAnonymous ? 'Anonymous Citizen' : activeAccount.name,
                actorRole: activeAccount.role,
                note:
                  params.note.trim() ||
                  (params.nextStatus === 'closed'
                    ? 'Reporter confirmed issue resolution and closed complaint.'
                    : 'Status updated by reporter.'),
                isPublic: true,
              },
            ],
          };
        }),
      }));

      return { ok: true };
    },
    [workspace.complaints, activeAccount]
  );

  // ============================================================================
  // DEPARTMENT ADMIN & FIELD WORKER PORTAL HANDLERS
  // ============================================================================

  const handleAssignWorker = useCallback(
    (params: {
      complaintId: string;
      workerId: string;
      rationale: string;
    }): { ok: boolean; error?: string } => {
      const auth = authorizeDepartmentManagement(activeAccount);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const worker = workspace.workers.find((w) => w.id === params.workerId);
      if (!worker) return { ok: false, error: 'Selected worker profile not found.' };
      if (worker.availability === 'off_duty') {
        return {
          ok: false,
          error: `${worker.name} is currently Off Duty and cannot accept new dispatches.`,
        };
      }

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) => {
          if (c.id !== params.complaintId) return c;
          const nextStatus: ComplaintStatus =
            c.status === 'submitted' || c.status === 'under_review' || c.status === 'reopened'
              ? 'assigned'
              : c.status;
          return {
            ...c,
            assignedWorkerId: worker.id,
            assignmentRationale:
              params.rationale.trim() || `Assigned to ${worker.name} (${worker.roleTitle}).`,
            unassignedReason: undefined,
            status: nextStatus,
            updatedAt: nowIso,
            timeline: [
              ...c.timeline,
              {
                id: `TL-${Date.now()}`,
                timestamp: nowIso,
                status: nextStatus,
                actorId: activeAccount.id,
                actorName: activeAccount.name,
                actorRole: activeAccount.role,
                note: `Assigned to field worker ${worker.name}. ${params.rationale.trim()}`,
                isPublic: true,
              },
            ],
          };
        }),
      }));

      if (workspace.notificationPrefs.inAppAssignments) {
        pushNotification({
          title: 'Worker Dispatched',
          message: `Assigned ${worker.name} to complaint ${params.complaintId}.`,
          type: 'info',
          targetView: 'worker_portal',
        });
      }

      return { ok: true };
    },
    [activeAccount, workspace.workers, workspace.notificationPrefs, pushNotification]
  );

  const handleReassignDepartment = useCallback(
    (params: {
      complaintId: string;
      departmentId: string;
      rationale: string;
    }): { ok: boolean; error?: string } => {
      const auth = authorizeDepartmentManagement(activeAccount);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const dept = workspace.departments.find((d) => d.id === params.departmentId);
      if (!dept) return { ok: false, error: 'Target department not found.' };

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) =>
          c.id === params.complaintId
            ? {
                ...c,
                assignedDepartmentId: dept.id,
                assignedWorkerId: undefined,
                unassignedReason: `Transferred to ${dept.name} : awaiting worker dispatch.`,
                routingExplanation: `Reassigned to ${dept.name}: ${
                  params.rationale.trim() || 'Administrative transfer'
                }`,
                status: 'under_review',
                updatedAt: nowIso,
                timeline: [
                  ...c.timeline,
                  {
                    id: `TL-${Date.now()}`,
                    timestamp: nowIso,
                    status: 'under_review',
                    actorId: activeAccount.id,
                    actorName: activeAccount.name,
                    actorRole: activeAccount.role,
                    note: `Transferred complaint to ${dept.name}. ${params.rationale.trim()}`,
                    isPublic: true,
                  },
                ],
              }
            : c
        ),
      }));

      return { ok: true };
    },
    [activeAccount, workspace.departments]
  );

  const handleAdminStatusUpdate = useCallback(
    (params: {
      complaintId: string;
      nextStatus: ComplaintStatus;
      note: string;
      expectedResolutionDate?: string;
    }): { ok: boolean; error?: string } => {
      const target = workspace.complaints.find((c) => c.id === params.complaintId);
      if (!target) return { ok: false, error: 'Complaint record not found.' };

      const auth = authorizeComplaintStatusChange({
        actor: activeAccount,
        complaint: target,
        nextStatus: params.nextStatus,
        note: params.note,
      });
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) =>
          c.id === params.complaintId
            ? {
                ...c,
                status: params.nextStatus,
                expectedResolutionDate:
                  params.expectedResolutionDate || c.expectedResolutionDate,
                resolutionNotes:
                  params.nextStatus === 'resolved_awaiting_confirmation'
                    ? params.note.trim() || c.resolutionNotes
                    : c.resolutionNotes,
                updatedAt: nowIso,
                timeline: [
                  ...c.timeline,
                  {
                    id: `TL-${Date.now()}`,
                    timestamp: nowIso,
                    status: params.nextStatus,
                    actorId: activeAccount.id,
                    actorName: activeAccount.name,
                    actorRole: activeAccount.role,
                    note:
                      params.note.trim() ||
                      `Administrative status update to ${params.nextStatus}.`,
                    isPublic: true,
                  },
                ],
              }
            : c
        ),
      }));

      return { ok: true };
    },
    [workspace.complaints, activeAccount]
  );

  const handleOverrideComplaintPriority = useCallback(
    (params: {
      complaintId: string;
      tier: PriorityTier;
      reason: string;
    }): { ok: boolean; error?: string } => {
      const auth = authorizePriorityOverride(activeAccount, params.reason);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        complaints: prev.complaints.map((c) =>
          c.id === params.complaintId
            ? {
                ...c,
                priorityOverride: {
                  tier: params.tier,
                  reason: params.reason.trim(),
                  overriddenBy: activeAccount.name,
                  overriddenRole: activeAccount.role,
                  overriddenAt: nowIso,
                },
                updatedAt: nowIso,
                timeline: [
                  ...c.timeline,
                  {
                    id: `TL-${Date.now()}`,
                    timestamp: nowIso,
                    status: c.status,
                    actorId: activeAccount.id,
                    actorName: activeAccount.name,
                    actorRole: activeAccount.role,
                    note: `Priority overridden to ${params.tier} Priority: ${params.reason.trim()}`,
                    isPublic: true,
                  },
                ],
              }
            : c
        ),
      }));

      return { ok: true };
    },
    [activeAccount]
  );

  const handleOverrideOpportunityPriority = useCallback(
    (params: {
      opportunityId: string;
      tier: PriorityTier;
      reason: string;
    }): { ok: boolean; error?: string } => {
      const auth = authorizePriorityOverride(activeAccount, params.reason);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        opportunities: prev.opportunities.map((opp) =>
          opp.id === params.opportunityId
            ? {
                ...opp,
                priorityOverride: {
                  tier: params.tier,
                  reason: params.reason.trim(),
                  overriddenBy: activeAccount.name,
                  overriddenRole: activeAccount.role,
                  overriddenAt: nowIso,
                },
                updatedAt: nowIso,
              }
            : opp
        ),
      }));

      return { ok: true };
    },
    [activeAccount]
  );

  const handleUpdateWorkerAvailability = useCallback(
    (workerId: string, availability: 'available' | 'busy' | 'off_duty') => {
      const canModify =
        isStaffRole(activeAccount.role) ||
        (activeAccount.role === 'worker' && activeAccount.workerProfileId === workerId);
      if (!canModify) return;

      setWorkspace((prev) => ({
        ...prev,
        workers: prev.workers.map((w) =>
          w.id === workerId ? { ...w, availability } : w
        ),
      }));
    },
    [activeAccount]
  );

  const handleWorkerTaskUpdate = useCallback(
    (params: {
      complaintId: string;
      nextStatus:
        | 'accepted'
        | 'in_progress'
        | 'more_info_required'
        | 'resolved_awaiting_confirmation';
      note: string;
      attachments: ComplaintAttachment[];
    }): { ok: boolean; error?: string } => {
      const target = workspace.complaints.find((c) => c.id === params.complaintId);
      if (!target) return { ok: false, error: 'Task not found.' };

      const auth = authorizeComplaintStatusChange({
        actor: activeAccount,
        complaint: target,
        nextStatus: params.nextStatus,
        note: params.note,
      });
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        workers:
          params.nextStatus === 'resolved_awaiting_confirmation' && target.assignedWorkerId
            ? prev.workers.map((w) =>
                w.id === target.assignedWorkerId
                  ? { ...w, completedTasksCount: w.completedTasksCount + 1 }
                  : w
              )
            : prev.workers,
        complaints: prev.complaints.map((c) =>
          c.id === params.complaintId
            ? {
                ...c,
                status: params.nextStatus,
                resolutionNotes:
                  params.nextStatus === 'resolved_awaiting_confirmation'
                    ? params.note.trim()
                    : c.resolutionNotes,
                attachments: [...c.attachments, ...params.attachments],
                updatedAt: nowIso,
                timeline: [
                  ...c.timeline,
                  {
                    id: `TL-${Date.now()}`,
                    timestamp: nowIso,
                    status: params.nextStatus,
                    actorId: activeAccount.id,
                    actorName: activeAccount.name,
                    actorRole: activeAccount.role,
                    note: params.note.trim() || `Field status updated to ${params.nextStatus}.`,
                    isPublic: true,
                    attachmentIds: params.attachments.map((a) => a.id),
                  },
                ],
              }
            : c
        ),
      }));

      return { ok: true };
    },
    [workspace.complaints, activeAccount]
  );

  // ============================================================================
  // JOBS & VACANCY PORTAL HANDLERS
  // ============================================================================

  const handleSubmitJobApplication = useCallback(
    (
      appDraft: Omit<JobApplication, 'id' | 'submittedAt' | 'updatedAt' | 'status'>
    ): { ok: boolean; error?: string } => {
      if (!appDraft.applicantName.trim() || !appDraft.applicantEmail.trim()) {
        return { ok: false, error: 'Applicant name and email are required.' };
      }

      // Prevent duplicate submissions for the same opening by the same applicant
      const isDuplicate = workspace.jobApplications.some(
        (a) =>
          a.vacancyId === appDraft.vacancyId &&
          (a.applicantAccountId === appDraft.applicantAccountId ||
            a.applicantEmail.toLowerCase() === appDraft.applicantEmail.toLowerCase()) &&
          a.status !== 'not_selected'
      );
      if (isDuplicate) {
        return {
          ok: false,
          error: 'You already have an active application submitted for this position.',
        };
      }

      const nowIso = new Date().toISOString();
      const created: JobApplication = {
        ...appDraft,
        id: `APP-2026-${Date.now().toString().slice(-4)}`,
        status: 'submitted',
        submittedAt: nowIso,
        updatedAt: nowIso,
        isDemo: false,
      };

      setWorkspace((prev) => ({
        ...prev,
        jobApplications: [created, ...prev.jobApplications],
      }));

      // Persist application to Cloud Firestore
      saveJobApplicationToFirestore(created).catch((err) => {
        console.warn('[Firestore saveJobApplication notice]:', err.message);
      });

      pushNotification({
        title: 'Job Application Submitted',
        message: `Application ${created.id} saved for review.`,
        type: 'success',
        targetView: 'jobs_portal',
      });

      return { ok: true };
    },
    [pushNotification]
  );

  const handleCreateVacancy = useCallback(
    (
      vacancyDraft: Omit<JobVacancy, 'id' | 'createdAt' | 'origin'>
    ): { ok: boolean; error?: string } => {
      const auth = authorizeDepartmentManagement(activeAccount);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      if (!vacancyDraft.title.trim()) {
        return { ok: false, error: 'Role title is required.' };
      }

      const created: JobVacancy = {
        ...vacancyDraft,
        id: `JOB-ADM-${Date.now().toString().slice(-4)}`,
        origin: 'admin_managed',
        createdAt: new Date().toISOString(),
      };

      setWorkspace((prev) => ({
        ...prev,
        vacancies: [created, ...prev.vacancies],
      }));

      return { ok: true };
    },
    [activeAccount]
  );

  const handleUpdateApplicationStatus = useCallback(
    (
      appId: string,
      status: JobApplication['status'],
      reviewerNote?: string
    ): { ok: boolean; error?: string } => {
      const auth = authorizeDepartmentManagement(activeAccount);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      const nowIso = new Date().toISOString();
      setWorkspace((prev) => ({
        ...prev,
        jobApplications: prev.jobApplications.map((a) =>
          a.id === appId
            ? { ...a, status, reviewerNote: reviewerNote ?? a.reviewerNote, updatedAt: nowIso }
            : a
        ),
      }));

      return { ok: true };
    },
    [activeAccount]
  );

  // ============================================================================
  // FEEDBACK, INTERVENTIONS, IMPACT & SETTINGS HANDLERS
  // ============================================================================

  const handleAddFeedbackItems = useCallback(
    (newItems: FeedbackItem[], sourceDesc: string) => {
      setWorkspace((prev) => ({
        ...prev,
        feedback: [...newItems, ...prev.feedback],
      }));
      pushNotification({
        title: 'Feedback Added',
        message: `Added ${newItems.length} ${
          newItems.length === 1 ? 'entry' : 'entries'
        } from ${sourceDesc}.`,
        type: 'info',
        targetView: 'inbox',
      });
    },
    [pushNotification]
  );

  const handleUpdateFeedbackItem = useCallback((updated: FeedbackItem) => {
    setWorkspace((prev) => ({
      ...prev,
      feedback: prev.feedback.map((f) => (f.id === updated.id ? updated : f)),
      analyzedFeedbackIds: prev.analyzedFeedbackIds.filter((id) => id !== updated.id),
    }));
  }, []);

  const handleDeleteFeedbackItems = useCallback((idsToDelete: string[]) => {
    const delSet = new Set(idsToDelete);
    setWorkspace((prev) => ({
      ...prev,
      feedback: prev.feedback.filter((f) => !delSet.has(f.id)),
      analyzedFeedbackIds: prev.analyzedFeedbackIds.filter((id) => !delSet.has(id)),
      opportunities: prev.opportunities.map((opp) => ({
        ...opp,
        relatedFeedbackIds: opp.relatedFeedbackIds.filter((id) => !delSet.has(id)),
        contradictoryFeedbackIds: opp.contradictoryFeedbackIds.filter(
          (id) => !delSet.has(id)
        ),
        evidenceExcerpts: opp.evidenceExcerpts.filter(
          (ex) => !delSet.has(ex.feedbackId)
        ),
      })),
    }));
  }, []);

  const handleResetToDemoWorkspace = useCallback(() => {
    const freshDemo = createInitialDemoWorkspaceState();
    setWorkspace(freshDemo);
    setSelectedOpportunityId(freshDemo.opportunities[0]?.id || null);
    setFocusedComplaintId(freshDemo.complaints[0]?.id || null);
    setAnalysisError(null);
    setSuccessBanner(
      'Workspace reset to the Northbridge Campus sample complaints, 36 feedback items, and demo roles.'
    );
  }, []);

  const handleClearWorkspace = useCallback(() => {
    const empty = createEmptyWorkspaceState(workspace.workspaceName);
    setWorkspace(empty);
    setSelectedOpportunityId(null);
    setFocusedComplaintId(null);
    setAnalysisError(null);
    setSuccessBanner('Cleared all complaints, feedback, clusters, interventions, and trackers.');
  }, [workspace.workspaceName]);

  const handleUpdateWeights = useCallback((nextWeights: PriorityWeights) => {
    setWorkspace((prev) => ({
      ...prev,
      weights: nextWeights,
    }));
  }, []);

  const handleUpdateWorkspaceMeta = useCallback((name: string, context: string) => {
    setWorkspace((prev) => ({
      ...prev,
      workspaceName: name,
      workspaceContext: context,
    }));
  }, []);

  const handleUpdateNotificationPrefs = useCallback((prefs: NotificationPreferences) => {
    setWorkspace((prev) => ({ ...prev, notificationPrefs: prefs }));
  }, []);

  const handleUpdateComplaintPrefs = useCallback((prefs: ComplaintPreferences) => {
    setWorkspace((prev) => ({ ...prev, complaintPrefs: prefs }));
  }, []);

  const handleUpdateRoutingRule = useCallback(
    (
      category: ComplaintCategory,
      departmentId: string,
      slaDays: number
    ): { ok: boolean; error?: string } => {
      const auth = authorizeDepartmentManagement(activeAccount);
      if (!auth.allowed) return { ok: false, error: auth.reason };

      setWorkspace((prev) => ({
        ...prev,
        routingRules: prev.routingRules.map((r) =>
          r.category === category ? { ...r, departmentId, slaDays } : r
        ),
      }));
      return { ok: true };
    },
    [activeAccount]
  );

  const handleUpdateIntervention = useCallback((updated: InterventionItem) => {
    setWorkspace((prev) => ({
      ...prev,
      interventions: prev.interventions.map((i) =>
        i.id === updated.id ? updated : i
      ),
    }));
  }, []);

  const handleAddIntervention = useCallback((created: InterventionItem) => {
    setWorkspace((prev) => ({
      ...prev,
      interventions: [created, ...prev.interventions],
    }));
  }, []);

  const handleUpdateInterventionStatus = useCallback(
    (interventionId: string, status: InterventionStatus) => {
      setWorkspace((prev) => ({
        ...prev,
        interventions: prev.interventions.map((i) =>
          i.id === interventionId
            ? { ...i, status, updatedAt: new Date().toISOString() }
            : i
        ),
      }));
    },
    []
  );

  const handleAddTracker = useCallback((tracker: ImpactMetricTracker) => {
    setWorkspace((prev) => ({
      ...prev,
      impactTrackers: [tracker, ...prev.impactTrackers],
    }));
  }, []);

  const handleUpdateTracker = useCallback((updated: ImpactMetricTracker) => {
    setWorkspace((prev) => ({
      ...prev,
      impactTrackers: prev.impactTrackers.map((t) =>
        t.id === updated.id ? updated : t
      ),
    }));
  }, []);

  const handleDeleteTracker = useCallback((id: string) => {
    setWorkspace((prev) => ({
      ...prev,
      impactTrackers: prev.impactTrackers.filter((t) => t.id !== id),
    }));
  }, []);

  // Cross-View Navigation Helpers
  const navigateToOpportunity = useCallback((opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    setActiveView('opportunities');
  }, []);

  const navigateToFeedback = useCallback((feedbackId: string) => {
    setHighlightedFeedbackId(feedbackId);
    setActiveView('inbox');
  }, []);

  const navigateToComplaint = useCallback((complaintId: string) => {
    setFocusedComplaintId(complaintId);
    setActiveView('my_complaints');
  }, []);

  const openEvidenceForOpportunity = useCallback((opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    setActiveView('evidence');
  }, []);

  const openInterventionsForOpportunity = useCallback((opportunityId: string) => {
    setSelectedOpportunityId(opportunityId);
    setActiveView('interventions');
  }, []);

  const openImpactTrackerFor = useCallback(
    (opportunityId: string, interventionId: string) => {
      setFocusedImpactIds({ opportunityId, interventionId });
      setActiveView('impact');
    },
    []
  );

  const openInboxWithMode = useCallback((mode: 'paste' | 'csv' | 'demo') => {
    setInboxIntakeMode(mode);
    setActiveView('inbox');
  }, []);

  // Display authentication landing page when signed out per civic security requirements
  if (!isAuthenticated) {
    return (
      <AuthScreen
        accounts={workspace.accounts}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Sticky Flex Left Navigation Sidebar : zero fixed-position header overlap */}
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        activeRole={activeAccount.role}
        myComplaintsCount={myComplaintsCount}
        totalComplaintsCount={workspace.complaints.length}
        deptQueueCount={deptQueueCount}
        workerTaskCount={workerTaskCount}
        openVacanciesCount={openVacanciesCount}
        feedbackCount={workspace.feedback.length}
        opportunityCount={scoredOpportunities.length}
        activeInterventionCount={activeInterventionCount}
        trackerCount={workspace.impactTrackers.length}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenDemoLogin={() => setIsDemoLoginOpen(true)}
      />

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          workspaceName={workspace.workspaceName}
          workspaceContext={workspace.workspaceContext}
          onUpdateWorkspaceMeta={handleUpdateWorkspaceMeta}
          onResetToDemoWorkspace={handleResetToDemoWorkspace}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          globalSearch={globalSearch}
          onChangeGlobalSearch={setGlobalSearch}
          feedback={workspace.feedback}
          opportunities={scoredOpportunities}
          complaints={workspace.complaints}
          onNavigateToOpportunity={navigateToOpportunity}
          onNavigateToFeedback={navigateToFeedback}
          onNavigateToComplaint={navigateToComplaint}
          onSelectView={setActiveView}
          notifications={workspace.notifications}
          onMarkNotificationRead={handleMarkNotificationRead}
          onMarkAllNotificationsRead={() =>
            setWorkspace((prev) => ({
              ...prev,
              notifications: prev.notifications.map((n) => ({ ...n, read: true })),
            }))
          }
          onClearNotifications={() =>
            setWorkspace((prev) => ({ ...prev, notifications: [] }))
          }
          onRunAnalysis={() => void handleRunAnalysis()}
          isAnalyzing={analysisProgress.isAnalyzing}
          accounts={workspace.accounts}
          activeAccount={activeAccount}
          onOpenDemoPortalModal={() => setIsDemoLoginOpen(true)}
          onOpenKeyboardShortcuts={() => setIsShortcutsModalOpen(true)}
          onSignOut={handleSignOut}
        />

        {/* Active Workspace Viewport */}
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {/* Storage Fallback Notice if localStorage is restricted */}
          {storageWarning && (
            <div className="no-print flex items-center justify-between rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
              <span>{storageWarning}</span>
              <button
                type="button"
                onClick={() => setStorageWarning(null)}
                className="ml-4 font-medium underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Contained Analysis Status / Error / Success Alert Card */}
          <AnalysisBanner
            progress={analysisProgress}
            analysisError={analysisError}
            onDismissError={() => setAnalysisError(null)}
            onRetryAnalysis={() => void handleRunAnalysis()}
            onRunDemoAnalysis={() => void handleRunDemoLocalAnalysis()}
            onLoadSampleResults={handleLoadSampleResults}
            analysisOrigin={workspace.currentAnalysisOrigin}
            totalFeedbackCount={workspace.feedback.length}
            unanalyzedCount={unanalyzedCount}
            successMessage={successBanner}
            onDismissSuccess={() => setSuccessBanner(null)}
          />

          {activeView === 'overview' && (
            <OverviewView
              currentUser={activeAccount}
              feedback={workspace.feedback}
              opportunities={scoredOpportunities}
              interventions={workspace.interventions}
              complaints={workspace.complaints}
              analysisLogs={workspace.analysisLogs}
              analysisOrigin={workspace.currentAnalysisOrigin}
              isAnalyzing={analysisProgress.isAnalyzing}
              onboardingDismissed={Boolean(workspace.onboardingDismissed)}
              onToggleOnboarding={(dismissed) =>
                setWorkspace((prev) => ({ ...prev, onboardingDismissed: dismissed }))
              }
              onRunAnalysis={() => void handleRunAnalysis()}
              onOpenInboxMode={openInboxWithMode}
              onNavigateToOpportunity={navigateToOpportunity}
              onNavigateToComplaint={navigateToComplaint}
              onSelectView={setActiveView}
            />
          )}

          {activeView === 'report_problem' && (
            <ReportProblemView
              activeAccount={activeAccount}
              departments={workspace.departments}
              routingRules={workspace.routingRules}
              complaintPrefs={workspace.complaintPrefs}
              onSubmitComplaint={handleSubmitComplaint}
              onOpenMyComplaints={(cId) => {
                if (cId) setFocusedComplaintId(cId);
                setActiveView('my_complaints');
              }}
            />
          )}

          {activeView === 'my_complaints' && (
            <MyComplaintsView
              activeAccount={activeAccount}
              complaints={workspace.complaints}
              departments={workspace.departments}
              workers={workspace.workers}
              focusedComplaintId={focusedComplaintId}
              onSelectComplaint={setFocusedComplaintId}
              onAddFollowUp={handleAddFollowUp}
              onCitizenStatusAction={handleCitizenStatusAction}
              onOpenReportProblem={() => setActiveView('report_problem')}
            />
          )}

          {activeView === 'central_registry' && (
            <CentralComplaintsPortalView
              activeAccount={activeAccount}
              complaints={workspace.complaints}
              departments={workspace.departments}
              workers={workspace.workers}
              onAssignWorker={handleAssignWorker}
              onReassignDepartment={handleReassignDepartment}
              onAdminStatusUpdate={handleAdminStatusUpdate}
              onOverrideComplaintPriority={handleOverrideComplaintPriority}
              onOpenReportProblem={() => setActiveView('report_problem')}
              onOpenDemoLogin={() => setIsDemoLoginOpen(true)}
            />
          )}

          {activeView === 'department_portal' && (
            <DepartmentPortalView
              activeAccount={activeAccount}
              accounts={workspace.accounts}
              onSwitchAccount={handleSwitchAccount}
              complaints={workspace.complaints}
              departments={workspace.departments}
              workers={workspace.workers}
              onAssignWorker={handleAssignWorker}
              onReassignDepartment={handleReassignDepartment}
              onAdminStatusUpdate={handleAdminStatusUpdate}
              onOverrideComplaintPriority={handleOverrideComplaintPriority}
            />
          )}

          {activeView === 'worker_portal' && (
            <WorkerPortalView
              activeAccount={activeAccount}
              accounts={workspace.accounts}
              onSwitchAccount={handleSwitchAccount}
              workers={workspace.workers}
              complaints={workspace.complaints}
              onUpdateWorkerAvailability={handleUpdateWorkerAvailability}
              onWorkerTaskUpdate={handleWorkerTaskUpdate}
            />
          )}

          {activeView === 'jobs_portal' && (
            <JobsPortalView
              activeAccount={activeAccount}
              departments={workspace.departments}
              vacancies={workspace.vacancies}
              applications={workspace.jobApplications}
              opportunities={scoredOpportunities}
              complaints={workspace.complaints}
              onSubmitJobApplication={handleSubmitJobApplication}
              onCreateVacancy={handleCreateVacancy}
              onUpdateApplicationStatus={handleUpdateApplicationStatus}
            />
          )}

          {activeView === 'inbox' && (
            <FeedbackInboxView
              feedback={workspace.feedback}
              analyzedFeedbackIds={workspace.analyzedFeedbackIds}
              opportunities={scoredOpportunities}
              initialIntakeMode={inboxIntakeMode}
              onClearInitialIntakeMode={() => setInboxIntakeMode(null)}
              highlightedFeedbackId={highlightedFeedbackId}
              onClearHighlightedFeedback={() => setHighlightedFeedbackId(null)}
              globalSearch={globalSearch}
              onAddFeedbackItems={handleAddFeedbackItems}
              onUpdateFeedbackItem={handleUpdateFeedbackItem}
              onDeleteFeedbackItems={handleDeleteFeedbackItems}
              onReloadDemoDataset={handleResetToDemoWorkspace}
              onRunAnalysis={() => void handleRunAnalysis()}
              isAnalyzing={analysisProgress.isAnalyzing}
              onNavigateToOpportunity={navigateToOpportunity}
            />
          )}

          {activeView === 'opportunities' && (
            <OpportunityMapView
              opportunities={scoredOpportunities}
              complaints={workspace.complaints}
              feedback={workspace.feedback}
              interventions={workspace.interventions}
              weights={workspace.weights}
              onUpdateWeights={handleUpdateWeights}
              selectedOpportunityId={selectedOpportunityId}
              onSelectOpportunity={setSelectedOpportunityId}
              onNavigateToComplaint={navigateToComplaint}
              globalSearch={globalSearch}
              onOpenEvidenceForOpportunity={openEvidenceForOpportunity}
              onOpenInterventionsForOpportunity={openInterventionsForOpportunity}
              onNavigateToFeedback={navigateToFeedback}
              onRunAnalysis={() => void handleRunAnalysis()}
              isAnalyzing={analysisProgress.isAnalyzing}
              activeAccount={activeAccount}
              onOverrideOpportunityPriority={handleOverrideOpportunityPriority}
            />
          )}

          {activeView === 'evidence' && (
            <EvidenceExplorerView
              opportunities={scoredOpportunities}
              feedback={workspace.feedback}
              selectedOpportunityId={selectedOpportunityId}
              onSelectOpportunity={setSelectedOpportunityId}
              onNavigateToFeedback={navigateToFeedback}
              onOpenInterventionsForOpportunity={openInterventionsForOpportunity}
              onRunAnalysis={() => void handleRunAnalysis()}
              isAnalyzing={analysisProgress.isAnalyzing}
            />
          )}

          {activeView === 'interventions' && (
            <InterventionPlannerView
              opportunities={scoredOpportunities}
              interventions={workspace.interventions}
              selectedOpportunityId={selectedOpportunityId}
              onSelectOpportunity={setSelectedOpportunityId}
              onUpdateIntervention={handleUpdateIntervention}
              onAddIntervention={handleAddIntervention}
              onOpenImpactTracker={openImpactTrackerFor}
            />
          )}

          {activeView === 'impact' && (
            <ImpactTrackerView
              opportunities={scoredOpportunities}
              interventions={workspace.interventions}
              trackers={workspace.impactTrackers}
              focusedOpportunityId={focusedImpactIds.opportunityId}
              focusedInterventionId={focusedImpactIds.interventionId}
              onAddTracker={handleAddTracker}
              onUpdateTracker={handleUpdateTracker}
              onDeleteTracker={handleDeleteTracker}
              onUpdateInterventionStatus={handleUpdateInterventionStatus}
            />
          )}

          {activeView === 'reports' && (
            <ReportsExportView
              workspaceName={workspace.workspaceName}
              workspaceContext={workspace.workspaceContext}
              analysisOrigin={workspace.currentAnalysisOrigin}
              lastAnalyzedAt={workspace.lastAnalyzedAt}
              weights={workspace.weights}
              feedback={workspace.feedback}
              analyzedFeedbackIds={workspace.analyzedFeedbackIds}
              opportunities={scoredOpportunities}
              interventions={workspace.interventions}
              impactTrackers={workspace.impactTrackers}
              analysisLogs={workspace.analysisLogs}
              complaints={workspace.complaints}
              departments={workspace.departments}
              activeAccount={activeAccount}
            />
          )}

          {activeView === 'settings' && (
            <SettingsHelpView
              workspace={workspace}
              activeAccount={activeAccount}
              onSwitchAccount={handleSwitchAccount}
              onUpdateAccountProfile={handleUpdateAccountProfile}
              onUpdateWorkspaceMeta={handleUpdateWorkspaceMeta}
              onUpdateNotificationPrefs={handleUpdateNotificationPrefs}
              onUpdateComplaintPrefs={handleUpdateComplaintPrefs}
              onUpdateRoutingRule={handleUpdateRoutingRule}
              weights={workspace.weights}
              onUpdateWeights={handleUpdateWeights}
              onResetToDemo={handleResetToDemoWorkspace}
              onClearAllData={handleClearWorkspace}
              onSelectView={setActiveView}
            />
          )}
        </main>
      </div>

      {/* 4-Portal Demo Login & Role Switcher Modal */}
      <DemoPortalLoginModal
        isOpen={isDemoLoginOpen}
        onClose={() => setIsDemoLoginOpen(false)}
        accounts={workspace.accounts}
        activeAccount={activeAccount}
        onSelectAccount={handleSelectAccountFromPortal}
        onResetDemoData={handleResetToDemoWorkspace}
      />

      {/* Persistent MakeMyTrip-inspired AI Assistant */}
      <AIAssistantWidget
        currentUser={activeAccount}
        complaints={workspace.complaints}
        departments={workspace.departments}
        vacancies={workspace.vacancies}
        onNavigateToView={(viewId, targetId) => {
          setActiveView(viewId);
          if (targetId) setFocusedComplaintId(targetId);
        }}
      />
    </div>
  );
}
