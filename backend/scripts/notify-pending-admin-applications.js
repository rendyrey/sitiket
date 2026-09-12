import "dotenv/config";
import { db } from "../src/config/db.js";
import * as adminApplicationsRepository from "../src/repositories/admin-applications-repository.js";
import * as usersRepository from "../src/repositories/users-repository.js";
import { notifyApplicationPending } from "../src/services/admin-application-service.js";

/**
 * One-off backfill: sends the "your application is pending review" bell +
 * email notice (added after these applications were submitted) to every
 * account with a still-pending admin/organizer application.
 *
 * Usage: npm run notify:pending-admin-applications
 */
const { rows: pending } = await adminApplicationsRepository.list({ status: "pending", pageSize: 1000 });

try {
  for (const application of pending) {
    const applicant = await usersRepository.findById(application.user_id);
    if (!applicant) {
      console.warn(`Skipping application ${application.id}: user ${application.user_id} not found.`);
      continue;
    }
    await notifyApplicationPending(application, applicant);
    console.log(`Notified ${applicant.email} (application ${application.id}).`);
  }
  console.log(`Done. ${pending.length} pending application(s) notified.`);
} finally {
  await db.destroy();
}
