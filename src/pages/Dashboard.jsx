import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth.jsx';
import { API_URL } from '../api.js';

const DASHBOARD_PASSWORD = 'elife#012';
const DASH_KEY = 'elovaa_dash_unlocked';

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '—';

function duration(a, b) {
  if (!b) return '—';
  const mins = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  const h = Math.floor(mins / 60);
  return h ? `${h}h ${mins % 60}m` : `${mins}m`;
}

export default function Dashboard() {
  const { token } = useAuth();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(DASH_KEY) === 'true');
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [visitors, setVisitors] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);

  // Directory Modal State
  const [showDirectory, setShowDirectory] = useState(false);
  const [directoryMembers, setDirectoryMembers] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirTab, setDirTab] = useState('student');
  const [dirForm, setDirForm] = useState({
    name: '',
    phone: '',
    code: '',
    course: 'Makeup',
    batch: 'Batch 1',
    position: 'Receptionist',
  });
  const [dirMsg, setDirMsg] = useState(null);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (passInput === DASHBOARD_PASSWORD) {
      sessionStorage.setItem(DASH_KEY, 'true');
      setUnlocked(true);
      setPassError('');
    } else {
      setPassError('Incorrect dashboard password. Please try again.');
    }
  };

  const lockDashboard = () => {
    sessionStorage.removeItem(DASH_KEY);
    setUnlocked(false);
    setPassInput('');
  };

  const load = () => {
    if (!unlocked) return;
    axios
      .get('/api/visitors')
      .then((r) => setVisitors(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!unlocked) return;
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [unlocked]);

  // Load Directory Members
  const loadDirectory = () => {
    setDirLoading(true);
    axios
      .get('/api/directory')
      .then((r) => setDirectoryMembers(r.data))
      .catch(() => {})
      .finally(() => setDirLoading(false));
  };

  useEffect(() => {
    if (showDirectory && unlocked) {
      loadDirectory();
    }
  }, [showDirectory, unlocked]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setDirMsg(null);
    try {
      await axios.post('/api/directory', {
        type: dirTab,
        ...dirForm,
      });
      setDirMsg({ type: 'success', text: `Added to ${dirTab} directory!` });
      setDirForm({
        name: '',
        phone: '',
        code: '',
        course: 'Makeup',
        batch: 'Batch 1',
        position: 'Receptionist',
      });
      loadDirectory();
    } catch (err) {
      setDirMsg({ type: 'error', text: err.response?.data?.message || 'Failed to add member' });
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Delete this directory record?')) return;
    try {
      await axios.delete(`/api/directory/${id}`);
      loadDirectory();
    } catch {
      alert('Failed to delete member');
    }
  };

  const photoUrl = (id) => `${API_URL}/api/visitors/${id}/photo?token=${token}`;

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return visitors.filter((v) => {
      const matchStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchType = typeFilter === 'all' || (v.visitorType || 'inquiry') === typeFilter;
      const matchSearch = [
        v.name,
        v.email,
        v.phone,
        v.purpose,
        v.code,
        v.course,
        v.batch,
        v.position,
      ].some((x) => (x || '').toLowerCase().includes(q));

      return matchStatus && matchType && matchSearch;
    });
  }, [visitors, search, statusFilter, typeFilter]);

  const today = new Date().toDateString();
  const stats = [
    { n: visitors.length, l: 'Total Visitors' },
    {
      n: visitors.filter((v) => new Date(v.checkInTime).toDateString() === today).length,
      l: 'Today (All)',
    },
    {
      n: visitors.filter((v) => (v.visitorType || 'inquiry') === 'inquiry' && new Date(v.checkInTime).toDateString() === today).length,
      l: 'Inquiries Today',
    },
    {
      n: visitors.filter((v) => v.visitorType === 'student' && new Date(v.checkInTime).toDateString() === today).length,
      l: 'Students Today',
    },
    {
      n: visitors.filter((v) => v.status === 'checked-in').length,
      l: 'Currently Inside',
    },
  ];

  if (!unlocked) {
    return (
      <div className="dash-lock-wrap">
        <form className="dash-lock-card card" onSubmit={handleUnlock}>
          <div className="dash-lock-icon">🔒</div>
          <h2>Dashboard Protected</h2>
          <p className="muted">Please enter the security password to view visitor records.</p>

          <label htmlFor="dash-pass">Dashboard Password</label>
          <div className="pw">
            <input
              id="dash-pass"
              type={showPass ? 'text' : 'password'}
              value={passInput}
              onChange={(e) => {
                setPassInput(e.target.value);
                setPassError('');
              }}
              placeholder="Enter password"
              required
              autoFocus
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>

          {passError && <div className="msg error">{passError}</div>}

          <button className="btn primary block lg">
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  const filteredDirectory = directoryMembers.filter((m) => m.type === dirTab);

  return (
    <div className="dash">
      <div className="dash-header">
        <h2 className="page-title">Dashboard</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn soft sm"
            onClick={() => setShowDirectory(true)}
            title="Manage Pre-registered Students, Teachers, Staff"
          >
            👥 Directory Roster
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={lockDashboard}
            title="Lock Dashboard"
          >
            🔒 Lock
          </button>
        </div>
      </div>

      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.l}>
            <b>{s.n}</b>
            <span>{s.l}</span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <input
          placeholder="Search by name, phone, code, purpose, course, position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="inquiry">📝 Inquiries</option>
          <option value="student">🎓 Students</option>
          <option value="teacher">👩‍🏫 Teachers</option>
          <option value="staff">💼 Staff</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="checked-in">Checked In</option>
          <option value="checked-out">Checked Out</option>
        </select>
      </div>

      <div className="table-card">
        <table className="rtable">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Category</th>
              <th>Name</th>
              <th>Phone / Code</th>
              <th>Course / Role</th>
              <th>Batch / Purpose</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => {
              const type = v.visitorType || 'inquiry';
              return (
                <tr key={v._id}>
                  <td data-label="Photo">
                    {v.hasPhoto ? (
                      <img
                        className="thumb"
                        src={photoUrl(v._id)}
                        alt={v.name}
                        title="View Photo"
                        loading="lazy"
                        onClick={() => setPreview(photoUrl(v._id))}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td data-label="Category">
                    <span className={`badge ${type}`}>
                      {type === 'student'
                        ? '🎓 Student'
                        : type === 'teacher'
                        ? '👩‍🏫 Teacher'
                        : type === 'staff'
                        ? '💼 Staff'
                        : '📝 Inquiry'}
                    </span>
                  </td>
                  <td data-label="Name" className="strong">
                    {v.name}
                  </td>
                  <td data-label="Phone / Code">
                    <div>{v.phone}</div>
                    {v.code && <small style={{ color: 'var(--muted)' }}>Code: {v.code}</small>}
                  </td>
                  <td data-label="Course / Role">
                    {v.course || v.position || '—'}
                  </td>
                  <td data-label="Batch / Purpose">
                    {v.batch ? <div>Batch: {v.batch}</div> : null}
                    <small style={{ color: 'var(--muted)' }}>{v.purpose || '—'}</small>
                  </td>
                  <td data-label="Check In">{fmt(v.checkInTime)}</td>
                  <td data-label="Check Out">{fmt(v.checkOutTime)}</td>
                  <td data-label="Duration">{duration(v.checkInTime, v.checkOutTime)}</td>
                  <td data-label="Status">
                    <span className={`badge ${v.status}`}>
                      {v.status === 'checked-in' ? 'Checked In' : 'Checked Out'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!loading && list.length === 0 && (
              <tr className="empty-row">
                <td colSpan="10" className="empty">
                  No visitor records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PHOTO PREVIEW MODAL */}
      {preview && (
        <div className="modal" onClick={() => setPreview('')}>
          <img src={preview} alt="preview" />
        </div>
      )}

      {/* DIRECTORY MANAGEMENT MODAL */}
      {showDirectory && (
        <div className="modal" onClick={() => setShowDirectory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👥 Directory Roster (Auto-Fetch Data)</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDirectory(false)}
              >
                ✕
              </button>
            </div>

            <p className="muted">
              Add Students, Teachers, and Staff so typing their mobile number or code on the check-in form auto-fills their details instantly.
            </p>

            <div className="seg" style={{ marginBottom: '16px' }}>
              <button
                type="button"
                className={dirTab === 'student' ? 'active' : ''}
                onClick={() => setDirTab('student')}
              >
                🎓 Students
              </button>
              <button
                type="button"
                className={dirTab === 'teacher' ? 'active' : ''}
                onClick={() => setDirTab('teacher')}
              >
                👩‍🏫 Teachers
              </button>
              <button
                type="button"
                className={dirTab === 'staff' ? 'active' : ''}
                onClick={() => setDirTab('staff')}
              >
                💼 Staff
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ background: 'var(--bg2)', padding: '16px', borderRadius: '14px', marginBottom: '18px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Add New {dirTab === 'student' ? 'Student' : dirTab === 'teacher' ? 'Teacher' : 'Staff'}</h4>
              <div className="directory-grid">
                <div>
                  <label style={{ margin: '0 0 4px 0' }}>Full Name *</label>
                  <input
                    value={dirForm.name}
                    onChange={(e) => setDirForm({ ...dirForm, name: e.target.value })}
                    required
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label style={{ margin: '0 0 4px 0' }}>Mobile Number *</label>
                  <input
                    type="tel"
                    value={dirForm.phone}
                    onChange={(e) => setDirForm({ ...dirForm, phone: e.target.value })}
                    required
                    placeholder="Mobile number"
                  />
                </div>
                <div>
                  <label style={{ margin: '0 0 4px 0' }}>Code (Optional)</label>
                  <input
                    value={dirForm.code}
                    onChange={(e) => setDirForm({ ...dirForm, code: e.target.value })}
                    placeholder={dirTab === 'student' ? 'e.g. STU101' : dirTab === 'teacher' ? 'e.g. TCH01' : 'e.g. STF01'}
                  />
                </div>

                {dirTab === 'staff' ? (
                  <div>
                    <label style={{ margin: '0 0 4px 0' }}>Position / Role</label>
                    <select
                      value={dirForm.position}
                      onChange={(e) => setDirForm({ ...dirForm, position: e.target.value })}
                    >
                      <option value="Receptionist">Receptionist</option>
                      <option value="Telecallers">Telecallers</option>
                      <option value="Sales & Marketing">Sales & Marketing</option>
                      <option value="Manager">Manager</option>
                      <option value="Admin Staff">Admin Staff</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label style={{ margin: '0 0 4px 0' }}>Course / Class</label>
                      <input
                        value={dirForm.course}
                        onChange={(e) => setDirForm({ ...dirForm, course: e.target.value })}
                        placeholder="e.g. Makeup, Hair"
                      />
                    </div>
                    <div>
                      <label style={{ margin: '0 0 4px 0' }}>Batch</label>
                      <input
                        value={dirForm.batch}
                        onChange={(e) => setDirForm({ ...dirForm, batch: e.target.value })}
                        placeholder="e.g. Batch 1, Batch 2"
                      />
                    </div>
                  </>
                )}
              </div>

              {dirMsg && <div className={`msg ${dirMsg.type}`} style={{ margin: '0 0 10px 0' }}>{dirMsg.text}</div>}

              <button type="submit" className="btn primary sm">
                + Add to Roster
              </button>
            </form>

            <h4 style={{ margin: '14px 0 8px 0' }}>Current {dirTab} List ({filteredDirectory.length})</h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="directory-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Code</th>
                    <th>{dirTab === 'staff' ? 'Position' : 'Course / Batch'}</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDirectory.map((m) => (
                    <tr key={m._id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.phone}</td>
                      <td>{m.code || '—'}</td>
                      <td>
                        {dirTab === 'staff'
                          ? m.position
                          : `${m.course || '—'} ${m.batch ? `(${m.batch})` : ''}`}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn danger-soft sm"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => handleDeleteMember(m._id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredDirectory.length === 0 && !dirLoading && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px' }}>
                        No {dirTab} records found in directory yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
