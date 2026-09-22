import { http } from './http';
import { clientEncrypt, clientDecrypt, hashEmail } from '../utils/crypto';
import { EncryptedStudent, PROFILE_FIELDS, Student, StudentProfile } from '../types';

type ProfileChanges = Partial<StudentProfile> & { password?: string };

/** Layer 1 encrypt: every profile field that is present */
function encryptProfile(profile: Partial<StudentProfile>): Partial<StudentProfile> {
  const out: Partial<StudentProfile> = {};
  for (const field of PROFILE_FIELDS) {
    const value = profile[field];
    if (value !== undefined) out[field] = clientEncrypt(value);
  }
  return out;
}

/** Final (Layer 1) decrypt of what the server returns */
export function decryptStudent(raw: EncryptedStudent): Student {
  const student = { ...raw };
  for (const field of PROFILE_FIELDS) {
    try {
      student[field] = clientDecrypt(raw[field]);
    } catch {
      student[field] = '⚠ unable to decrypt';
    }
  }
  return student;
}

// POST /api/register
export async function registerStudent(input: StudentProfile & { password: string }): Promise<Student> {
  const payload = {
    ...encryptProfile(input),
    emailHash: hashEmail(input.email),
    password: input.password, // only for bcrypt on server (use HTTPS in production)
  };
  const { data } = await http.post<{ student: EncryptedStudent }>('/register', payload);
  return decryptStudent(data.student);
}

// POST /api/login
export async function loginStudent(email: string, password: string) {
  const { data } = await http.post<{ token: string; student: EncryptedStudent }>('/login', {
    emailHash: hashEmail(email),
    password,
  });
  return { token: data.token, student: decryptStudent(data.student) };
}

// GET /api/students
export async function fetchStudents(): Promise<{ raw: EncryptedStudent[]; students: Student[] }> {
  const { data } = await http.get<{ students: EncryptedStudent[] }>('/students');
  return { raw: data.students, students: data.students.map(decryptStudent) };
}

// PUT /api/student/:id  (send only changed fields)
export async function updateStudent(id: string, changes: ProfileChanges): Promise<Student> {
  const { password, ...profile } = changes;
  const payload: Record<string, string> = { ...encryptProfile(profile) } as Record<string, string>;
  if (profile.email !== undefined) payload.emailHash = hashEmail(profile.email);
  if (password) payload.password = password;

  const { data } = await http.put<{ student: EncryptedStudent }>(`/student/${id}`, payload);
  return decryptStudent(data.student);
}

// DELETE /api/student/:id
export async function deleteStudent(id: string): Promise<void> {
  await http.delete(`/student/${id}`);
}
