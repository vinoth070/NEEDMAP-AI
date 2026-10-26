/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  Eye,
  EyeOff,
  Globe,
  HardHat,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  User,
  Users,
  X,
  XCircle,
} from '../Common/Icons';
import { useI18n } from '../../i18n/I18nContext';
import { getLanguageMeta, SUPPORTED_LANGUAGES } from '../../i18n/languages';
import {
  FirebaseAuthAdapter,
  LocalDemoAuthAdapter,
  evaluatePasswordStrength,
} from '../../services/authAdapter';
import { useTheme } from '../../theme/ThemeContext';
import type { LanguageCode, UserAccount, UserRole, WorkspaceViewId } from '../../types/needmap';

interface AuthScreenProps {
  accounts: UserAccount[];
  onAuthenticated: (account: UserAccount, targetView?: WorkspaceViewId) => void;
}

type AuthTab = 'signin' | 'signup' | 'forgot' | 'verify_email' | 'demo_roles';

export const AuthScreen: React.FC<AuthScreenProps> = ({ accounts, onAuthenticated }) => {
  const { lang, setLang, t, tr } = useI18n();
  const { themeMode, setThemeMode } = useTheme();

  // Active view tab
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  // Shared form inputs preserved across tab switches
  const [emailInput, setEmailInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Sign In passwords and visibility
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up passwords and visibility
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signUpRole, setSignUpRole] = useState<UserRole>('citizen');
  const [signUpDept, setSignUpDept] = useState('DEPT-FAC');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Verification screen state
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredAccount, setRegisteredAccount] = useState<UserAccount | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  // Status & loading feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentLangMeta = getLanguageMeta(lang);

  // Dynamic Password Validation
  const passwordEvaluation = evaluatePasswordStrength(signUpPassword);
  const passwordsMatch =
    signUpPassword.length > 0 &&
    signUpConfirmPassword.length > 0 &&
    signUpPassword === signUpConfirmPassword;
  const passwordsMismatch =
    signUpConfirmPassword.length > 0 && signUpPassword !== signUpConfirmPassword;

  const isSignUpFormValid =
    fullNameInput.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.trim()) &&
    passwordEvaluation.allSatisfied &&
    passwordsMatch &&
    termsAccepted;

  // Countdown timer for email verification cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Tab switcher helper that clears temporary errors but preserves form fields
  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVerificationFeedback(null);
    if (tab === 'forgot' && emailInput.trim()) {
      setForgotEmail(emailInput.trim());
    }
  };

  // 1. Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !signInPassword) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      // Primary authentication via real Firebase Auth
      const res = await FirebaseAuthAdapter.loginWithEmailPassword(
        cleanEmail,
        signInPassword,
        rememberMe
      );

      if (res.ok && res.account) {
        setIsLoading(false);
        const targetView: WorkspaceViewId =
          res.account.role === 'worker'
            ? 'worker_portal'
            : res.account.role === 'dept_admin'
            ? 'department_portal'
            : res.account.role === 'platform_admin'
            ? 'central_registry'
            : 'overview';
        onAuthenticated(res.account, targetView);
        return;
      }

      // Check if credentials match offline sample demo personas
      const demoRes = await LocalDemoAuthAdapter.loginWithCredentials(
        cleanEmail,
        signInPassword,
        accounts
      );

      setIsLoading(false);

      if (demoRes.ok && demoRes.account) {
        const targetView: WorkspaceViewId =
          demoRes.account.role === 'worker'
            ? 'worker_portal'
            : demoRes.account.role === 'dept_admin'
            ? 'department_portal'
            : demoRes.account.role === 'platform_admin'
            ? 'central_registry'
            : 'overview';
        onAuthenticated(demoRes.account, targetView);
        return;
      }

      setErrorMessage(
        res.error || demoRes.error || t('auth.invalidCredentials')
      );
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Could not complete sign in. Please try again.');
    }
  };

  // 2. Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await FirebaseAuthAdapter.loginWithGoogle(rememberMe);
      setIsLoading(false);

      if (res.ok && res.account) {
        onAuthenticated(res.account, 'overview');
      } else {
        setErrorMessage(res.error || 'Google sign-in could not be completed.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Google authentication failed.');
    }
  };

  // 3. Handle Sign Up / Create Account
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullNameInput.trim();
    const cleanEmail = emailInput.trim();

    if (!cleanName) {
      setErrorMessage('Full Name is required.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!passwordEvaluation.allSatisfied) {
      setErrorMessage('Please ensure your password satisfies all security requirements listed below.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Confirm Password must match the Password field exactly.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('You must acknowledge and accept the Terms of Service to create an account.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await FirebaseAuthAdapter.registerAccount({
        name: cleanName,
        email: cleanEmail,
        password: signUpPassword,
        role: signUpRole,
        departmentId: signUpRole === 'dept_admin' ? signUpDept : undefined,
      });

      setIsLoading(false);

      if (!res.ok || !res.createdAccount) {
        setErrorMessage(res.error || 'Could not create account.');
        return;
      }

      setRegisteredEmail(cleanEmail);
      setRegisteredAccount(res.createdAccount);
      setResendCooldown(60);

      // Transition to dedicated Email Verification screen
      setActiveTab('verify_email');
      setVerificationFeedback({
        type: 'info',
        text: t('auth.verifyEmailNotice'),
      });
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'An unexpected error occurred during account creation.');
    }
  };

  // 4. Handle Resend Verification Email
  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    setVerificationFeedback(null);

    try {
      const res = await FirebaseAuthAdapter.resendVerificationEmail();
      setIsLoading(false);
      if (res.ok) {
        setResendCooldown(60);
        setVerificationFeedback({
          type: 'success',
          text: res.message,
        });
      } else {
        setVerificationFeedback({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setIsLoading(false);
      setVerificationFeedback({
        type: 'error',
        text: err?.message || 'Failed to resend verification email.',
      });
    }
  };

  // 5. Handle Check Verification Status
  const handleCheckVerification = async () => {
    setIsLoading(true);
    setVerificationFeedback(null);

    try {
      const status = await FirebaseAuthAdapter.checkEmailVerification();
      setIsLoading(false);

      if (status.isVerified) {
        setVerificationFeedback({
          type: 'success',
          text: t('auth.verificationConfirmed'),
        });
      } else {
        setVerificationFeedback({
          type: 'info',
          text: t('auth.verificationPending'),
        });
      }
    } catch (err: any) {
      setIsLoading(false);
      setVerificationFeedback({
        type: 'error',
        text: err?.message || 'Unable to check verification status.',
      });
    }
  };

  // 6. Handle Continue to Portal from Verification
  const handleContinueToPortal = () => {
    if (registeredAccount) {
      onAuthenticated(registeredAccount, 'overview');
    } else {
      switchTab('signin');
    }
  };

  // 7. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setForgotMessage(null);

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await FirebaseAuthAdapter.requestPasswordReset(cleanEmail);
      setIsLoading(false);
      setForgotMessage(res.message);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Failed to request password reset.');
    }
  };

  // 8. Handle 1-Click Demo Entry
  const handle1ClickRoleEntry = async (role: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await LocalDemoAuthAdapter.loginWithDemoRole(role, accounts);
      if (res.ok && res.account) {
        const targetView: WorkspaceViewId =
          role === 'citizen'
            ? 'report_problem'
            : role === 'worker'
            ? 'worker_portal'
            : role === 'dept_admin'
            ? 'department_portal'
            : 'central_registry';
        onAuthenticated(res.account, targetView);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header Bar */}
      <header className="border-b border-slate-300 dark:border-slate-800 bg-slate-200/90 dark:bg-slate-900/90 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-teal-800 text-teal-50 border border-teal-700">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {t('app.name')}
              </span>
              <span className="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                Civic Resolution Platform
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block">
              {t('app.tagline')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
              aria-label="Select interface language"
            >
              <Globe className="h-4 w-4 text-teal-800 dark:text-teal-400" />
              <span className="font-mono text-xs text-teal-800 dark:text-teal-400 uppercase font-bold">
                {currentLangMeta.code}
              </span>
              <span className="hidden md:inline font-medium">{currentLangMeta.nativeName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </button>

            {isLangMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 w-64 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 max-h-96 overflow-y-auto">
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 mb-1">
                    {t('topbar.language')} ({SUPPORTED_LANGUAGES.length})
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {SUPPORTED_LANGUAGES.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setLang(item.code as LanguageCode);
                          setIsLangMenuOpen(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                          lang === item.code
                            ? 'bg-teal-800 text-teal-50 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                            {item.code}
                          </span>
                          <span>{item.nativeName}</span>
                        </span>
                        <span className="text-[10px] text-slate-500">{item.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
            className="p-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-400 transition-colors cursor-pointer"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {themeMode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800">
          {/* Navigation Bar: Two Primary Options (Sign In & Create Account) + Sample Roles */}
          <div className="grid grid-cols-3 border-b border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => switchTab('signin')}
              className={`py-3 px-2 text-center border-r border-slate-300 dark:border-slate-700 cursor-pointer transition-colors ${
                activeTab === 'signin'
                  ? 'bg-slate-50 dark:bg-slate-900 text-teal-900 dark:text-teal-300 font-bold border-b-2 border-b-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab('signup')}
              className={`py-3 px-2 text-center border-r border-slate-300 dark:border-slate-700 cursor-pointer transition-colors ${
                activeTab === 'signup'
                  ? 'bg-slate-50 dark:bg-slate-900 text-teal-900 dark:text-teal-300 font-bold border-b-2 border-b-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => switchTab('demo_roles')}
              className={`py-3 px-2 text-center cursor-pointer transition-colors ${
                activeTab === 'demo_roles'
                  ? 'bg-slate-50 dark:bg-slate-900 text-teal-900 dark:text-teal-300 font-bold border-b-2 border-b-teal-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Sample Roles
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Global Error Notice */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-rose-700 dark:text-rose-400 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Global Success Notice */}
            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-900 text-teal-800 dark:text-teal-200 text-xs flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-teal-400 mt-0.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {activeTab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Sign In to NEEDMAP AI
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Enter your registered email address and password to access your civic account.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="signin-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="signin-email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700"
                      placeholder="name@example.org"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="signin-password"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchTab('forgot')}
                      className="text-xs text-teal-800 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      {t('auth.forgotPassword')}?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={showSignInPassword ? 'text' : 'password'}
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700 pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      aria-label={showSignInPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showSignInPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="signin-remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 border-slate-300 dark:border-slate-700 text-teal-800 focus:ring-teal-700"
                  />
                  <label
                    htmlFor="signin-remember"
                    className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer"
                  >
                    {t('auth.rememberMe')}
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold border border-teal-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Globe className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                    <span>Sign In with Google</span>
                  </button>
                </div>

                {/* Switch to Sign Up */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('signup')}
                      className="text-teal-800 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                    {' or '}
                    <button
                      type="button"
                      onClick={() => switchTab('demo_roles')}
                      className="text-teal-800 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Explore Sample Roles
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* TAB 2: SIGN UP / CREATE ACCOUNT */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Create Account
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Register an official civic account to report problems, receive verified updates, and review resolution evidence.
                  </p>
                </div>

                {/* Full Name */}
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('auth.fullName')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    required
                    autoComplete="name"
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700"
                    placeholder="e.g. Maya Chen"
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('auth.emailAddress')} <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700"
                    placeholder="user@organization.org"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('auth.password')} <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignUpPassword ? 'text' : 'password'}
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      aria-describedby="password-requirements-card"
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700 pr-10"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      aria-label={showSignUpPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showSignUpPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* PASSWORD CREATION RULES (Always Visible Under Password Field) */}
                <div
                  id="password-requirements-card"
                  className="p-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {t('auth.passwordRequirements')}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        passwordEvaluation.allSatisfied
                          ? 'bg-teal-100 dark:bg-teal-950/60 border-teal-400 text-teal-800 dark:text-teal-200'
                          : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {passwordEvaluation.rules.filter((r) => r.satisfied).length}/
                      {passwordEvaluation.rules.length} Satisfied
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {passwordEvaluation.rules.map((rule) => {
                      const isMet = rule.satisfied;
                      return (
                        <li
                          key={rule.id}
                          className={`flex items-center justify-between text-xs transition-colors ${
                            isMet
                              ? 'text-teal-800 dark:text-teal-300 font-medium'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isMet ? (
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Circle
                                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>{t(rule.labelKey) || rule.defaultLabel}</span>
                          </div>
                          <span
                            className={`text-[10px] uppercase font-semibold ${
                              isMet
                                ? 'text-teal-800 dark:text-teal-300'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isMet ? t('auth.ruleSatisfied') : t('auth.ruleRequired')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('auth.confirmPassword')} <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className={`w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 focus:outline-none pr-10 ${
                        passwordsMismatch
                          ? 'border-rose-400 focus:border-rose-600'
                          : passwordsMatch
                          ? 'border-teal-600 focus:border-teal-700'
                          : 'border-slate-300 dark:border-slate-700 focus:border-teal-700'
                      }`}
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer p-0.5"
                      aria-label={
                        showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Password Match Confirmation Status */}
                  <div aria-live="polite" className="mt-1">
                    {passwordsMatch && (
                      <div className="flex items-center gap-1.5 text-xs text-teal-800 dark:text-teal-300 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                        <span>{t('auth.passwordsMatch')}</span>
                      </div>
                    )}
                    {passwordsMismatch && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <span>{t('auth.passwordsDoNotMatch')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Role Selection */}
                <div>
                  <label
                    htmlFor="signup-role"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('auth.selectRole')}
                  </label>
                  <select
                    id="signup-role"
                    value={signUpRole}
                    onChange={(e) => setSignUpRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700 cursor-pointer"
                  >
                    <option value="citizen">Citizen / Student (Standard Issue Reporter)</option>
                    <option value="worker">Maintenance / Field Worker</option>
                    <option value="dept_admin">Department Administrator</option>
                  </select>
                </div>

                {signUpRole === 'dept_admin' && (
                  <div>
                    <label
                      htmlFor="signup-dept"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Department Assignment
                    </label>
                    <select
                      id="signup-dept"
                      value={signUpDept}
                      onChange={(e) => setSignUpDept(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700 cursor-pointer"
                    >
                      <option value="DEPT-FAC">Facilities & Infrastructure</option>
                      <option value="DEPT-IT">IT & Network Operations</option>
                      <option value="DEPT-MUN">Municipal Public Works</option>
                      <option value="DEPT-ENV">Environmental & Sanitation</option>
                    </select>
                  </div>
                )}

                {/* Terms of Service Checkbox & Document Viewer Link */}
                <div className="pt-1">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id="signup-terms"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 border-slate-300 dark:border-slate-700 text-teal-800 focus:ring-teal-700"
                    />
                    <label
                      htmlFor="signup-terms"
                      className="text-xs text-slate-700 dark:text-slate-300 leading-snug cursor-pointer select-none"
                    >
                      {t('auth.acceptTerms')}{' '}
                      <button
                        type="button"
                        onClick={() => setIsTermsModalOpen(true)}
                        className="text-teal-800 dark:text-teal-400 font-semibold underline hover:text-teal-900 dark:hover:text-teal-200 cursor-pointer"
                      >
                        {t('auth.viewTerms')}
                      </button>
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isLoading || !isSignUpFormValid}
                    className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold border border-teal-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <span>{t('auth.createAccount')}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Globe className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                    <span>Sign Up with Google</span>
                  </button>
                </div>

                {/* Switch to Sign In */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('signin')}
                      className="text-teal-800 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </span>
                </div>
              </form>
            )}

            {/* TAB 3: EMAIL VERIFICATION SCREEN */}
            {activeTab === 'verify_email' && (
              <div className="space-y-4">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center bg-teal-100 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 mb-2">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {t('auth.verifyEmailTitle')}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    An official verification link has been sent to:
                  </p>
                  <p className="mt-1 font-mono text-xs font-bold text-teal-900 dark:text-teal-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 inline-block">
                    {registeredEmail || emailInput}
                  </p>
                </div>

                {verificationFeedback && (
                  <div
                    role="alert"
                    className={`p-3 text-xs flex items-start gap-2 border ${
                      verificationFeedback.type === 'success'
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-200'
                        : verificationFeedback.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                        : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                    }`}
                  >
                    {verificationFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-teal-700" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <span>{verificationFeedback.text}</span>
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  {/* Check Status */}
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold border border-teal-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{t('auth.checkVerification')}</span>
                  </button>

                  {/* Continue into portal */}
                  <button
                    type="button"
                    onClick={handleContinueToPortal}
                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{t('auth.continueToPortal')}</span>
                  </button>

                  {/* Resend Verification Email with Cooldown */}
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isLoading || resendCooldown > 0}
                    className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Mail className="w-4 h-4" />
                    <span>
                      {resendCooldown > 0
                        ? `Resend available in ${resendCooldown}s`
                        : t('auth.resendVerification')}
                    </span>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className="text-xs text-teal-800 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: FORGOT PASSWORD */}
            {activeTab === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {t('auth.resetPassword')}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {t('auth.forgotPasswordInstructions')}
                  </p>
                </div>

                {forgotMessage && (
                  <div
                    role="status"
                    className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-900 text-teal-800 dark:text-teal-200 text-xs flex items-start gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-teal-700 dark:text-teal-400 mt-0.5 shrink-0" />
                    <span>{forgotMessage}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    {t('auth.emailAddress')}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full text-xs px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-700"
                    placeholder="user@organization.org"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold border border-teal-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <span>{t('auth.sendResetLink')}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => switchTab('signin')}
                    className="py-2.5 px-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: DEMO / SAMPLE ROLES */}
            {activeTab === 'demo_roles' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      Sample Role Personas
                    </h2>
                    <span className="text-[11px] font-mono uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 border border-slate-300 dark:border-slate-700">
                      1-Click Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Explore different portal workflows instantly without creating a new personal Firebase account.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handle1ClickRoleEntry('citizen')}
                    className="p-3 text-left border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                      <User className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                      <span>Citizen / Student</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Submit problems, track case updates, review evidence, and rate satisfaction.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handle1ClickRoleEntry('worker')}
                    className="p-3 text-left border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                      <HardHat className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                      <span>Maintenance Worker</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Accept assigned work orders, update repair progress, and upload resolution photos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handle1ClickRoleEntry('dept_admin')}
                    className="p-3 text-left border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                      <Building2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <span>Department Admin</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Manage department queue, assign field staff, review SLAs, and reassign tasks.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handle1ClickRoleEntry('platform_admin')}
                    className="p-3 text-left border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100">
                      <Shield className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                      <span>Central Administrator</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      Full cross-department registry, priority overrides, job postings, and reports.
                    </p>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Ready to sign in with your personal account?{' '}
                    <button
                      type="button"
                      onClick={() => switchTab('signin')}
                      className="text-teal-800 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                    {' or '}
                    <button
                      type="button"
                      onClick={() => switchTab('signup')}
                      className="text-teal-800 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Create Account
                    </button>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Accessible Terms of Service Modal Dialog */}
      {isTermsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                <h3
                  id="terms-dialog-title"
                  className="text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  {t('auth.termsTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed max-h-72 overflow-y-auto pr-1">
              <p>
                <strong>1. Open Civic Data:</strong> NEEDMAP AI is designed for transparent community problem resolution. Reports, photographic evidence, and geographic coordinates submitted are recorded in the public registry for municipal and campus accountability.
              </p>
              <p>
                <strong>2. Privacy and Confidentiality:</strong> Do not include private personal numbers, government IDs, banking information, or passwords in report titles or descriptions. Account email addresses are protected and used solely for resolution status notifications.
              </p>
              <p>
                <strong>3. Honest Reporting:</strong> Submitting false, abusive, or duplicate reports deliberately disrupts public service dispatch. Administrators reserve the right to flag or deactivate accounts that abuse the reporting mechanism.
              </p>
              <p>
                <strong>4. Security:</strong> All authentication tokens and sessions are safeguarded via Firebase Authentication. Passwords must satisfy strict security complexity requirements.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setIsTermsModalOpen(false);
                }}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-teal-50 text-xs font-semibold border border-teal-700 cursor-pointer"
              >
                I Understand &amp; Accept
              </button>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-300 dark:border-slate-800 bg-slate-200/80 dark:bg-slate-900/80 px-4 py-3 text-center text-xs text-slate-600 dark:text-slate-400">
        <span>NEEDMAP AI : Public Issue Reporting and Evidence-Backed Resolution Platform.</span>
      </footer>
    </div>
  );
};
