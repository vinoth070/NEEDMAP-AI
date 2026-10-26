/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  ComplaintRecord,
  JobApplication,
  JobVacancy,
  UserAccount,
  AppNotification,
} from '../types/needmap';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with firestoreDatabaseId (MANDATORY per skill specification)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Error handling types required by skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('[NEEDMAP Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per skill specification
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[NEEDMAP Firestore] Client offline. Operating with cache/local store.');
      return false;
    }
    // Test doc not existing is fine as long as connection reached the server
    return true;
  }
}

// User Profiles
export async function syncUserProfile(user: User, defaultRole: 'citizen' | 'worker' | 'dept_admin' | 'platform_admin' = 'citizen'): Promise<UserAccount> {
  const userDocRef = doc(db, 'users', user.uid);
  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data() as Partial<UserAccount>;
      return {
        id: user.uid,
        name: data.name || user.displayName || 'Citizen',
        email: user.email || '',
        role: data.role || (user.email === 'kalikalivino17@gmail.com' ? 'platform_admin' : defaultRole),
        departmentId: data.departmentId,
        workerProfileId: data.workerProfileId,
        phone: data.phone,
        preferredLanguage: data.preferredLanguage,
      };
    } else {
      const isPlatformAdmin = user.email === 'kalikalivino17@gmail.com';
      const newProfile: UserAccount = {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Community Member',
        email: user.email || '',
        role: isPlatformAdmin ? 'platform_admin' : defaultRole,
        preferredLanguage: 'en',
      };
      await setDoc(userDocRef, {
        ...newProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return newProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Complaints
export async function saveComplaintToFirestore(complaint: ComplaintRecord): Promise<void> {
  const path = `complaints/${complaint.id}`;
  try {
    await setDoc(doc(db, 'complaints', complaint.id), {
      ...complaint,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateComplaintInFirestore(
  complaintId: string,
  updates: Partial<ComplaintRecord>
): Promise<void> {
  const path = `complaints/${complaintId}`;
  try {
    await updateDoc(doc(db, 'complaints', complaintId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function fetchComplaintsFromFirestore(): Promise<ComplaintRecord[]> {
  const path = 'complaints';
  try {
    const snap = await getDocs(query(collection(db, 'complaints'), limit(200)));
    return snap.docs.map((d) => d.data() as ComplaintRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Vacancies & Job Applications
export async function fetchVacanciesFromFirestore(): Promise<JobVacancy[]> {
  const path = 'vacancies';
  try {
    const snap = await getDocs(query(collection(db, 'vacancies'), limit(50)));
    return snap.docs.map((d) => d.data() as JobVacancy);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveJobApplicationToFirestore(app: JobApplication): Promise<void> {
  const path = `jobApplications/${app.id}`;
  try {
    await setDoc(doc(db, 'jobApplications', app.id), {
      ...app,
      submittedAt: app.submittedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Realtime Complaint Subscription with Error Handler
export function subscribeToComplaints(
  onUpdate: (complaints: ComplaintRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'complaints';
  return onSnapshot(
    collection(db, 'complaints'),
    (snapshot) => {
      const records = snapshot.docs.map((d) => d.data() as ComplaintRecord);
      onUpdate(records);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

// Realtime User Notifications Subscription
export function subscribeToUserNotifications(
  userId: string,
  onUpdate: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = 'notifications';
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(30)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as AppNotification);
      onUpdate(list);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

// Auth Helpers
export async function sendUserPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function sendUserEmailVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function reloadCurrentUser(): Promise<User | null> {
  if (auth.currentUser) {
    await auth.currentUser.reload();
    return auth.currentUser;
  }
  return null;
}

export async function setAuthPersistence(rememberMe: boolean): Promise<void> {
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
  } catch (err) {
    console.warn('[Firebase Persistence Notice]:', err);
  }
}

export async function updateUserProfileName(user: User, displayName: string): Promise<void> {
  await updateProfile(user, { displayName });
}

export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
};

