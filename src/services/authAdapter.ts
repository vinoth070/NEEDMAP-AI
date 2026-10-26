/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEMO_ACCOUNTS } from '../data/platformDemoData';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendUserPasswordReset,
  sendUserEmailVerification,
  reloadCurrentUser,
  setAuthPersistence,
  updateUserProfileName,
  signInWithGooglePopup,
  syncUserProfile,
} from './firebase';
import type { UserAccount, UserRole } from '../types/needmap';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
  workerProfileId?: string;
  phone?: string;
  emailVerified?: boolean;
  isDemo: boolean;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  provider: 'local_demo' | 'firebase' | 'oauth';
  expiresAt: string;
}

export interface PasswordRuleCheck {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';
  labelKey: string;
  defaultLabel: string;
  satisfied: boolean;
}

export function evaluatePasswordStrength(password: string): {
  rules: PasswordRuleCheck[];
  allSatisfied: boolean;
} {
  const rules: PasswordRuleCheck[] = [
    {
      id: 'length',
      labelKey: 'auth.pwdRuleLength',
      defaultLabel: 'At least 8 characters',
      satisfied: password.length >= 8,
    },
    {
      id: 'uppercase',
      labelKey: 'auth.pwdRuleUppercase',
      defaultLabel: 'At least one uppercase letter (A-Z)',
      satisfied: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      labelKey: 'auth.pwdRuleLowercase',
      defaultLabel: 'At least one lowercase letter (a-z)',
      satisfied: /[a-z]/.test(password),
    },
    {
      id: 'number',
      labelKey: 'auth.pwdRuleNumber',
      defaultLabel: 'At least one number (0-9)',
      satisfied: /[0-9]/.test(password),
    },
    {
      id: 'special',
      labelKey: 'auth.pwdRuleSpecial',
      defaultLabel: 'At least one special character, such as ! @ # $ %',
      satisfied: /[!@#$%^&*(),.?":{}|<>\-_=+[\]\\/~;`']/.test(password),
    },
  ];

  return {
    rules,
    allSatisfied: rules.every((r) => r.satisfied),
  };
}

const AUTH_STORAGE_KEY = 'needmap_ai_session_v1';

export interface AuthAdapterInterface {
  getCurrentSession(): AuthSession | null;
  loginWithCredentials(
    usernameOrEmail: string,
    password: string,
    accountsList?: UserAccount[]
  ): Promise<{ ok: boolean; session?: AuthSession; account?: UserAccount; error?: string }>;
  loginWithDemoRole(
    role: UserRole,
    accountsList?: UserAccount[]
  ): Promise<{ ok: boolean; session?: AuthSession; account?: UserAccount; error?: string }>;
  registerAccount(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    departmentId?: string;
  }): Promise<{ ok: boolean; session?: AuthSession; createdAccount?: UserAccount; error?: string }>;
  requestPasswordReset(
    email: string
  ): Promise<{ ok: boolean; message: string; isSimulated: boolean }>;
  logout(): Promise<void>;
  getIntegrationInfo(): {
    provider: string;
    isProductionBackend: boolean;
    instructions: string;
  };
}

/**
 * Real Firebase Authentication Adapter
 * Connects directly to Google Cloud Identity Platform / Firebase Auth and Firestore profiles.
 */
export const FirebaseAuthAdapter = {
  async loginWithEmailPassword(
    email: string,
    pass: string,
    rememberMe = true
  ): Promise<{ ok: boolean; session?: AuthSession; account?: UserAccount; error?: string }> {
    try {
      const cleanEmail = email.trim();
      const cleanPass = pass.trim();
      if (!cleanEmail || !cleanPass) {
        return { ok: false, error: 'Email and password are required.' };
      }

      await setAuthPersistence(rememberMe);
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const userProfile = await syncUserProfile(cred.user);

      const session: AuthSession = {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          departmentId: userProfile.departmentId,
          workerProfileId: userProfile.workerProfileId,
          phone: userProfile.phone,
          emailVerified: cred.user.emailVerified,
          isDemo: false,
        },
        token: await cred.user.getIdToken(),
        provider: 'firebase',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }

      return { ok: true, session, account: userProfile };
    } catch (err: any) {
      let message = 'Failed to sign in. Please verify your credentials.';
      if (
        err?.code === 'auth/invalid-credential' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/user-not-found'
      ) {
        message = 'Invalid email address or password. Please verify and try again.';
      } else if (err?.code === 'auth/invalid-email') {
        message = 'The email address format is not valid.';
      } else if (err?.code === 'auth/user-disabled') {
        message = 'This account has been disabled by an administrator.';
      } else if (err?.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please wait a few moments before trying again.';
      } else if (err?.code === 'auth/network-request-failed') {
        message = 'Network error: could not connect to Firebase. Check your internet connection.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      return { ok: false, error: message };
    }
  },

  async loginWithGoogle(
    rememberMe = true
  ): Promise<{ ok: boolean; session?: AuthSession; account?: UserAccount; error?: string }> {
    try {
      await setAuthPersistence(rememberMe);
      const user = await signInWithGooglePopup();
      const userProfile = await syncUserProfile(user);

      const session: AuthSession = {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          departmentId: userProfile.departmentId,
          workerProfileId: userProfile.workerProfileId,
          phone: userProfile.phone,
          emailVerified: user.emailVerified,
          isDemo: false,
        },
        token: await user.getIdToken(),
        provider: 'firebase',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }

      return { ok: true, session, account: userProfile };
    } catch (err: any) {
      let message = 'Google sign-in could not be completed.';
      if (err?.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in window was closed before completion.';
      } else if (err?.code === 'auth/popup-blocked') {
        message = 'Sign-in popup was blocked by browser. Please enable popups for this site.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      return { ok: false, error: message };
    }
  },

  async registerAccount(data: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    departmentId?: string;
  }): Promise<{
    ok: boolean;
    session?: AuthSession;
    createdAccount?: UserAccount;
    emailSent?: boolean;
    error?: string;
  }> {
    try {
      const cleanEmail = data.email.trim();
      const cleanPass = data.password.trim();
      const cleanName = data.name.trim();

      if (!cleanName) {
        return { ok: false, error: 'Full name is required.' };
      }
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return { ok: false, error: 'A valid email address is required.' };
      }

      const strength = evaluatePasswordStrength(cleanPass);
      if (!strength.allSatisfied) {
        return { ok: false, error: 'Password does not meet all required security rules.' };
      }

      // Create user account in Firebase Authentication
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);

      // Set user's display name
      try {
        await updateUserProfileName(cred.user, cleanName);
      } catch (err) {
        console.warn('[Firebase displayName update]:', err);
      }

      // Send Firebase Email Verification
      let emailSent = false;
      try {
        await sendUserEmailVerification(cred.user);
        emailSent = true;
      } catch (err) {
        console.warn('[Firebase email verification notice]:', err);
      }

      // Create user profile in Cloud Firestore
      const userProfile = await syncUserProfile(cred.user, data.role);

      const session: AuthSession = {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: cleanName,
          role: userProfile.role,
          departmentId: data.departmentId,
          emailVerified: cred.user.emailVerified,
          isDemo: false,
        },
        token: await cred.user.getIdToken(),
        provider: 'firebase',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }

      return { ok: true, session, createdAccount: userProfile, emailSent };
    } catch (err: any) {
      let message = 'Could not register account.';
      if (err?.code === 'auth/email-already-in-use') {
        message = 'An account already exists with this email address. Please sign in instead.';
      } else if (err?.code === 'auth/invalid-email') {
        message = 'The email address format is not valid.';
      } else if (err?.code === 'auth/weak-password') {
        message = 'Password is too weak. Please satisfy all password requirements below.';
      } else if (err?.code === 'auth/network-request-failed') {
        message = 'Network error: could not connect to Firebase Authentication.';
      } else if (err instanceof Error) {
        message = err.message;
      }
      return { ok: false, error: message };
    }
  },

  async resendVerificationEmail(): Promise<{ ok: boolean; message: string }> {
    if (!auth.currentUser) {
      return { ok: false, message: 'No active user session to send verification email.' };
    }
    try {
      await sendUserEmailVerification(auth.currentUser);
      return {
        ok: true,
        message: 'Verification email has been sent. Please check your inbox and spam folder.',
      };
    } catch (err: any) {
      let msg = 'Could not send verification email.';
      if (err?.code === 'auth/too-many-requests') {
        msg = 'Too many requests. Please wait a minute before requesting another email.';
      } else if (err instanceof Error) {
        msg = err.message;
      }
      return { ok: false, message: msg };
    }
  },

  async checkEmailVerification(): Promise<{ isVerified: boolean; email?: string }> {
    try {
      const refreshed = await reloadCurrentUser();
      return {
        isVerified: Boolean(refreshed?.emailVerified),
        email: refreshed?.email || undefined,
      };
    } catch {
      return {
        isVerified: Boolean(auth.currentUser?.emailVerified),
        email: auth.currentUser?.email || undefined,
      };
    }
  },

  async requestPasswordReset(
    email: string
  ): Promise<{ ok: boolean; message: string; isSimulated: boolean }> {
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, message: 'Please enter a valid email address.', isSimulated: false };
    }

    try {
      await sendUserPasswordReset(cleanEmail);
      // Neutral message per security best practices
      return {
        ok: true,
        message:
          'If an account exists with this email address, a password reset link has been sent. Please check your inbox and spam folder.',
        isSimulated: false,
      };
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        // Return neutral success message to avoid user enumeration
        return {
          ok: true,
          message:
            'If an account exists with this email address, a password reset link has been sent. Please check your inbox and spam folder.',
          isSimulated: false,
        };
      }
      let msg = 'Could not send reset email.';
      if (err?.code === 'auth/too-many-requests') {
        msg = 'Too many reset requests. Please wait a moment before trying again.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/network-request-failed') {
        msg = 'Network error: please check your internet connection.';
      } else if (err instanceof Error) {
        msg = err.message;
      }
      return { ok: false, message: msg, isSimulated: false };
    }
  },

  async logout(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  },
};

/**
 * Local Demo Auth Adapter (Preserved for sample explore / offline mode)
 */
export const LocalDemoAuthAdapter: AuthAdapterInterface = {
  getCurrentSession(): AuthSession | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed: AuthSession = JSON.parse(raw);
      if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  async loginWithCredentials(
    usernameOrEmail: string,
    password: string,
    accountsList?: UserAccount[]
  ) {
    const list = accountsList || DEMO_ACCOUNTS;
    const cleanUser = usernameOrEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return { ok: false, error: 'Please enter both username/email and password.' };
    }

    const matched = list.find(
      (acc) =>
        (acc.username?.toLowerCase() === cleanUser || acc.email.toLowerCase() === cleanUser) &&
        (acc.password === cleanPass || cleanPass === 'demo123')
    );

    if (!matched) {
      return {
        ok: false,
        error:
          'Invalid username or password. Check the credentials displayed above (e.g., citizen.demo / demo123), or use Firebase Sign In.',
      };
    }

    const session: AuthSession = {
      user: {
        id: matched.id,
        email: matched.email,
        name: matched.name,
        role: matched.role,
        departmentId: matched.departmentId,
        workerProfileId: matched.workerProfileId,
        phone: matched.phone,
        isDemo: true,
      },
      token: `demo-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: 'local_demo',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Ignore storage write error
    }

    return { ok: true, session, account: matched };
  },

  async loginWithDemoRole(role: UserRole, accountsList?: UserAccount[]) {
    const list = accountsList || DEMO_ACCOUNTS;
    const matched = list.find((acc) => acc.role === role) || list[0];

    const session: AuthSession = {
      user: {
        id: matched.id,
        email: matched.email,
        name: matched.name,
        role: matched.role,
        departmentId: matched.departmentId,
        workerProfileId: matched.workerProfileId,
        phone: matched.phone,
        isDemo: true,
      },
      token: `demo-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: 'local_demo',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Ignore storage error
    }

    return { ok: true, session, account: matched };
  },

  async registerAccount(data) {
    if (!data.name.trim() || !data.email.trim() || !data.password.trim()) {
      return { ok: false, error: 'Full name, email, and password are required.' };
    }

    const createdId = `ACC-DEMO-${Date.now().toString().slice(-4)}`;
    const createdAccount: UserAccount = {
      id: createdId,
      name: data.name.trim(),
      email: data.email.trim(),
      username: data.email.split('@')[0] || `user.${Date.now()}`,
      password: data.password,
      role: data.role,
      departmentId: data.departmentId,
      isDemoAccount: true,
      portalTitle:
        data.role === 'citizen'
          ? 'Citizen / Student Portal'
          : data.role === 'worker'
          ? 'Worker Portal'
          : data.role === 'dept_admin'
          ? 'Department Admin Portal'
          : 'Central Admin Portal',
    };

    const session: AuthSession = {
      user: {
        id: createdAccount.id,
        email: createdAccount.email,
        name: createdAccount.name,
        role: createdAccount.role,
        departmentId: createdAccount.departmentId,
        isDemo: true,
      },
      token: `demo-token-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      provider: 'local_demo',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }
    } catch {
      // Ignore storage error
    }

    return { ok: true, session, createdAccount };
  },

  async requestPasswordReset(email: string) {
    if (!email.trim() || !email.includes('@')) {
      return { ok: false, message: 'Please enter a valid email address.', isSimulated: true };
    }
    return {
      ok: true,
      message:
        'Demo Mode Notice: For demo test accounts, use the predefined credentials on the sign-in screen (e.g. citizen.demo / demo123). Or switch to Firebase Auth for live email reset.',
      isSimulated: true,
    };
  },

  async logout() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  },

  getIntegrationInfo() {
    return {
      provider: 'Local Demo (LocalStorage)',
      isProductionBackend: false,
      instructions: 'Production Firebase Authentication is active alongside demo accounts.',
    };
  },
};
