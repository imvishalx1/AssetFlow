import mongoose, { Schema, Document } from 'mongoose';
import { Role } from '../../types/roles';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  departmentId?: mongoose.Types.ObjectId | null;
  status: 'Active' | 'Inactive';
  refreshTokenHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['Admin', 'Asset Manager', 'Department Head', 'Employee'],
      default: 'Employee',
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
