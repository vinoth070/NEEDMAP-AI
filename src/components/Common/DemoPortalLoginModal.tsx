import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  HardHat,
  KeyRound,
  Lock,
  LogOut,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
  Users,
  X,
} from "./Icons";
import { useI18n } from '../../i18n/I18nContext';
import type { UserAccount, WorkspaceViewId } from '../../types/needmap';

interface DemoPortalLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: UserAccount[];
  activeAccount: UserAccount;
  onSelectAccount: (accountId: string, navigateView?: WorkspaceViewId) => void;
  onResetDemoData: () => void;
}

export const DemoPortalLoginModal: React.FC<DemoPortalLoginModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onSelectAccount,
  onResetDemoData,
}) => {
  const { t, tr, tRole } = useI18n();
  const [tab, setTab] = useState<'cards' | 'manual'>('cards');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    const matched = accounts.find(
      (a) =>
        (a.username && a.username.toLowerCase() === u) ||
        a.email.toLowerCase() === u ||
        a.name.toLowerCase().includes(u)
    );

    if (matched && (p === 'demo123' || !matched.password || matched.password === p)) {
      let defaultView: WorkspaceViewId = 'overview';
      if (matched.role === 'citizen') defaultView = 'my_complaints';
      else if (matched.role === 'worker') defaultView = 'worker_portal';
      else if (matched.role === 'dept_admin') defaultView = 'department_portal';
      else if (matched.role === 'platform_admin') defaultView = 'central_registry';

      onSelectAccount(matched.id, defaultView);
      onClose();
    } else {
      setLoginError(t('auth.invalidCredentials'));
    }
  };

  const portalCards = [
    {
      portalId: 'citizen',
      title: t('auth.portalCitizen'),
      desc: t('auth.portalCitizenDesc'),
      icon: Users,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300',
      badgeColor: 'bg-emerald-600 text-white',
      account: accounts.find((a) => a.username === 'citizen.demo') || accounts[0],
      defaultView: 'my_complaints' as WorkspaceViewId,
      altAccount: accounts.find((a) => a.username === 'student.demo'),
    },
    {
      portalId: 'worker',
      title: t('auth.portalWorker'),
      desc: t('auth.portalWorkerDesc'),
      icon: HardHat,
      color: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300',
      badgeColor: 'bg-amber-600 text-white',
      account: accounts.find((a) => a.role === 'worker') || accounts[0],
      defaultView: 'worker_portal' as WorkspaceViewId,
    },
    {
      portalId: 'dept_admin',
      title: t('auth.portalDeptAdmin'),
      desc: t('auth.portalDeptAdminDesc'),
      icon: Building2,
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300',
      badgeColor: 'bg-indigo-600 text-white',
      account: accounts.find((a) => a.role === 'dept_admin') || accounts[0],
      defaultView: 'department_portal' as WorkspaceViewId,
    },
    {
      portalId: 'central_admin',
      title: t('auth.portalCentralAdmin'),
      desc: t('auth.portalCentralAdminDesc'),
      icon: Shield,
      color: 'bg-slate-100 border-slate-300 text-slate-800 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-200',
      badgeColor: 'bg-slate-900 dark:bg-teal-600 text-white',
      account: accounts.find((a) => a.role === 'platform_admin') || accounts[0],
      defaultView: 'central_registry' as WorkspaceViewId,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-auth-title"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                <Lock className="h-4 w-4" />
              </span>
              <h2
                id="demo-auth-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                {t('auth.modalTitle')}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {t('auth.modalSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Security Disclaimer Banner */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div>{t('auth.disclaimer')}</div>
        </div>

        {/* Tabs: One-Click Portal Cards vs Manual Demo Login */}
        <div className="mt-4 flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('cards')}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              tab === 'cards'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {tr('One-Click Demo Portals (Recommended)', 'ஒரே கிளிக்கில் மாதிரி பகுதிகள்')}
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`border-b-2 px-4 py-2 text-xs font-semibold transition-colors ${
              tab === 'manual'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {tr('Manual Fictional Login Test', 'பயனர் பெயர் & கடவுச்சொல் மூலம்')}
          </button>
        </div>

        {/* Tab 1: 4 Distinct Portal Cards */}
        {tab === 'cards' && (
          <div className="mt-4 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 overflow-y-auto pr-1">
            {portalCards.map((portal) => {
              const Icon = portal.icon;
              const isCurrent = portal.account.id === activeAccount.id;

              return (
                <div
                  key={portal.portalId}
                  className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                    isCurrent
                      ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/30 dark:bg-teal-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/90'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-lg p-2 ${portal.color}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                            {portal.title}
                          </h3>
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${portal.badgeColor}`}>
                            {tRole(portal.account.role)}
                          </span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                          <Check className="h-3 w-3" />
                          {tr('Current Active', 'தற்போதைய பொறுப்பு')}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {portal.desc}
                    </p>

                    {/* Fictional Credentials Display */}
                    <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[11px] font-mono text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60">
                      <div>
                        <span className="text-slate-400">User:</span>{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {portal.account.username || 'demo'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Pass:</span>{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {portal.account.password || 'demo123'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAccount(portal.account.id, portal.defaultView);
                        onClose();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-700"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{t('auth.enterPortal')}</span>
                    </button>

                    {portal.altAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAccount(portal.altAccount!.id, portal.defaultView);
                          onClose();
                        }}
                        className="text-center text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                      >
                        {tr('Or try Student account', 'அல்லது மாணவர் கணக்கை முயற்சிக்க')} ({portal.altAccount.username})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Manual Credentials Test Form */}
        {tab === 'manual' && (
          <form onSubmit={handleManualLogin} className="mt-4 max-w-md mx-auto w-full space-y-4 py-2">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
              {tr(
                'Test local authentication validation. Use any of the fictional credentials: citizen.demo, student.demo, worker.demo, department.demo, or admin.demo with password "demo123".',
                'உள்ளூர் அங்கீகாரத்தைச் சோதிக்க மேலே உள்ள மாதிரி பயனர் பெயர் மற்றும் "demo123" கடவுச்சொல்லைப் பயன்படுத்தவும்.'
              )}
            </div>

            {loginError && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="demo-user-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {t('auth.username')}
              </label>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="demo-user-input"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. citizen.demo, worker.demo, department.demo, admin.demo"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="demo-pass-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {t('auth.password')}
              </label>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="demo-pass-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="demo123"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-teal-700 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
            >
              {t('auth.signIn')}
            </button>
          </form>
        )}

        {/* Footer with Demo Reset */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  tr(
                    'Reset entire workspace to initial sample dataset with fresh complaints and feedback?',
                    'அனைத்து மாதிரி தரவையும் ஆரம்ப நிலைக்கு மீட்டமைக்கவா?'
                  )
                )
              ) {
                onResetDemoData();
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>{tr('Reset Sample Demo Dataset', 'மாதிரி தரவை மீட்டமை')}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
