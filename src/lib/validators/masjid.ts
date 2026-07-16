import { z } from "zod";

export const masjidSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z
    .string()
    .regex(/^[0-9+\-\s()]{7,15}$/, "Invalid phone number"),
  masjid_code: z
    .string()
    .min(2, "Code must be 2-6 uppercase letters")
    .max(6)
    .regex(/^[A-Z0-9]+$/, "Code must be uppercase letters/digits only"),
  upi_id: z.string().optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  active: z.boolean().default(true),
  admin_name: z.string().min(2, "Admin name required"),
  admin_phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Admin phone must be 10 digits"),
});

export type MasjidFormValues = z.infer<typeof masjidSchema>;
