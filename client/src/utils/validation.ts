import { COURSES, GENDERS, FieldErrors, StudentFormValues } from '../types';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,49}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/; // 10-digit Indian mobile

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Minimum 8 characters';
  if (password.length > 64) return 'Maximum 64 characters';
  if (!/[A-Z]/.test(password)) return 'Add at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Add at least one lowercase letter';
  if (!/\d/.test(password)) return 'Add at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Add at least one special character';
  return undefined;
}

export interface LoginValues {
  email: string;
  password: string;
}

export function validateLogin(values: LoginValues): FieldErrors<LoginValues> {
  const errors: FieldErrors<LoginValues> = {};
  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL_REGEX.test(values.email.trim())) errors.email = 'Enter a valid email address';

  if (!values.password) errors.password = 'Password is required';
  else if (values.password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
}

function ageFrom(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function validateStudent(
  v: StudentFormValues,
  mode: 'create' | 'edit'
): FieldErrors<StudentFormValues> {
  const e: FieldErrors<StudentFormValues> = {};

  if (!v.fullName.trim()) e.fullName = 'Full name is required';
  else if (!NAME_REGEX.test(v.fullName.trim())) e.fullName = 'Only letters and spaces (2–50 chars)';

  if (!v.email.trim()) e.email = 'Email is required';
  else if (!EMAIL_REGEX.test(v.email.trim())) e.email = 'Enter a valid email address';

  if (!v.phone.trim()) e.phone = 'Phone number is required';
  else if (!PHONE_REGEX.test(v.phone.trim())) e.phone = 'Enter a valid 10-digit mobile number';

  if (!v.dob) e.dob = 'Date of birth is required';
  else if (Number.isNaN(new Date(v.dob).getTime())) e.dob = 'Invalid date';
  else if (new Date(v.dob) > new Date()) e.dob = 'Date of birth cannot be in the future';
  else if (ageFrom(v.dob) < 15) e.dob = 'Student must be at least 15 years old';
  else if (ageFrom(v.dob) > 100) e.dob = 'Please enter a realistic date of birth';

  if (!(GENDERS as readonly string[]).includes(v.gender)) e.gender = 'Select a gender';

  if (!v.address.trim()) e.address = 'Address is required';
  else if (v.address.trim().length < 10) e.address = 'Address must be at least 10 characters';
  else if (v.address.trim().length > 200) e.address = 'Address must be under 200 characters';

  if (!(COURSES as readonly string[]).includes(v.course)) e.course = 'Select a course';

  // Password: mandatory on create, optional on edit (blank = keep old one)
  if (mode === 'create' || v.password) {
    const pwError = validatePassword(v.password);
    if (pwError) e.password = pwError;
    if (v.password !== v.confirmPassword) e.confirmPassword = 'Passwords do not match';
  }

  return e;
}
