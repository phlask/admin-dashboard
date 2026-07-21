import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(1, { error: "Please confirm your password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
  });
