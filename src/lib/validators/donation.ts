import { z } from "zod";

export const donationSchema = z.object({
  donor_name: z.string().min(2, "Donor name is required"),
  donor_phone: z.string().optional().nullable(),
  donor_email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  purpose: z.string().optional().nullable(),
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export type DonationInput = z.infer<typeof donationSchema>;
