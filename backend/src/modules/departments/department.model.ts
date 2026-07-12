import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  parentDepartmentId?: mongoose.Types.ObjectId | null;
  headUserId?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, trim: true },
    parentDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    headUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
