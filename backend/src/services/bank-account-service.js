import * as bankAccountsRepository from "../repositories/bank-accounts-repository.js";
import { conflict, forbidden, notFound } from "../utils/http-error.js";

/** @param {string} ownerId - always the calling admin's own id */
export const list = (ownerId) => bankAccountsRepository.listByOwner(ownerId);

/**
 * @param {string} ownerId
 * @param {{ bankName: string, accountNumber: string, accountHolderName: string, isDefault?: boolean }} input
 */
export const create = async (ownerId, input) => {
  const existing = await bankAccountsRepository.listByOwner(ownerId);
  // The very first account must be usable as a payout destination immediately.
  const isDefault = existing.length === 0 ? true : Boolean(input.isDefault);
  return bankAccountsRepository.create({ ownerId, ...input, isDefault });
};

/**
 * @param {string} id
 * @param {{ sub: string, role: string }} requester
 * @param {{ bankName?: string, accountNumber?: string, accountHolderName?: string, isDefault?: boolean }} patch
 */
export const update = async (id, requester, patch) => {
  const account = await bankAccountsRepository.findById(id);
  if (!account) throw notFound("BANK_ACCOUNT_NOT_FOUND", "Bank account not found");
  if (account.owner_id !== requester.sub && requester.role !== "super_admin") {
    throw forbidden("NOT_ACCOUNT_OWNER", "Only the account owner can update it");
  }

  return bankAccountsRepository.update(id, account.owner_id, patch);
};

/**
 * Resolves the payout account a buyer should transfer to for an event: the
 * event's explicit override, or its owner's default account. Shared by
 * order creation and payment-proof submission so both always agree. An
 * override that points at an account the owner has since hidden from ticket
 * checkout is treated as unset — the per-checkout toggle wins everywhere,
 * even over a specific event's pinned choice.
 * @param {{ owner_id: string, bank_account_id: string | null }} event
 */
export const resolveForEvent = async (event) => {
  const account = event.bank_account_id
    ? await bankAccountsRepository.findById(event.bank_account_id)
    : await bankAccountsRepository.findDefaultVisibleByOwner(event.owner_id, "ticket");

  if (!account || !account.show_on_ticket_checkout) {
    throw conflict("EVENT_OWNER_NO_BANK_ACCOUNT", "This event's organizer has not set up a payout bank account yet");
  }

  return account;
};

/**
 * Lists every payout account the event's organizer shows on ticket checkout,
 * so a buyer can choose which one to transfer to instead of only ever
 * seeing the single account `resolveForEvent` picks.
 * @param {{ owner_id: string }} event
 */
export const resolveAllForEvent = async (event) => {
  const accounts = await bankAccountsRepository.listVisibleByOwner(event.owner_id, "ticket");
  if (accounts.length === 0) {
    throw conflict("EVENT_OWNER_NO_BANK_ACCOUNT", "This event's organizer has not set up a payout bank account yet");
  }
  return accounts;
};
