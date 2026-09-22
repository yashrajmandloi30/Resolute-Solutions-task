import { useCallback, useEffect, useState } from 'react';
import StudentForm from './StudentForm';
import StudentList from './StudentList';
import { deleteStudent, fetchStudents } from '../api/studentApi';
import { getErrorMessage } from '../api/http';
import { EncryptedStudent, Student } from '../types';

interface Props {
  userId: string | null;
  onLogout: () => void;
}

type Panel = { mode: 'create' } | { mode: 'edit'; student: Student } | null;

export default function Dashboard({ userId, onLogout }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [raw, setRaw] = useState<EncryptedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchStudents();
      setStudents(result.students);
      setRaw(result.raw);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleSaved = (saved: Student) => {
    const wasEdit = panel?.mode === 'edit';
    setPanel(null);
    setNotice(wasEdit ? `${saved.fullName} updated successfully` : `${saved.fullName} registered successfully`);
    void loadStudents();
  };

  const handleDelete = async (student: Student) => {
    const isSelf = student.id === userId;
    const msg = isSelf
      ? 'This is YOUR account. Deleting it will log you out. Continue?'
      : `Delete ${student.fullName}? This cannot be undone.`;
    if (!window.confirm(msg)) return;

    setDeletingId(student.id);
    try {
      await deleteStudent(student.id);
      if (isSelf) {
        onLogout();
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      setRaw((prev) => prev.filter((s) => s.id !== student.id));
      if (panel?.mode === 'edit' && panel.student.id === student.id) setPanel(null);
      setNotice(`${student.fullName} deleted`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const me = students.find((s) => s.id === userId);

  return (
    <div className="dashboard">
      <header className="topbar">
        <div>
          <h1>Student Management</h1>
          <p className="muted">Hi {me?.fullName ?? 'there'} 👋 — data is 2-level encrypted end to end</p>
        </div>
        <div className="topbar-actions">
          <button className="btn primary" onClick={() => setPanel({ mode: 'create' })}>
            + Add Student
          </button>
          <button className="btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {notice && <div className="alert success">{notice}</div>}
      {error && (
        <div className="alert error">
          {error} <button className="link-btn" onClick={() => void loadStudents()}>Retry</button>
        </div>
      )}

      {panel && (
        <div className="card">
          <StudentForm
            key={panel.mode === 'edit' ? panel.student.id : 'new'}
            mode={panel.mode}
            initial={panel.mode === 'edit' ? panel.student : undefined}
            title={panel.mode === 'edit' ? `Edit: ${panel.student.fullName}` : 'Add New Student'}
            onSuccess={handleSaved}
            onCancel={() => setPanel(null)}
          />
        </div>
      )}

      <StudentList
        students={students}
        loading={loading}
        currentUserId={userId}
        deletingId={deletingId}
        onEdit={(s) => {
          setPanel({ mode: 'edit', student: s });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onDelete={(s) => void handleDelete(s)}
      />

      {raw.length > 0 && (
        <details className="card raw">
          <summary>🔐 Show raw API response (still Layer-1 encrypted)</summary>
          <p className="muted">
            This is exactly what GET /api/students returned. The server removed its own layer,
            but the values are still ciphertext — they are decrypted only in the browser.
          </p>
          <pre>{JSON.stringify(raw.slice(0, 2), null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
