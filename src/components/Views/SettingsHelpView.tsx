import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Globe,
  HelpCircle,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Sliders,
  Sun,
  Trash2,
  UserCheck,
} from "../Common/Icons";
import { useI18n } from '../../i18n/I18nContext';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages';
import { isStaffRole } from '../../services/accessControl';
import { checkAiHealthStatus } from '../../services/analysisService';
import { useTheme } from '../../theme/ThemeContext';
import type {
  CategoryRoutingRule,
  ComplaintCategory,
  ComplaintPreferences,
  Department,
  LanguageCode,
  NotificationPreferences,
  PriorityWeights,
  UserAccount,
  WorkspaceState,
  WorkspaceViewId,
} from '../../types/needmap';
import { exportFullWorkspaceBackupJson } from '../../utils/exporters';
import {
  DEFAULT_PRIORITY_WEIGHTS,
  normalizeWeights,
  UNKNOWN_FACTOR_NEUTRAL_SCORE,
} from '../../utils/priorityEngine';
import { ConfirmDialog } from '../Common/ConfirmDialog';

interface SettingsHelpViewProps {
  workspace: WorkspaceState;
  activeAccount: UserAccount;
  onSwitchAccount: (accountId: string) => void;
  onUpdateAccountProfile: (name: string, email: string, phone: string) => void;
  onUpdateWorkspaceMeta: (name: string, context: string) => void;
  onUpdateNotificationPrefs: (prefs: NotificationPreferences) => void;
  onUpdateComplaintPrefs: (prefs: ComplaintPreferences) => void;
  onUpdateRoutingRule: (
    category: ComplaintCategory,
    departmentId: string,
    slaDays: number
  ) => { ok: boolean; error?: string };
  weights: PriorityWeights;
  onUpdateWeights: (weights: PriorityWeights) => void;
  onResetToDemo: () => void;
  onClearAllData: () => void;
  onSelectView: (view: WorkspaceViewId) => void;
}

export const SettingsHelpView: React.FC<SettingsHelpViewProps> = ({
  workspace,
  activeAccount,
  onSwitchAccount,
  onUpdateAccountProfile,
  onUpdateWorkspaceMeta,
  onUpdateNotificationPrefs,
  onUpdateComplaintPrefs,
  onUpdateRoutingRule,
  weights,
  onUpdateWeights,
  onResetToDemo,
  onClearAllData,
  onSelectView,
}) => {
  const { lang, setLang, tr, tRole, tCategory } = useI18n();
  const { themeMode, setThemeMode } = useTheme();
  const canEditRouting = isStaffRole(activeAccount.role);

  // Profile form state
  const [profileName, setProfileName] = useState(activeAccount.name);
  const [profileEmail, setProfileEmail] = useState(activeAccount.email);
  const [profilePhone, setProfilePhone] = useState(activeAccount.phone || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // Workspace meta form state
  const [nameDraft, setNameDraft] = useState(workspace.workspaceName);
  const [contextDraft, setContextDraft] = useState(workspace.workspaceContext);
  const [wsSavedNotice, setWsSavedNotice] = useState(false);

  // Routing feedback state
  const [routingMessage, setRoutingMessage] = useState<string | null>(null);

  // AI Health Check state
  const [aiHealth, setAiHealth] = useState<{
    loading: boolean;
    checked: boolean;
    ok: boolean;
    hasApiKey: boolean;
    model: string;
    fallbackModel?: string;
    error?: string;
  }>({
    loading: false,
    checked: false,
    ok: false,
    hasApiKey: false,
    model: '',
  });

  // Searchable FAQ state
  const [faqQuery, setFaqQuery] = useState('');

  // Dialogs
  const [confirmDemoOpen, setConfirmDemoOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    setProfileName(activeAccount.name);
    setProfileEmail(activeAccount.email);
    setProfilePhone(activeAccount.phone || '');
  }, [activeAccount]);

  useEffect(() => {
    setNameDraft(workspace.workspaceName);
    setContextDraft(workspace.workspaceContext);
  }, [workspace.workspaceName, workspace.workspaceContext]);

  const runHealthCheck = async () => {
    setAiHealth((prev) => ({ ...prev, loading: true }));
    const res = await checkAiHealthStatus();
    setAiHealth({
      loading: false,
      checked: true,
      ok: res.ok,
      hasApiKey: res.hasApiKey,
      model: res.model,
      fallbackModel: res.fallbackModel,
      error: res.error,
    });
  };

  useEffect(() => {
    void runHealthCheck();
  }, []);

  const effectiveWeights = normalizeWeights(weights);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    onUpdateAccountProfile(profileName.trim(), profileEmail.trim(), profilePhone.trim());
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    onUpdateWorkspaceMeta(nameDraft.trim(), contextDraft.trim());
    setWsSavedNotice(true);
    setTimeout(() => setWsSavedNotice(false), 2000);
  };

  const faqItems = useMemo(
    () => [
      {
        q: tr(
          'How do I report a problem and get a tracking ID?',
          'சிக்கலை எவ்வாறு பதிவு செய்து கண்காணிப்பு எண்ணைப் பெறுவது?'
        ),
        a: tr(
          'Click "Report a Problem" in the top bar or sidebar. Choose a category, describe what happened, pick a map pin or enter an address-only location, optionally attach JPG/PNG/WEBP/PDF proof, review your details, and submit. Your unique reference ID (e.g., CMP-2026-XXXX) is generated immediately after storage confirmation.',
          'மேல் பட்டியில் உள்ள "சிக்கலைப் புகாரளி" பொத்தானை அழுத்தவும். வகை, விளக்கம், வரைபட இடம் அல்லது முகவரி, மற்றும் விருப்ப ஆவணங்களைச் சேர்த்து சரிபார்த்து சமர்ப்பிக்கவும். சேமிக்கப்பட்டவுடன் தனித்துவமான புகார் எண் வழங்கப்படும்.'
        ),
      },
      {
        q: tr(
          'What stays private when I enable Anonymous Reporting?',
          'அடையாளம் மறைத்த புகார் முறையில் எவை தனிப்பட்டதாக இருக்கும்?'
        ),
        a: tr(
          'When Anonymous Mode is turned on, your name, email, and phone number are stripped from all public views and even hidden from department staff projections. Only your issue title, category, location, and public status timeline are visible.',
          'அடையாளம் மறைத்த முறை இயக்கப்பட்டால், உங்கள் பெயர், மின்னஞ்சல் மற்றும் தொலைபேசி எண் பொதுப் பார்வையிலிருந்தும் பணியாளர் பார்வையிலிருந்தும் மறைக்கப்படும். சிக்கலின் விவரம், இடம் மற்றும் நிலை மட்டுமே தெரியும்.'
        ),
      },
      {
        q: tr(
          'How does Citizen Satisfaction Confirmation & Reopening work?',
          'தீர்வு உறுதிப்படுத்தல் மற்றும் மீண்டும் திறத்தல் எவ்வாறு செயல்படுகிறது?'
        ),
        a: tr(
          'Field workers cannot unilaterally close your complaint. When a worker finishes repairs, the status becomes "Resolved : Awaiting Confirmation". In "My Complaints", you can inspect their resolution notes and either Confirm & Close (with a 1–5 rating) or Reopen the complaint if the problem persists.',
          'களப் பணியாளர்கள் தாங்களாகவே புகாரை மூட முடியாது. பணி முடிந்ததும் "உறுதிப்படுத்தலுக்காகக் காத்திருக்கிறது" என மாறும். "எனது புகார்கள்" பகுதியில் நீங்கள் திருப்தி அடைந்தால் மூடலாம் அல்லது சிக்கல் தொடர்ந்தால் மீண்டும் திறக்கலாம்.'
        ),
      },
      {
        q: tr(
          'How does NEEDMAP AI calculate priority scores and verify AI quotes?',
          'NEEDMAP AI முன்னுரிமை மதிப்பெண்களையும் AI மேற்கோள்களையும் எவ்வாறு சரிபார்க்கிறது?'
        ),
        a: tr(
          `Gemini AI groups similar feedback into opportunity clusters, while deterministic TypeScript code verifies every feedbackId and quote against real inbox entries and computes Priority Score = Frequency (${Math.round(effectiveWeights.frequency * 100)}%) + Impact (${Math.round(effectiveWeights.impact * 100)}%) + Urgency (${Math.round(effectiveWeights.urgency * 100)}%) + Confidence (${Math.round(effectiveWeights.confidence * 100)}%). Unknown factors receive a neutral ${UNKNOWN_FACTOR_NEUTRAL_SCORE}/100 score. Authorized admins can record audited overrides.`,
          `Gemini AI ஒத்த பின்னூட்டங்களைத் தொகுக்கிறது. ஆனால் ஒவ்வொரு மேற்கோளும் அசல் பதிவுகளுடன் சரிபார்க்கப்பட்டு, கணிதச் சூத்திரம் மூலம் முன்னுரிமை மதிப்பெண் கணக்கிடப்படுகிறது. அறியப்படாத காரணிகளுக்கு நடுநிலையான ${UNKNOWN_FACTOR_NEUTRAL_SCORE}/100 வழங்கப்படும்.`
        ),
      },
      {
        q: tr(
          'Does switching between English and Tamil translate user-submitted complaint text?',
          'ஆங்கிலம் மற்றும் தமிழுக்கு மாற்றும்போது பயனர் எழுதிய புகார் உரை மொழிபெயர்க்கப்படுமா?'
        ),
        a: tr(
          'All navigation menus, buttons, form labels, status badges, categories, and help guides switch immediately between English and Tamil. Original citizen-submitted descriptions and evidence quotes are intentionally preserved verbatim so ground-truth wording is never distorted.',
          'அனைத்து வழிசெலுத்தல் மெனுக்கள், பொத்தான்கள், படிவங்கள் மற்றும் நிலைகள் உடனடியாகத் தமிழுக்கு மாறும். ஆனால் பயனர்கள் எழுதிய அசல் புகார் வரிகள் ஆதாரத் துல்லியத்திற்காக அப்படியே பாதுகாக்கப்படுகின்றன.'
        ),
      },
      {
        q: tr(
          'What keyboard shortcuts and accessibility features are supported?',
          'என்ன விசைப்பலகை குறுக்குவழிகள் மற்றும் அணுகல்தன்மை வசதிகள் உள்ளன?'
        ),
        a: tr(
          'Press "/" anywhere outside an input field to focus Global Search. Press "Escape" to close modals, drawers, or dropdowns. All interactive controls support Tab / Shift+Tab navigation with visible focus rings and dark/light contrast compliance.',
          'தேடல் பெட்டியைத் திறக்க "/" விசையையும், சாளரங்களை மூட "Escape" விசையையும் அழுத்தலாம். அனைத்துக் கட்டுப்பாடுகளும் விசைப்பலகை Tab வழிசெலுத்தல் மற்றும் தெளிவான நிற வேறுபாட்டைக் கொண்டுள்ளன.'
        ),
      },
    ],
    [tr, effectiveWeights]
  );

  const filteredFaqs = useMemo(() => {
    const q = faqQuery.trim().toLowerCase();
    if (!q) return faqItems;
    return faqItems.filter(
      (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
    );
  }, [faqItems, faqQuery]);

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
          {tr('Settings, Preferences & Help', 'அமைப்புகள், விருப்பத்தேர்வுகள் மற்றும் உதவி')}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
          {tr(
            'Manage your active role profile, language & theme, privacy defaults, department routing rules, priority weights, AI health, and workspace data.',
            'உங்கள் பாத்திர சுயவிவரம், மொழி மற்றும் தோற்றம், தனியுரிமை, துறை வழித்தடம், முன்னுரிமை எடைகள், AI நிலை மற்றும் தரவுக் கட்டுப்பாடுகளை நிர்வகிக்கவும்.'
          )}
        </p>
      </div>

      {/* SECTION A & SECTION B */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section A: Profile & Demo Role Switcher */}
        <section className="space-y-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {tr('A. Profile & Role Access', 'A. சுயவிவரம் மற்றும் பாத்திர அணுகல்')}
              </h2>
            </div>
            <span className="font-mono text-xs text-teal-700 dark:text-teal-400">
              {tRole(activeAccount.role)}
            </span>
          </div>

          <div>
            <label
              htmlFor="settings-role-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              {tr(
                'Active Workspace Account (Switch Role to Test Portals)',
                'செயலில் உள்ள கணக்கு (துறை / பணியாளர் பக்கங்களைச் சோதிக்க மாற்றவும்)'
              )}
            </label>
            <select
              id="settings-role-select"
              value={activeAccount.id}
              onChange={(e) => onSwitchAccount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:outline-none"
            >
              {workspace.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} : {tRole(acc.role)}{' '}
                  {acc.isDemoAccount ? tr('[Sample Demo]', '[மாதிரி கணக்கு]') : ''}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Display Name', 'காட்சிப் பெயர்')}
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Contact Email', 'தொடர்பு மின்னஞ்சல்')}
                </label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {activeAccount.role === 'worker' ? (
                <button
                  type="button"
                  onClick={() => onSelectView('worker_portal')}
                  className="text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
                >
                  {tr('Manage Worker Availability & Tasks →', 'பணியாளர் இருப்பு மற்றும் பணிகளை நிர்வகி →')}
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr(
                    'Role permissions are enforced at the data layer.',
                    'பாத்திர அனுமதிகள் தரவு அடுக்கில் பாதுகாக்கப்படுகின்றன.'
                  )}
                </span>
              )}

              <div className="flex items-center gap-2">
                {profileSaved && (
                  <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-medium">
                    <Check className="h-3.5 w-3.5" />
                    {tr('Saved', 'சேமிக்கப்பட்டது')}
                  </span>
                )}
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 dark:bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-600"
                >
                  {tr('Save Profile', 'சுயவிவரத்தைச் சேமி')}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Section B: Appearance & Language */}
        <section className="space-y-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {tr('B. Appearance & Language', 'B. தோற்றம் மற்றும் மொழி')}
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Interface Language (Persisted Across 19 Languages)', 'செயலி மொழி (19 மொழிகளில் சேமிக்கப்படும்)')}
              </label>
              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 max-h-56 overflow-y-auto p-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                {SUPPORTED_LANGUAGES.map((item) => {
                  const isSelected = lang === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLang(item.code as LanguageCode)}
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-sm">{item.flag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{item.nativeName}</div>
                        <div className={`truncate text-[10px] ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                          {item.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {tr(
                  'All menus, forms, statuses, categories, priorities, and portals translate immediately. User-submitted complaint text remains in its original form.',
                  'அனைத்து மெனுக்கள், படிவங்கள், நிலைகள், வகைகள் மற்றும் போர்ட்டல்கள் உடனடியாக மொழிபெயர்க்கப்படும். பயனர் சமர்ப்பித்த அசல் உரை அப்படியே பாதுகாக்கப்படும்.'
                )}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <label className="block font-medium text-slate-700 dark:text-slate-300">
                {tr('Color Theme', 'வண்ணத் தோற்றம்')}
              </label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {(
                  [
                    { id: 'light', label: tr('Light Mode', 'வெளிச்ச முறை'), icon: Sun },
                    { id: 'dark', label: tr('Dark Mode', 'இருள் முறை'), icon: Moon },
                    { id: 'system', label: tr('System Preference', 'கணினி இயல்புநிலை'), icon: Sliders },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = themeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setThemeMode(opt.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
                        active
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION C & SECTION D */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section C: Notification Preferences */}
        <section className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {tr('C. Notification Preferences', 'C. அறிவிப்பு விருப்பத்தேர்வுகள்')}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {(
              [
                {
                  key: 'inAppStatusUpdates',
                  title: tr('Complaint Status & Resolution Alerts', 'புகார் நிலை மற்றும் தீர்வு அறிவிப்புகள்'),
                  desc: tr(
                    'Notify in-app when a reported complaint changes status or awaits confirmation.',
                    'புகாரின் நிலை மாறும்போதும் உறுதிப்படுத்தல் தேவைப்படும்போதும் அறிவிக்கவும்.'
                  ),
                },
                {
                  key: 'inAppAssignments',
                  title: tr('Department & Worker Assignment Alerts', 'துறை மற்றும் பணியாளர் ஒதுக்கீட்டு அறிவிப்புகள்'),
                  desc: tr(
                    'Notify when tasks are routed or assigned to your worker/department queue.',
                    'பணிகள் உங்கள் துறை அல்லது பணியாளர் பட்டியலுக்கு ஒதுக்கப்படும்போது அறிவிக்கவும்.'
                  ),
                },
                {
                  key: 'inAppAiSummaries',
                  title: tr('Gemini AI Analysis Completion Notices', 'Gemini AI பகுப்பாய்வு நிறைவு அறிவிப்புகள்'),
                  desc: tr(
                    'Show summary alerts after batch clustering and evidence verification finish.',
                    'AI பகுப்பாய்வு மற்றும் ஆதாரச் சரிபார்ப்பு முடிந்ததும் அறிவிக்கவும்.'
                  ),
                },
                {
                  key: 'quietHoursEnabled',
                  title: tr('Quiet Hours Mode (Suppress Non-Urgent Banners)', 'அமைதி நேரம் (அவசரமற்ற அறிவிப்புகளைக் குறை)'),
                  desc: tr(
                    'Store updates silently in the notification bell without interrupting active work.',
                    'வேலையைத் தடுக்காமல் அறிவிப்பு மணியில் மட்டும் அமைதியாகச் சேமிக்கவும்.'
                  ),
                },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-100 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={workspace.notificationPrefs[item.key]}
                  onChange={(e) =>
                    onUpdateNotificationPrefs({
                      ...workspace.notificationPrefs,
                      [item.key]: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-700 focus:ring-teal-600"
                />
              </label>
            ))}
          </div>
        </section>

        {/* Section D: Complaint & Privacy Preferences */}
        <section className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {tr('D. Complaint & Privacy Defaults', 'D. புகார் மற்றும் தனியுரிமை இயல்புநிலைகள்')}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-slate-100 dark:border-slate-800 p-3">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {tr('Default to Anonymous Reporting', 'இயல்புநிலையாக அடையாளம் மறைத்த புகார்')}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  {tr(
                    'Pre-select anonymous mode when opening the Report a Problem form.',
                    'புதிய புகார் படிவத்தைத் திறக்கும்போது அடையாளம் மறைத்த முறையைத் தேர்ந்தெடுக்கவும்.'
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                checked={workspace.complaintPrefs.defaultAnonymous}
                onChange={(e) =>
                  onUpdateComplaintPrefs({
                    ...workspace.complaintPrefs,
                    defaultAnonymous: e.target.checked,
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-700 focus:ring-teal-600"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Default Contact Preference', 'இயல்புநிலை தொடர்பு முறை')}
                </label>
                <select
                  value={workspace.complaintPrefs.defaultContactMethod}
                  onChange={(e) =>
                    onUpdateComplaintPrefs({
                      ...workspace.complaintPrefs,
                      defaultContactMethod: e.target
                        .value as ComplaintPreferences['defaultContactMethod'],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="in_app">{tr('In-App Tracker Only', 'செயலி கண்காணிப்பு மட்டும்')}</option>
                  <option value="email">{tr('Email Updates', 'மின்னஞ்சல்')}</option>
                  <option value="phone">{tr('Phone Call / SMS', 'தொலைபேசி / குறுஞ்செய்தி')}</option>
                  <option value="none">{tr('No Direct Contact', 'நேரடித் தொடர்பு வேண்டாம்')}</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300">
                  {tr('Default Campus / Civic Zone', 'இயல்புநிலை மண்டலம்')}
                </label>
                <input
                  type="text"
                  value={workspace.complaintPrefs.defaultAreaZone}
                  onChange={(e) =>
                    onUpdateComplaintPrefs({
                      ...workspace.complaintPrefs,
                      defaultAreaZone: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                <Lock className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                {tr('Public vs. Private Data Boundary', 'பொது மற்றும் தனிப்பட்ட தரவு எல்லை')}
              </div>
              <p className="mt-1">
                {tr(
                  'Public Summary: Category, title, general location, and status timeline. Restricted to Reporter & Authorized Staff: Contact phone/email and private attachments (unless Anonymous Mode is active, which hides identity from everyone).',
                  'பொதுச் சுருக்கம்: வகை, தலைப்பு, இடம் மற்றும் நிலை. புகாரளிப்பவர் & அதிகாரிகளுக்கு மட்டும்: தொலைபேசி, மின்னஞ்சல் மற்றும் ஆவணங்கள் (அடையாளம் மறைத்த முறையில் இவை அனைவரிடமிருந்தும் மறைக்கப்படும்).'
                )}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* SECTION E: Department Routing & Priority Engine Weights */}
      <section className="space-y-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {tr(
                'E. Department Routing Rules & Priority Scoring Weights',
                'E. துறை வழித்தட விதிகள் மற்றும் முன்னுரிமை எடைகள்'
              )}
            </h2>
          </div>
          {!canEditRouting && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {tr(
                'Switch to Department Admin or Platform Admin to edit category routing rules.',
                'வழித்தட விதிகளைத் திருத்த துறை அதிகாரி அல்லது தள நிர்வாகி கணக்கிற்கு மாறவும்.'
              )}
            </span>
          )}
        </div>

        {routingMessage && (
          <div className="rounded-lg bg-teal-50 dark:bg-teal-950/40 px-3 py-2 text-xs text-teal-900 dark:text-teal-200">
            {routingMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Category Routing Table */}
          <div className="overflow-x-auto xl:col-span-7">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-3">{tr('Category', 'வகை')}</th>
                  <th className="px-3 py-2">{tr('Assigned Department', 'ஒதுக்கப்பட்ட துறை')}</th>
                  <th className="py-2 pl-3 text-right">{tr('Target SLA (Days)', 'இலக்கு நாட்கள்')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {workspace.routingRules.map((rule: CategoryRoutingRule) => (
                  <tr key={rule.category}>
                    <td className="py-2 pr-3 font-medium text-slate-900 dark:text-slate-100">
                      {tCategory(rule.category)}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        disabled={!canEditRouting}
                        value={rule.departmentId}
                        onChange={(e) => {
                          const res = onUpdateRoutingRule(
                            rule.category,
                            e.target.value,
                            rule.slaDays
                          );
                          if (res.ok) {
                            setRoutingMessage(
                              tr(
                                `Updated routing for ${tCategory(rule.category)}.`,
                                `${tCategory(rule.category)}க்கான துறை புதுப்பிக்கப்பட்டது.`
                              )
                            );
                          }
                        }}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 disabled:opacity-65"
                      >
                        {workspace.departments.map((d: Department) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.shortCode})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pl-3 text-right font-mono tabular-nums">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        disabled={!canEditRouting}
                        value={rule.slaDays}
                        onChange={(e) => {
                          const days = Math.max(1, Math.min(30, Number(e.target.value) || 3));
                          onUpdateRoutingRule(rule.category, rule.departmentId, days);
                        }}
                        className="w-16 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-right font-mono text-xs text-slate-900 dark:text-slate-100 disabled:opacity-65"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Priority Weights */}
          <div className="space-y-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-5 xl:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                {tr('Deterministic Priority Formula', 'முன்னுரிமை மதிப்பெண் எடைகள்')}
              </h3>
              <button
                type="button"
                onClick={() => onUpdateWeights({ ...DEFAULT_PRIORITY_WEIGHTS })}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {tr('Reset 30/30/25/15', 'மீட்டமை 30/30/25/15')}
              </button>
            </div>

            {(
              [
                {
                  key: 'frequency',
                  label: tr('Frequency (Report Volume)', 'அதிர்வெண் (புகார் எண்ணிக்கை)'),
                },
                {
                  key: 'impact',
                  label: tr('User-Reported Impact', 'பயனர் தெரிவித்த தாக்கம்'),
                },
                {
                  key: 'urgency',
                  label: tr('Urgency & Time Sensitivity', 'அவசர நிலை'),
                },
                {
                  key: 'confidence',
                  label: tr('Evidence Confidence', 'ஆதார நம்பகத்தன்மை'),
                },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={`settings-w-${item.key}`}
                    className="font-medium text-slate-700 dark:text-slate-300"
                  >
                    {item.label}
                  </label>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {Math.round(effectiveWeights[item.key] * 100)}%
                  </span>
                </div>
                <input
                  id={`settings-w-${item.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weights[item.key]}
                  onChange={(e) =>
                    onUpdateWeights({
                      ...weights,
                      [item.key]: Number(e.target.value),
                    })
                  }
                  className="mt-1.5 w-full accent-teal-700"
                />
              </div>
            ))}

            <div className="rounded-lg bg-white dark:bg-slate-900 p-3 font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-300">
              Score = (Freq × {effectiveWeights.frequency.toFixed(2)}) + (Impact ×{' '}
              {effectiveWeights.impact.toFixed(2)}) + (Urgency ×{' '}
              {effectiveWeights.urgency.toFixed(2)}) + (Conf ×{' '}
              {effectiveWeights.confidence.toFixed(2)})
            </div>
          </div>
        </div>
      </section>

      {/* SECTION F & SECTION G */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Section F: Live AI Service Status & Server Configuration */}
        <section className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-teal-700 dark:text-teal-400" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {tr('F. Gemini AI Service Status', 'F. Gemini AI சேவை நிலை')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void runHealthCheck()}
              disabled={aiHealth.loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {aiHealth.loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {tr('Check AI Health', 'AI நிலையைச் சரிபார்')}
            </button>
          </div>

          <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {tr('Server Proxy Endpoint:', 'சேவையக முனை:')}
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {aiHealth.ok
                  ? tr('Connected (/api/analyze)', 'இணைக்கப்பட்டுள்ளது (/api/analyze)')
                  : aiHealth.loading
                  ? tr('Checking...', 'சோதிக்கிறது...')
                  : tr('Unavailable', 'கிடைக்கவில்லை')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {tr('Server API Key Attached:', 'சேவையக API சாவி நிலை:')}
              </span>
              <span
                className={`font-semibold ${
                  aiHealth.hasApiKey
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {aiHealth.hasApiKey
                  ? tr('Configured Server-Side', 'சேவையகத்தில் இணைக்கப்பட்டுள்ளது')
                  : tr('Not Configured', 'இணைக்கப்படவில்லை')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {tr('Primary Clustering Model:', 'முதன்மை AI மாதிரி:')}
              </span>
              <span className="font-mono text-slate-900 dark:text-slate-100">
                {aiHealth.model || 'gemini-3.1-flash-lite'}
              </span>
            </div>
            {aiHealth.error && (
              <p className="pt-1 text-rose-700 dark:text-rose-400">{aiHealth.error}</p>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {tr(
              'All Gemini calls execute exclusively on the Express backend (/api/analyze). API keys are never entered in browser forms - manage GEMINI_API_KEY in AI Studio Settings > Secrets or your local .env file.',
              'அனைத்து Gemini அழைப்புகளும் பின்புல சேவையகத்தில் (/api/analyze) மட்டுமே இயங்குகின்றன. API சாவியை உலாவியில் உள்ளிடத் தேவையில்லை; AI Studio Settings > Secrets அல்லது .env கோப்பில் நிர்வகிக்கவும்.'
            )}
          </p>
        </section>

        {/* Section G: Workspace Data & Local Storage Controls */}
        <section className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {tr('G. Workspace & Storage Controls', 'G. பணியிடம் மற்றும் சேமிப்புக் கட்டுப்பாடுகள்')}
            </h2>
          </div>

          <form onSubmit={handleSaveWorkspace} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="settings-ws-name"
                  className="block font-medium text-slate-700 dark:text-slate-300"
                >
                  {tr('Workspace Name', 'பணியிடப் பெயர்')}
                </label>
                <input
                  id="settings-ws-name"
                  type="text"
                  required
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="settings-ws-context"
                  className="block font-medium text-slate-700 dark:text-slate-300"
                >
                  {tr('Organization Scope', 'நிறுவன வரம்பு')}
                </label>
                <input
                  id="settings-ws-context"
                  type="text"
                  value={contextDraft}
                  onChange={(e) => setContextDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {wsSavedNotice && (
                <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {tr('Saved locally', 'சேமிக்கப்பட்டது')}
                </span>
              )}
              <button
                type="submit"
                className="rounded-lg bg-slate-900 dark:bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-teal-600"
              >
                {tr('Save Workspace Details', 'பணியிட விவரங்களைச் சேமி')}
              </button>
            </div>
          </form>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => exportFullWorkspaceBackupJson(workspace, activeAccount)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                {tr('Export Backup JSON', 'காப்பு JSON பதிவிறக்கு')}
              </button>

              <button
                type="button"
                onClick={() => setConfirmDemoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                {tr('Reset Sample Demo Data', 'மாதிரி தரவை மீட்டமை')}
              </button>

              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 px-3 py-2 text-xs font-medium text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {tr('Clear All Local Data', 'அனைத்து தரவையும் அழி')}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tr(
                'Storage Disclosure: Demo complaints, uploaded attachments, and preferences are persisted in your browser localStorage on this device (not uploaded to external cloud buckets).',
                'சேமிப்பு அறிவிப்பு: புகார்கள், இணைக்கப்பட்ட கோப்புகள் மற்றும் விருப்பத்தேர்வுகள் உங்கள் உலாவியின் localStorage-இல் மட்டுமே சேமிக்கப்படுகின்றன.'
              )}
            </p>
          </div>
        </section>
      </div>

      {/* SECTION H: Searchable Help, FAQ & Accessibility Guide */}
      <section className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {tr(
                'H. Searchable Help, Methodology & Accessibility Guide',
                'H. தேடக்கூடிய உதவி, வழிமுறை மற்றும் அணுகல்தன்மை வழிகாட்டி'
              )}
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={faqQuery}
              onChange={(e) => setFaqQuery(e.target.value)}
              placeholder={tr('Search help topics...', 'உதவித் தலைப்புகளைத் தேடு...')}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 focus:border-teal-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {filteredFaqs.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            {tr('No help articles match your search.', 'உங்கள் தேடலுக்குப் பொருந்தும் உதவித் தலைப்புகள் இல்லை.')}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 text-xs"
              >
                <h3 className="font-display font-semibold text-slate-900 dark:text-slate-100">
                  {faq.q}
                </h3>
                <p className="mt-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirm Reset Demo */}
      <ConfirmDialog
        isOpen={confirmDemoOpen}
        title={tr(
          'Reset Workspace to Sample Demo Data?',
          'மாதிரி தரவிற்குப் பணியிடத்தை மீட்டமைக்கவா?'
        )}
        description={tr(
          'This restores the sample Northbridge Campus complaints, 36 feedback entries, departments, workers, vacancies, and illustrative trackers.',
          'இது நார்த்பிரிட்ஜ் வளாக மாதிரிப் புகார்கள், 36 பின்னூட்டங்கள், துறைகள், பணியாளர்கள் மற்றும் மாதிரி கண்காணிப்புகளை மீட்டமைக்கும்.'
        )}
        confirmLabel={tr('Reset to Sample Data', 'மாதிரி தரவிற்கு மீட்டமை')}
        variant="primary"
        onCancel={() => setConfirmDemoOpen(false)}
        onConfirm={() => {
          setConfirmDemoOpen(false);
          onResetToDemo();
        }}
      />

      {/* Confirm Clear All */}
      <ConfirmDialog
        isOpen={confirmClearOpen}
        title={tr('Clear All Workspace Data?', 'அனைத்து பணியிடத் தரவையும் அழிக்கவா?')}
        description={tr(
          'This removes all complaints, feedback entries, opportunity clusters, interventions, and trackers from local browser storage so you can start fresh.',
          'இது அனைத்துப் புகார்கள், பின்னூட்டங்கள், வாய்ப்புத் தொகுப்புகள் மற்றும் கண்காணிப்புகளை உள்ளூர் உலாவி சேமிப்பிலிருந்து நீக்கும்.'
        )}
        confirmLabel={tr('Clear Everything', 'அனைத்தையும் அழி')}
        variant="danger"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          setConfirmClearOpen(false);
          onClearAllData();
        }}
      />
    </div>
  );
};
