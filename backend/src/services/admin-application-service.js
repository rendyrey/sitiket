import { db } from "../config/db.js";
import { env } from "../config/env.js";
import * as adminApplicationsRepository from "../repositories/admin-applications-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import {
  notifyAdminApplicationDecision,
  notifyAdminApplicationReceived,
  notifyAdminApplicationSubmitted,
} from "./notification-service.js";
import { pushNotification } from "./web-notification-service.js";
import { conflict, notFound } from "../utils/http-error.js";

/**
 * Submits a new Admin (event owner) application for the current user.
 * Requires Super Admin approval before the account can create events — see
 * docs/business/SYSTEM_OVERVIEW.md §3.
 * @param {string} userId
 * @param {{ businessName: string, businessDescription?: string, contactPhone: string }} input
 */
export const apply = async (userId, input) => {
  const user = await usersRepository.findById(userId);
  if (user.role !== "user") {
    throw conflict("ALREADY_ELEVATED", `Account already has role "${user.role}"`);
  }

  const existingPending = await adminApplicationsRepository.findPendingByUserId(userId);
  if (existingPending) {
    throw conflict("APPLICATION_PENDING", "A pending application already exists for this account");
  }

  const application = await adminApplicationsRepository.create({ userId, ...input });
  await notifyAdminApplicationSubmitted(application, user);
  await notifyApplicationPending(application, user);
  return application;
};

/**
 * Applicant-facing "still in progress" notice — bell + email — sent when an
 * application is created, and reused by the one-off backfill script for
 * applications that predate this notice.
 * @param {object} application - an `admin_applications` row
 * @param {object} applicant - the applying user's row
 */
export const notifyApplicationPending = async (application, applicant) => {
  await pushNotification({
    userId: applicant.id,
    type: "admin_application_pending",
    title: "Application submitted",
    body: "Your organizer application is being reviewed. Need a faster answer? Tap here to message us on WhatsApp.",
    href: env.ADMIN_SUPPORT_WHATSAPP_URL,
  });
  await notifyAdminApplicationReceived(application, applicant);
};

/** @param {{ status?: "pending" | "approved" | "rejected", page?: number, pageSize?: number }} filters */
export const list = (filters) => adminApplicationsRepository.list(filters);

/**
 * @param {string} applicationId
 * @param {string} reviewerId - must be a super_admin (enforced at the route via requireRole)
 * @param {string} [reviewNotes]
 */
export const approve = async (applicationId, reviewerId, reviewNotes) => {
  const application = await adminApplicationsRepository.findById(applicationId);
  if (!application) throw notFound("APPLICATION_NOT_FOUND", "Admin application not found");
  if (application.status !== "pending") {
    throw conflict("APPLICATION_ALREADY_DECIDED", `Application is already "${application.status}"`);
  }

  await db.transaction(async (trx) => {
    await adminApplicationsRepository.decide(applicationId, { status: "approved", reviewedBy: reviewerId, reviewNotes }, trx);
    await usersRepository.updateRole(application.user_id, "admin", trx);
  });

  const decided = await adminApplicationsRepository.findById(applicationId);
  const applicant = await usersRepository.findById(application.user_id);
  await notifyAdminApplicationDecision(decided, applicant, "approved");
  return decided;
};

/**
 * @param {string} applicationId
 * @param {string} reviewerId
 * @param {string} [reviewNotes]
 */
export const reject = async (applicationId, reviewerId, reviewNotes) => {
  const application = await adminApplicationsRepository.findById(applicationId);
  if (!application) throw notFound("APPLICATION_NOT_FOUND", "Admin application not found");
  if (application.status !== "pending") {
    throw conflict("APPLICATION_ALREADY_DECIDED", `Application is already "${application.status}"`);
  }

  await adminApplicationsRepository.decide(applicationId, { status: "rejected", reviewedBy: reviewerId, reviewNotes });

  const decided = await adminApplicationsRepository.findById(applicationId);
  const applicant = await usersRepository.findById(application.user_id);
  await notifyAdminApplicationDecision(decided, applicant, "rejected");
  return decided;
};
