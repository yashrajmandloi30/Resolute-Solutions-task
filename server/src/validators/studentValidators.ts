import { z } from 'zod';

// Layer-1 ciphertext produced by the frontend: base64(iv):base64(ciphertext)
const clientCipher = z
  .string({ required_error: 'Field is required' })
  .regex(/^[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$/, 'Field must be client-encrypted')
  .max(2000, 'Field too long');

// SHA-256 hex of the lower-cased email (computed on frontend)
const emailHash = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid email hash');

// Password comes over HTTPS in plain form ONLY so it can be bcrypt-hashed.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password must be at most 64 characters')
  .regex(/[A-Z]/, 'Password needs an uppercase letter')
  .regex(/[a-z]/, 'Password needs a lowercase letter')
  .regex(/\d/, 'Password needs a number')
  .regex(/[^A-Za-z0-9]/, 'Password needs a special character');

export const registerSchema = z.object({
  fullName: clientCipher,
  email: clientCipher,
  phone: clientCipher,
  dob: clientCipher,
  gender: clientCipher,
  address: clientCipher,
  course: clientCipher,
  emailHash,
  password,
});

export const updateSchema = registerSchema
  .partial()
  .refine((d) => (d.email === undefined) === (d.emailHash === undefined), {
    message: 'email and emailHash must be sent together',
    path: ['emailHash'],
  });

export const loginSchema = z.object({
  emailHash,
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateInput = z.infer<typeof updateSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
