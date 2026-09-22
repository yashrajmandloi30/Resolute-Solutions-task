import { Schema, model, Types } from 'mongoose';

/** Fields that are stored double-encrypted (client AES + server AES-GCM). */
export const ENCRYPTED_FIELDS = [
  'fullName',
  'email',
  'phone',
  'dob',
  'gender',
  'address',
  'course',
] as const;

export type EncryptedField = (typeof ENCRYPTED_FIELDS)[number];

export type StudentRecord = Record<EncryptedField, string> & {
  _id: Types.ObjectId;
  emailIndex: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const encryptedString = { type: String, required: true };

const studentSchema = new Schema(
  {
    fullName: encryptedString,
    email: encryptedString,
    phone: encryptedString,
    dob: encryptedString,
    gender: encryptedString,
    address: encryptedString,
    course: encryptedString,

    // HMAC blind index of the email -> login lookup + unique constraint
    emailIndex: { type: String, required: true, unique: true, index: true },

    // bcrypt hash (one-way). Never returned in queries by default.
    password: { type: String, required: true, select: false },
  },
  { timestamps: true, versionKey: false }
);

export const Student = model('Student', studentSchema);
