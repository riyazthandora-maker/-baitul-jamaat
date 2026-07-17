import { z } from "zod";

export const programSchema = z.object({
  name: z.string().min(2, "Program name is required"),
  default_amount: z.coerce.number().positive("Amount must be greater than 0"),
  recurrence: z.enum(["monthly", "yearly"]),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export const enrollSchema = z.object({
  enrollments: z
    .array(
      z.object({
        member_id: z.string().uuid(),
        amount: z.coerce.number().nonnegative("Amount cannot be negative"),
      })
    )
    .min(1, "Select at least one member"),
});

export const discountSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.coerce.number().positive("Discount amount must be greater than 0"),
  description: z.string().min(1, "Reason for discount is required"),
  program_id: z.string().uuid().optional().nullable(),
});

export type ProgramInput = z.infer<typeof programSchema>;
export type EnrollInput = z.infer<typeof enrollSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
