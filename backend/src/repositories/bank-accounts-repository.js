import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "bank_accounts";

/** @param {string} ownerId */
export const listByOwner = (ownerId) => db(TABLE).where({ owner_id: ownerId }).orderBy("created_at", "asc");

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/** @param {string} ownerId */
export const findDefaultByOwner = (ownerId) => db(TABLE).where({ owner_id: ownerId, is_default: true }).first();

/**
 * @param {{ ownerId: string, bankName: string, accountNumber: string, accountHolderName: string, isDefault?: boolean }} input
 */
export const create = async ({ ownerId, bankName, accountNumber, accountHolderName, isDefault = false }) => {
  const id = newId();
  const now = new Date();

  await db.transaction(async (trx) => {
    if (isDefault) {
      await trx(TABLE).where({ owner_id: ownerId }).update({ is_default: false });
    }
    await trx(TABLE).insert({
      id,
      owner_id: ownerId,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder_name: accountHolderName,
      is_default: isDefault,
      created_at: now,
      updated_at: now,
    });
  });

  return findById(id);
};

/**
 * @param {string} id
 * @param {string} ownerId
 * @param {{ bankName?: string, accountNumber?: string, accountHolderName?: string, isDefault?: boolean }} patch
 */
export const update = async (id, ownerId, { bankName, accountNumber, accountHolderName, isDefault }) => {
  await db.transaction(async (trx) => {
    if (isDefault === true) {
      await trx(TABLE).where({ owner_id: ownerId }).update({ is_default: false });
    }

    const changes = { updated_at: new Date() };
    if (bankName !== undefined) changes.bank_name = bankName;
    if (accountNumber !== undefined) changes.account_number = accountNumber;
    if (accountHolderName !== undefined) changes.account_holder_name = accountHolderName;
    if (isDefault !== undefined) changes.is_default = isDefault;

    await trx(TABLE).where({ id }).update(changes);
  });

  return findById(id);
};
