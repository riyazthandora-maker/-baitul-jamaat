import { z } from "zod";

export const receiptSchema = z.object({
  member_id: z.string().uuid("Invalid member"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  notes: z.string().optional().nullable(),
  receipt_date: z.string().refine((val) => {
    const date = new Date(val);
    if (isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    return date <= today && date >= oneMonthAgo;
  }, "Date must be within the past one month and not in the future"),
});

export const voidSchema = z.object({
  reason: z.string().min(1, "Void reason is required"),
});

export type ReceiptInput = z.infer<typeof receiptSchema>;
export type VoidInput = z.infer<typeof voidSchema>;
