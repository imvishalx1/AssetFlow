import { z } from 'zod';

// General-purpose ID validator — accepts any non-empty string (CUID, UUID, etc.)
export const entityId = z.string().min(1, 'ID is required');
export { entityId as mongoId };
