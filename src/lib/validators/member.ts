import { z } from "zod";

export const memberRegistrationSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z
    .string()
    .regex(
      /^(\+91|0)?[6-9]\d{9}$|^\+971[0-9]{8,9}$/,
      "Enter a valid 10-digit Indian or UAE phone number"
    ),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  dob: z.string().optional().nullable(),
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  address: z.string().optional().nullable(),
  id_type: z.string().optional().nullable(),
  id_last4: z
    .string()
    .regex(/^\d{4}$/, "Must be exactly 4 digits")
    .optional()
    .nullable(),
  qualification: z.string().min(1, "Qualification or job is required"),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;
