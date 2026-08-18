import { conflict } from "../utils/http-error.js";
import {
  resolveForEvent as resolveBankAccountForEvent,
  resolveAllForEvent as resolveAllBankAccountsForEvent,
} from "./bank-account-service.js";
import { resolveForEvent as resolveQrisForEvent } from "./qris-config-service.js";

/**
 * Resolves every way a buyer can pay for an event: the organizer's payout
 * bank accounts (plus which one is recommended) and, when the event opted in,
 * the organizer's QRIS code. Either method alone is enough to sell tickets —
 * throws only when NEITHER is available. Shared by order creation, payment
 * instructions, and proof submission so all three always agree.
 * @param {{ owner_id: string, bank_account_id: string | null, qris_enabled: number | boolean }} event
 * @returns {Promise<{ recommendedBankAccount: object | null, bankAccounts: object[], qrisConfig: object | null }>}
 */
export const resolvePaymentOptionsForEvent = async (event) => {
  let recommendedBankAccount = null;
  let bankAccounts = [];
  try {
    [recommendedBankAccount, bankAccounts] = await Promise.all([
      resolveBankAccountForEvent(event),
      resolveAllBankAccountsForEvent(event),
    ]);
  } catch (error) {
    if (error?.code !== "EVENT_OWNER_NO_BANK_ACCOUNT") throw error;
  }

  const qrisConfig = await resolveQrisForEvent(event);

  if (!recommendedBankAccount && !qrisConfig) {
    throw conflict("EVENT_NO_PAYMENT_METHOD", "This event's organizer has not set up a payment method yet");
  }

  return { recommendedBankAccount, bankAccounts, qrisConfig };
};
