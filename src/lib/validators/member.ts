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
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  address: z.string().min(5, "Address is required (at least 5 characters)"),
  qualification: z.string().min(1, "Qualification is required"),
  job: z.string().optional().nullable(),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;
