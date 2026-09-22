import { useMemo, useState } from 'react';
import { Student } from '../types';

interface Props {
  students: Student[];
  loading: boolean;
  currentUserId: string | null;
  deletingId: string | null;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN');
}

export default function StudentList({ students, loading, currentUserId, deletingId, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('');

  // Search works on DECRYPTED data (only possible on the client)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      [s.fullName, s.email, s.phone, s.course].some((v) => v.toLowerCase().includes(q))
    );
  }, [students, search]);

  return (
    <div className="card">
      <div className="list-header">
        <h2>Students <span className="badge">{students.length}</span></h2>
        <input
          className="search"
          placeholder="Search name, email, phone, course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="muted center">Loading students…</p>
      ) : filtered.length === 0 ? (
        <p className="muted center">{students.length === 0 ? 'No students yet.' : 'No match found.'}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>DOB</th>
                <th>Gender</th>
                <th>Course</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>
                    {s.fullName}
                    {s.id === currentUserId && <span className="you">You</span>}
                  </td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{formatDate(s.dob)}</td>
                  <td>{s.gender}</td>
                  <td>{s.course}</td>
                  <td className="address">{s.address}</td>
                  <td className="actions">
                    <button className="btn small" onClick={() => onEdit(s)}>Edit</button>
                    <button
                      className="btn small danger"
                      onClick={() => onDelete(s)}
                      disabled={deletingId === s.id}
                    >
                      {deletingId === s.id ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
