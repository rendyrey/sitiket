import { z } from "zod";

export const createBankAccountSchema = z.object({
  bankName: z.string().min(2).max(100),
  accountNumber: z.string().min(4).max(64),
  accountHolderName: z.string().min(2).max(255),
  isDefault: z.boolean().optional(),
  showOnTicketCheckout: z.boolean().optional(),
  showOnMerchCheckout: z.boolean().optional(),
});

export const updateBankAccountSchema = z
  .object({
    bankName: z.string().min(2).max(100),
    accountNumber: z.string().min(4).max(64),
    accountHolderName: z.string().min(2).max(255),
    isDefault: z.boolean(),
    showOnTicketCheckout: z.boolean(),
    showOnMerchCheckout: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
