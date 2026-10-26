import type {
  ComplaintRecord,
  ComplaintStatus,
  UserAccount,
  UserRole,
} from '../types/needmap';

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
}

export function isStaffRole(role: UserRole): boolean {
  return role === 'dept_admin' || role === 'platform_admin';
}

/**
 * Determines whether the acting user is permitted to inspect private reporter contact fields
 * and staff-only attachments on a complaint.
 * Note: Anonymous complaints never expose private reporter identity to anyone.
 */
export function canViewPrivateComplaintDetails(
  actor: UserAccount,
  complaint: ComplaintRecord
): boolean {
  if (actor.id === complaint.reporterAccountId) {
    return true;
  }
  if (actor.role === 'platform_admin') {
    return true;
  }
  if (
    actor.role === 'dept_admin' &&
    (!actor.departmentId || actor.departmentId === complaint.assignedDepartmentId)
  ) {
    return true;
  }
  if (
    actor.role === 'worker' &&
    actor.workerProfileId &&
    actor.workerProfileId === complaint.assignedWorkerId
  ) {
    return true;
  }
  return false;
}

/**
 * Returns a privacy-safe projection of a complaint for the current viewer, stripping private
 * contact details and non-public attachments when the viewer is not authorized, and always
 * protecting anonymous reporters.
 */
export function sanitizeComplaintForViewer(
  actor: UserAccount,
  complaint: ComplaintRecord
): ComplaintRecord {
  const canViewPrivate = canViewPrivateComplaintDetails(actor, complaint);
  const isOwner = actor.id === complaint.reporterAccountId;

  const hideReporterIdentity = complaint.isAnonymous && !isOwner;

  return {
    ...complaint,
    reporterDisplayName: complaint.isAnonymous
      ? 'Anonymous Citizen'
      : complaint.reporterDisplayName,
    privateContactName:
      canViewPrivate && !hideReporterIdentity ? complaint.privateContactName : undefined,
    privateContactEmail:
      canViewPrivate && !hideReporterIdentity ? complaint.privateContactEmail : undefined,
    privateContactPhone:
      canViewPrivate && !hideReporterIdentity ? complaint.privateContactPhone : undefined,
    attachments: complaint.attachments.filter(
      (att) => att.visibility === 'public_summary' || canViewPrivate
    ),
    timeline: complaint.timeline.filter((ev) => ev.isPublic || canViewPrivate),
  };
}

/**
 * Enforces role-based and ownership-based state transition rules in the application data layer
 * (never relying on hidden UI buttons alone).
 */
export function authorizeComplaintStatusChange(params: {
  actor: UserAccount;
  complaint: ComplaintRecord;
  nextStatus: ComplaintStatus;
  note?: string;
}): AuthorizationResult {
  const { actor, complaint, nextStatus, note } = params;
  const isOwner = actor.id === complaint.reporterAccountId;

  // 1. Citizen Rules
  if (actor.role === 'citizen') {
    if (!isOwner) {
      return {
        allowed: false,
        reason: 'Citizens can only update or respond to their own submitted complaints.',
      };
    }

    if (nextStatus === 'cancelled') {
      if (complaint.status === 'submitted' || complaint.status === 'under_review' || complaint.status === 'more_info_required') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Complaints already in active field work or resolved cannot be cancelled directly.',
      };
    }

    if (nextStatus === 'closed') {
      if (complaint.status === 'resolved_awaiting_confirmation') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Only complaints marked "Resolved — Awaiting User Confirmation" can be confirmed closed by the reporter.',
      };
    }

    if (nextStatus === 'reopened') {
      if (
        complaint.status === 'resolved_awaiting_confirmation' ||
        complaint.status === 'closed'
      ) {
        if (!note || note.trim().length < 5) {
          return {
            allowed: false,
            reason: 'Please explain what remains unresolved (at least 5 characters) to reopen this complaint.',
          };
        }
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Only resolved or closed complaints can be reopened.',
      };
    }

    return {
      allowed: false,
      reason: 'Citizen accounts cannot assign workers, mark complaints resolved, or perform administrative status changes.',
    };
  }

  // 2. Field Worker Rules
  if (actor.role === 'worker') {
    const isAssignedWorker =
      Boolean(actor.workerProfileId) &&
      actor.workerProfileId === complaint.assignedWorkerId;

    if (!isAssignedWorker) {
      return {
        allowed: false,
        reason: 'Field workers can only update tasks explicitly assigned to them.',
      };
    }

    const allowedWorkerStatuses: ComplaintStatus[] = [
      'accepted',
      'in_progress',
      'more_info_required',
      'resolved_awaiting_confirmation',
    ];

    if (!allowedWorkerStatuses.includes(nextStatus)) {
      return {
        allowed: false,
        reason:
          'Field workers can mark assigned tasks Accepted, In Progress, More Info Required, or Resolved (Awaiting Citizen Confirmation), but cannot close or reject complaints unilaterally.',
      };
    }

    if (nextStatus === 'resolved_awaiting_confirmation' && (!note || note.trim().length < 8)) {
      return {
        allowed: false,
        reason: 'Please provide clear resolution notes (at least 8 characters) before marking the task resolved.',
      };
    }

    return { allowed: true };
  }

  // 3. Department Admin & Platform Admin Rules
  if (actor.role === 'dept_admin' || actor.role === 'platform_admin') {
    if (nextStatus === 'rejected' && (!note || note.trim().length < 8)) {
      return {
        allowed: false,
        reason: 'Rejecting a complaint requires a clear, recorded reason (at least 8 characters).',
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unauthorized role.' };
}

export function authorizePriorityOverride(
  actor: UserAccount,
  reason: string
): AuthorizationResult {
  if (!isStaffRole(actor.role)) {
    return {
      allowed: false,
      reason: 'Only Department Admins and Platform Admins may override official priority tiers.',
    };
  }
  if (!reason || reason.trim().length < 8) {
    return {
      allowed: false,
      reason: 'Priority override requires an explicit justification (at least 8 characters) for audit transparency.',
    };
  }
  return { allowed: true };
}

export function authorizeDepartmentManagement(actor: UserAccount): AuthorizationResult {
  if (!isStaffRole(actor.role)) {
    return {
      allowed: false,
      reason: 'Only authorized Department or Platform Administrators can modify routing, assignments, or vacancies.',
    };
  }
  return { allowed: true };
}
