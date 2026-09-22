import { ChangeEvent, FormEvent, ReactNode, useState } from 'react';
import { registerStudent, updateStudent } from '../api/studentApi';
import { getErrorMessage } from '../api/http';
import {
  COURSES,
  FieldErrors,
  GENDERS,
  PROFILE_FIELDS,
  Student,
  StudentFormValues,
  StudentProfile,
} from '../types';
import { validateStudent } from '../utils/validation';

interface Props {
  mode: 'create' | 'edit';
  initial?: Student; // required in edit mode
  title?: string;
  onSuccess: (student: Student) => void;
  onCancel?: () => void;
}

const EMPTY: StudentFormValues = {
  fullName: '',
  email: '',
  phone: '',
  dob: '',
  gender: '',
  address: '',
  course: '',
  password: '',
  confirmPassword: '',
};

function normalize(v: StudentFormValues): StudentProfile {
  return {
    fullName: v.fullName.trim().replace(/\s+/g, ' '),
    email: v.email.trim().toLowerCase(),
    phone: v.phone.trim(),
    dob: v.dob,
    gender: v.gender,
    address: v.address.trim(),
    course: v.course,
  };
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

export default function StudentForm({ mode, initial, title, onSuccess, onCancel }: Props) {
  const [values, setValues] = useState<StudentFormValues>(() =>
    initial ? { ...EMPTY, ...pickProfile(initial) } : EMPTY
  );
  const [errors, setErrors] = useState<FieldErrors<StudentFormValues>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const cleanValue = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    const next = { ...values, [name]: cleanValue };
    setValues(next);
    if (submitted) setErrors(validateStudent(next, mode));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');

    const validationErrors = validateStudent(values, mode);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const profile = normalize(values);
    setLoading(true);
    try {
      let saved: Student;
      if (mode === 'create') {
        saved = await registerStudent({ ...profile, password: values.password });
        setValues(EMPTY);
        setSubmitted(false);
      } else {
        if (!initial) throw new Error('No student selected for editing');
        // Send only what actually changed
        const changes: Partial<StudentProfile> & { password?: string } = {};
        for (const field of PROFILE_FIELDS) {
          if (profile[field] !== initial[field]) changes[field] = profile[field];
        }
        if (values.password) changes.password = values.password;

        if (Object.keys(changes).length === 0) {
          setServerError('No changes to save');
          return;
        }
        saved = await updateStudent(initial.id, changes);
      }
      onSuccess(saved);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const cls = (name: keyof StudentFormValues) => (errors[name] ? 'invalid' : '');

  return (
    <form className="student-form" onSubmit={handleSubmit} noValidate>
      {title && <h2>{title}</h2>}
      {serverError && <div className="alert error">{serverError}</div>}

      <div className="grid">
        <Field label="Full Name *" error={errors.fullName}>
          <input name="fullName" value={values.fullName} onChange={handleChange} className={cls('fullName')} placeholder="Rahul Sharma" />
        </Field>

        <Field label="Email *" error={errors.email}>
          <input name="email" type="email" value={values.email} onChange={handleChange} className={cls('email')} placeholder="rahul@example.com" />
        </Field>

        <Field label="Phone Number *" error={errors.phone}>
          <input name="phone" type="tel" inputMode="numeric" value={values.phone} onChange={handleChange} className={cls('phone')} placeholder="9876543210" />
        </Field>

        <Field label="Date of Birth *" error={errors.dob}>
          <input name="dob" type="date" max={today} value={values.dob} onChange={handleChange} className={cls('dob')} />
        </Field>

        <Field label="Gender *" error={errors.gender}>
          <div className={`radio-group ${cls('gender')}`}>
            {GENDERS.map((g) => (
              <label key={g} className="radio">
                <input type="radio" name="gender" value={g} checked={values.gender === g} onChange={handleChange} />
                {g}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Course Enrolled *" error={errors.course}>
          <select name="course" value={values.course} onChange={handleChange} className={cls('course')}>
            <option value="">-- Select course --</option>
            {COURSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Address *" error={errors.address}>
        <textarea name="address" rows={3} value={values.address} onChange={handleChange} className={cls('address')} placeholder="House no, street, city, pincode" />
      </Field>

      <div className="grid">
        <Field label={mode === 'create' ? 'Password *' : 'New Password (optional)'} error={errors.password}>
          <input name="password" type="password" autoComplete="new-password" value={values.password} onChange={handleChange} className={cls('password')} placeholder={mode === 'edit' ? 'Leave blank to keep current' : 'Min 8, Aa1@'} />
        </Field>

        <Field label={mode === 'create' ? 'Confirm Password *' : 'Confirm New Password'} error={errors.confirmPassword}>
          <input name="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={handleChange} className={cls('confirmPassword')} />
        </Field>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Saving…' : mode === 'create' ? 'Register Student' : 'Update Student'}
        </button>
      </div>
    </form>
  );
}

function pickProfile(s: Student): StudentProfile {
  const out = {} as StudentProfile;
  for (const field of PROFILE_FIELDS) out[field] = s[field];
  return out;
}
