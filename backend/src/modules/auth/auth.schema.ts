import { z } from 'zod';

export const emailField = z.string().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Invalid email');

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

export const refreshSchema = z.object({}).optional();
