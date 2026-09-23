import * as usersRepository from "../repositories/users-repository.js";
import { toWhatsappId } from "../utils/phone.js";

// Who is chatting on a phone-identified channel (WhatsApp sender id, or the
// contact a Telegram user shared — both vouched for by the platform), from
// the SiTIKET accounts whose profile phone is that number.

/**
 * - role: super_admin > admin > buyer;
 * - account: the account merch orders/address updates act on — the staff
 *   account when there is one, else the single matching account. Several
 *   plain accounts sharing one number are ambiguous, so none is used.
 *
 * @param {string} phone - digits with country code. Example: `"628112003717"`
 * @returns {Promise<{ role: "buyer" | "admin" | "super_admin", staff?: object, account?: object, duplicateAccounts: boolean }>}
 */
export const resolveSender = async (phone) => {
  // SQL narrows by stripped phone; toWhatsappId is the exact check.
  const accounts = (await usersRepository.findActiveByWhatsappId(phone)).filter((user) => toWhatsappId(user.phone) === phone);
  const staff = accounts.find((user) => user.role === "super_admin") ?? accounts.find((user) => user.role === "admin");
  const account = staff ?? (accounts.length === 1 ? accounts[0] : undefined);
  return { role: staff?.role ?? "buyer", staff, account, duplicateAccounts: !account && accounts.length > 1 };
};
