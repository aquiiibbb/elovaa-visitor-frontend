import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../auth.jsx';
import { API_URL } from '../api.js';

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
  const [visitors, setVisitors] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () =>
    axios.get('/api/visitors').then((r) => setVisitors(r.data)).catch(() => {}).finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

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

  return (
    <div className="dash">
      <h2 className="page-title">Dashboard</h2>

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
              <th>In Photo</th><th>Out Photo</th><th>Name</th><th>Email</th><th>Phone</th><th>Purpose</th>
              <th>Check In</th><th>Check Out</th><th>Duration</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v._id}>
                <td data-label="In Photo">
                  {v.hasPhoto ? (
                    <img
                      className="thumb"
                      src={photoUrl(v._id, 'in')}
                      alt={`${v.name} In`}
                      title="View Check-In Photo"
                      loading="lazy"
                      onClick={() => setPreview(photoUrl(v._id, 'in'))}
                    />
                  ) : (
                    '—'
                  )}
                </td>
                <td data-label="Out Photo">
                  {v.hasCheckOutPhoto ? (
                    <img
                      className="thumb"
                      src={photoUrl(v._id, 'out')}
                      alt={`${v.name} Out`}
                      title="View Check-Out Photo"
                      loading="lazy"
                      onClick={() => setPreview(photoUrl(v._id, 'out'))}
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
              <tr className="empty-row"><td colSpan="10" className="empty">No visitor records found</td></tr>
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
