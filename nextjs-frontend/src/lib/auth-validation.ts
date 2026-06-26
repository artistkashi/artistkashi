import * as z from "zod";

const passwordPattern = /[!@#$%^&*(),.?":{}|<>]/;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .refine((value) => /[A-Z]/.test(value), {
    message: "Password must contain at least one uppercase letter",
  })
  .refine((value) => passwordPattern.test(value), {
    message: "Password must contain at least one special character",
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: passwordSchema,
  })
  .superRefine((data, ctx) => {
    if (data.password.toLowerCase().includes(data.email.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password should not contain your email address",
      });
    }
  });

export const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupFormValues = z.infer<typeof signupSchema>;
