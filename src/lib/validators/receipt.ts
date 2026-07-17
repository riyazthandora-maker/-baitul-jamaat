import { z } from "zod";

export const receiptSchema = z.object({
  member_id: z.string().uuid("Invalid member"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  notes: z.string().optional().nullable(),
});

export const voidSchema = z.object({
  reason: z.string().min(1, "Void reason is required"),
});

export type ReceiptInput = z.infer<typeof receiptSchema>;
export type VoidInput = z.infer<typeof voidSchema>;
