export const GENDERS = ['Male', 'Female', 'Other'] as const;

export const COURSES = [
  'Full Stack Development (MERN)',
  'Java Full Stack',
  'Python with Django',
  'Data Science & AI',
  'React Native',
  'UI/UX Design',
] as const;

export const PROFILE_FIELDS = [
  'fullName',
  'email',
  'phone',
  'dob',
  'gender',
  'address',
  'course',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

/** Plain (decrypted) profile data */
export type StudentProfile = Record<ProfileField, string>;

export interface Student extends StudentProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Same shape as Student, but every profile value is Layer-1 ciphertext */
export type EncryptedStudent = Student;

export interface StudentFormValues extends StudentProfile {
  password: string;
  confirmPassword: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;
