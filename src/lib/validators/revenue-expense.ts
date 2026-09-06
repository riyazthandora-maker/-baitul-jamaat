import { z } from "zod";

// Server-side: date must be within current_date ±30 days
export function isWithin60DayWindow(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= -30 && diffDays <= 30;
}

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const baseFields = {
  date: dateField,
  entity_type: z.enum(["member", "contact"]),
  entity_id: z.string().uuid("Invalid entity ID"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  remarks: z.string().optional().nullable(),
};

// Discriminated union keeps is_received / is_paid scoped to the correct type
export const revenueExpenseSchema = z.discriminatedUnion("type", [
  z.object({
    ...baseFields,
    type: z.literal("revenue"),
    is_received: z.boolean().default(false),
  }),
  z.object({
    ...baseFields,
    type: z.literal("expense"),
    is_paid: z.boolean().default(false),
  }),
]);

export const revenueExpenseUpdateSchema = z.object({
  remarks: z.string().optional().nullable(),
  date: dateField.optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z.string().optional().nullable(),
});

export type RevenueExpenseInput = z.infer<typeof revenueExpenseSchema>;
export type RevenueExpenseUpdateInput = z.infer<typeof revenueExpenseUpdateSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
