import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth.jsx';
import { API_URL } from '../api.js';

const DASHBOARD_PASSWORD = 'elife#012';
const DASH_KEY = 'elovaa_dash_unlocked';

const fmt = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

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
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);

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
    axios.get('/api/visitors').then((r) => setVisitors(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!unlocked) return;
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [unlocked]);

  const photoUrl = (id, type = 'in') =>
    type === 'out'
      ? `${API_URL}/api/visitors/${id}/checkout-photo?token=${token}`
      : `${API_URL}/api/visitors/${id}/photo?token=${token}`;

  const list = useMemo(() => {
    const q = search.toLowerCase();
    return visitors.filter(
      (v) =>
        (filter === 'all' || v.status === filter) &&
        [v.name, v.email, v.phone, v.purpose].some((x) => (x || '').toLowerCase().includes(q))
    );
  }, [visitors, search, filter]);

  const today = new Date().toDateString();
  const stats = [
    { n: visitors.length, l: 'Total Visitors' },
    { n: visitors.filter((v) => new Date(v.checkInTime).toDateString() === today).length, l: 'Today' },
    { n: visitors.filter((v) => v.status === 'checked-in').length, l: 'Currently Inside' },
    { n: visitors.filter((v) => v.status === 'checked-out').length, l: 'Checked Out' },
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

  return (
    <div className="dash">
      <div className="dash-header">
        <h2 className="page-title">Dashboard</h2>
        <button type="button" className="btn ghost sm" onClick={lockDashboard} title="Lock Dashboard">
          🔒 Lock Dashboard
        </button>
      </div>

      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.l}><b>{s.n}</b><span>{s.l}</span></div>
        ))}
      </div>

      <div className="toolbar">
        <input placeholder="Search name, email, phone, purpose..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="checked-in">Checked In</option>
          <option value="checked-out">Checked Out</option>
        </select>
      </div>

      <div className="table-card">
        <table className="rtable">
          <thead>
            <tr>
              <th>Photo</th><th>Name</th><th>Email</th><th>Phone</th><th>Purpose</th>
              <th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v._id}>
                <td data-label="Photo">
                  {v.hasPhoto ? (
                    <img
                      className="thumb"
                      src={photoUrl(v._id, 'in')}
                      alt={`${v.name}`}
                      title="View Photo"
                      loading="lazy"
                      onClick={() => setPreview(photoUrl(v._id, 'in'))}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td data-label="Name" className="strong">{v.name}</td>
                <td data-label="Email">{v.email}</td>
                <td data-label="Phone">{v.phone}</td>
                <td data-label="Purpose">{v.purpose}</td>
                <td data-label="Check In">{fmt(v.checkInTime)}</td>
                <td data-label="Check Out">{fmt(v.checkOutTime)}</td>
                <td data-label="Duration">{duration(v.checkInTime, v.checkOutTime)}</td>
                <td data-label="Status"><span className={`badge ${v.status}`}>{v.status === 'checked-in' ? 'Checked In' : 'Checked Out'}</span></td>
              </tr>
            ))}
            {!loading && list.length === 0 && (
              <tr className="empty-row"><td colSpan="9" className="empty">No visitor records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="modal" onClick={() => setPreview('')}>
          <img src={preview} alt="preview" />
        </div>
      )}
    </div>
  );
}
