import { z } from "zod";

export const memberRegistrationSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z
    .string()
    .regex(
      /^([6-9]\d{9}|\+[1-9]\d{6,14})$/,
      "Enter a valid phone number (10-digit Indian or international with country code e.g. +447911123456)"
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
  qualification: z.string().optional().nullable(),
  job: z.string().optional().nullable(),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;
