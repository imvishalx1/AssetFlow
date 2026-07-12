import { z } from 'zod';

// Matches the Category model: a name plus optional typed custom fields whose
// `key`s are validated unique within the category (model-level validator).
export const createCategorySchema = z.object({
  name: z.string().min(1),
  customFields: z
    .array(
      z.object({
        key: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/, 'key must be lowercase letters, numbers or dashes'),
        label: z.string().min(1),
        dataType: z.enum(['text', 'number', 'date', 'boolean']).default('text'),
      }),
    )
    .optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
