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

export const Category = mongoose.model<ICategory>('Category', categorySchema);
