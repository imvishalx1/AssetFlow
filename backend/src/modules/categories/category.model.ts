import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  customFields: { key: string; label: string; dataType: 'text' | 'number' | 'date' | 'boolean' }[];
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    customFields: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        dataType: { type: String, enum: ['text', 'number', 'date', 'boolean'], default: 'text' },
      },
    ],
  },
  { timestamps: true },
);

// Enforce unique custom-field keys within a category.
categorySchema.path('customFields').validate(function (value: { key: string }[]) {
  const keys = (value || []).map((f) => f.key);
  return new Set(keys).size === keys.length;
}, 'Custom field keys must be unique within a category');

export const Category = mongoose.model<ICategory>('Category', categorySchema);
