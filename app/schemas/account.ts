import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(100, { error: "Name must be 100 characters or fewer" }),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { error: "Enter your current password" }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { error: "Please confirm your new password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((values) => values.password !== values.currentPassword, {
    error: "Choose a password different from your current one",
    path: ["password"],
  });
