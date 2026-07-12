import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('http://localhost:5000'),
  VITE_ENABLE_REAL_TIME: z.enum(['true', 'false']).default('false'),
  VITE_MOCK_AUTH: z.enum(['true', 'false']).default('false'),
});

export const env = envSchema.parse(import.meta.env);
