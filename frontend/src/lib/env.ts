import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('http://localhost:5000'),
  VITE_ENABLE_REAL_TIME: z.enum(['true', 'false']).default('false'),
  VITE_MOCK_AUTH: z.enum(['true', 'false']).default('false'),

  // Firebase configuration (required when VITE_MOCK_AUTH=false)
  VITE_FIREBASE_API_KEY: z.string().default(''),
  VITE_FIREBASE_AUTH_DOMAIN: z.string().default(''),
  VITE_FIREBASE_PROJECT_ID: z.string().default(''),
  VITE_FIREBASE_STORAGE_BUCKET: z.string().default(''),
  VITE_FIREBASE_MESSAGING_SENDER_ID: z.string().default(''),
  VITE_FIREBASE_APP_ID: z.string().default(''),
  VITE_FIREBASE_USE_EMULATOR: z.enum(['true', 'false']).default('true'),
});

export const env = envSchema.parse(import.meta.env);
