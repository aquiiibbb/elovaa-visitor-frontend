import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  purpose: '',
  code: '',
  course: 'Makeup',
  batch: 'Batch 1',
  position: 'Receptionist',
};

const MAX_W = 640;

const COURSES = [
  'Makeup',
  'Hair Styling',
  'Cosmetology',
  'Nail Art',
  'Skin Care',
  'Beauty Therapy',
  'Other'
];

const BATCHES = [
  'Batch 1',
  'Batch 2',
  'Batch 3',
  'Batch 4',
  'Morning Batch',
  'Evening Batch',
  'Weekend Batch'
];

const POSITIONS = [
  'Receptionist',
  'Telecallers',
  'Sales & Marketing',
  'Manager',
  'Faculty / Instructor',
  'Admin Staff',
  'Other'
];

export default function VisitorForm() {
  const [mode, setMode] = useState('checkin');
  const [visitorType, setVisitorType] = useState('inquiry'); // inquiry, student, teacher, staff
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState(null); // 'found' | 'not_found' | 'searching' | null
  const [photo, setPhoto] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startCamera = async () => {
    setMsg(null);
    stopCamera();
    try {
      const constraints = {
        video: {
          facingMode: 'user', // Selfie camera only
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setPhoto('');
      setCameraOn(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMsg({
        type: 'error',
        text: 'Unable to access camera. Please grant camera permission in your browser (HTTPS required).',
      });
    }
  };

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_W / v.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    // Mirror for selfie camera so saved photo matches the preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.75));
    stopCamera();
  };

  useEffect(() => () => stopCamera(), []);

  const switchMode = (m) => {
    setMode(m);
    setMsg(null);
    setPhoto('');
    stopCamera();
  };

  const handleTypeChange = (newType) => {
    setVisitorType(newType);
    setSearchQuery('');
    setSearchStatus(null);
    setMsg(null);
    setForm({
      ...emptyForm,
      course: newType === 'teacher' ? 'Makeup' : 'Makeup',
      batch: newType === 'teacher' ? 'Batch 2' : 'Batch 1',
      position: 'Receptionist',
    });
  };

  // Quick Directory Search by Phone or Code
  const performSearch = async (val = searchQuery) => {
    const q = String(val).trim();
    if (!q) return;
    setSearchStatus('searching');
    setMsg(null);
    try {
      const { data } = await axios.get(
        `/api/directory/search?q=${encodeURIComponent(q)}&type=${visitorType}`
      );
      if (data) {
        setForm((prev) => ({
          ...prev,
          name: data.name || prev.name,
          phone: data.phone || (q.length > 5 && !isNaN(q) ? q : prev.phone),
          code: data.code || prev.code,
          course: data.course || prev.course,
          batch: data.batch || prev.batch,
          position: data.position || prev.position,
        }));
        setSearchStatus('found');
      }
    } catch {
      setSearchStatus('not_found');
      const isPhone = /^[0-9+ \-]{6,15}$/.test(q);
      setForm((prev) => ({
        ...prev,
        phone: isPhone ? q : prev.phone,
        code: !isPhone ? q.toUpperCase() : prev.code,
      }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (mode === 'checkin' && !photo) {
      setMsg({ type: 'error', text: 'Please capture a selfie photo before submitting check-in.' });
      return;
    }

    setLoading(true);
    try {
      if (mode === 'checkin') {
        const payload = {
          visitorType,
          ...form,
          photo,
        };

        const { data } = await axios.post('/api/visitors/checkin', payload);
        const typeLabel =
          visitorType === 'student'
            ? 'Student'
            : visitorType === 'teacher'
            ? 'Teacher'
            : visitorType === 'staff'
            ? 'Staff member'
            : 'Visitor';

        setMsg({
          type: 'success',
          text: `Welcome ${data.visitor.name} (${typeLabel}), your check-in is complete! ✅`,
        });
        setForm(emptyForm);
        setSearchQuery('');
        setSearchStatus(null);
        setPhoto('');
      } else {
        const { data } = await axios.post('/api/visitors/checkout', { phone: form.phone });
        setMsg({ type: 'success', text: `Thank you ${data.visitor.name}, your check-out is complete! ✅` });
        setForm(emptyForm);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-wrap">
      <div className="card">
        <h2>Visitor {mode === 'checkin' ? 'Check In' : 'Check Out'}</h2>
        <p className="muted">
          {mode === 'checkin'
            ? 'Welcome to ELOVAA. Select visitor type, enter details and capture a selfie photo.'
            : 'Enter your registered phone number to check out.'}
        </p>

        <div className="seg">
          <button type="button" className={mode === 'checkin' ? 'active' : ''} onClick={() => switchMode('checkin')}>
            Check In
          </button>
          <button type="button" className={mode === 'checkout' ? 'active' : ''} onClick={() => switchMode('checkout')}>
            Check Out
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === 'checkin' && (
            <>
              {/* VISITOR TYPE SELECTION */}
              <label>Visitor Type</label>
              <select
                value={visitorType}
                onChange={(e) => handleTypeChange(e.target.value)}
                style={{ fontWeight: 600, fontSize: '15px' }}
              >
                <option value="inquiry">📝 Inquiry (New Visitor)</option>
                <option value="student">🎓 Student</option>
                <option value="teacher">👩‍🏫 Teacher</option>
                <option value="staff">💼 Staff</option>
              </select>

              {/* SEARCH BAR FOR STUDENT / TEACHER / STAFF */}
              {visitorType !== 'inquiry' && (
                <div style={{ marginTop: '14px', marginBottom: '8px' }}>
                  <label style={{ margin: '0 0 6px 0', color: 'var(--muted)' }}>
                    Search by Mobile Number or {visitorType === 'student' ? 'Student' : visitorType === 'teacher' ? 'Teacher' : 'Staff'} Code
                  </label>
                  <div className="search-box-row">
                    <input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchStatus) setSearchStatus(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          performSearch();
                        }
                      }}
                      placeholder={`Enter Mobile No or ${visitorType === 'student' ? 'Student Code (e.g. STU101)' : visitorType === 'teacher' ? 'Teacher Code (e.g. TCH01)' : 'Staff Code (e.g. STF01)'}...`}
                    />
                    <button
                      type="button"
                      className="btn soft sm"
                      onClick={() => performSearch()}
                      style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
                    >
                      🔍 Search
                    </button>
                  </div>

                  {searchStatus === 'found' && (
                    <div className="verified-pill">
                      ✓ Record auto-loaded from directory: {form.name}
                    </div>
                  )}

                  {searchStatus === 'not_found' && (
                    <div className="verified-pill new-record">
                      ℹ️ Record not in directory yet. Fill below to register automatically on check-in.
                    </div>
                  )}
                </div>
              )}

              {/* FORM FIELDS BASED ON TYPE */}
              {visitorType === 'inquiry' ? (
                <>
                  <div className="grid2">
                    <div>
                      <label>Name</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handle}
                        required
                        placeholder="Full name"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handle}
                        required
                        placeholder="email@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <label>Phone Number</label>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={handle}
                    required
                    placeholder="Phone number"
                    pattern="[0-9+ \-]{7,15}"
                    title="Please enter a valid phone number"
                    autoComplete="tel"
                  />

                  <label>Purpose of Visit</label>
                  <input
                    name="purpose"
                    value={form.purpose}
                    onChange={handle}
                    required
                    placeholder="Admission Inquiry, Meeting, Interview, Delivery..."
                  />
                </>
              ) : visitorType === 'student' ? (
                <>
                  <div className="grid2">
                    <div>
                      <label>Student Name</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handle}
                        required
                        placeholder="Student name"
                      />
                    </div>
                    <div>
                      <label>Mobile Number</label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handle}
                        required
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  <div className="grid2">
                    <div>
                      <label>Student Code</label>
                      <input
                        name="code"
                        value={form.code}
                        onChange={handle}
                        placeholder="e.g. STU101"
                      />
                    </div>
                    <div>
                      <label>Course / Class</label>
                      <select name="course" value={form.course} onChange={handle}>
                        {COURSES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label>Batch</label>
                  <select name="batch" value={form.batch} onChange={handle}>
                    {BATCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </>
              ) : visitorType === 'teacher' ? (
                <>
                  <div className="grid2">
                    <div>
                      <label>Teacher Name</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handle}
                        required
                        placeholder="Teacher name"
                      />
                    </div>
                    <div>
                      <label>Mobile Number</label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handle}
                        required
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  <div className="grid2">
                    <div>
                      <label>Teacher Code</label>
                      <input
                        name="code"
                        value={form.code}
                        onChange={handle}
                        placeholder="e.g. TCH01"
                      />
                    </div>
                    <div>
                      <label>Class / Subject</label>
                      <select name="course" value={form.course} onChange={handle}>
                        {COURSES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label>Batch</label>
                  <select name="batch" value={form.batch} onChange={handle}>
                    {BATCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </>
              ) : (
                /* STAFF */
                <>
                  <div className="grid2">
                    <div>
                      <label>Staff Name</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handle}
                        required
                        placeholder="Staff member name"
                      />
                    </div>
                    <div>
                      <label>Mobile Number</label>
                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handle}
                        required
                        placeholder="Phone number"
                      />
                    </div>
                  </div>

                  <div className="grid2">
                    <div>
                      <label>Staff Code</label>
                      <input
                        name="code"
                        value={form.code}
                        onChange={handle}
                        placeholder="e.g. STF01"
                      />
                    </div>
                    <div>
                      <label>Position / Role</label>
                      <select name="position" value={form.position} onChange={handle}>
                        {POSITIONS.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* SELFIE CAMERA SECTION */}
              <label>Selfie Photo</label>
              <div className="camera">
                {cameraOn && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="mirror"
                  />
                )}
                {!cameraOn && photo && <img src={photo} alt="captured" />}
                {!cameraOn && !photo && (
                  <div className="placeholder">
                    <span>📷</span>
                    No photo taken yet
                  </div>
                )}
              </div>

              <div className="camera-controls">
                {cameraOn ? (
                  <div className="camera-btn-group">
                    <button type="button" className="btn primary" onClick={capture}>
                      📸 Capture Photo
                    </button>
                    <button type="button" className="btn danger-soft" onClick={stopCamera} title="Turn off camera">
                      ✕ Turn Off Camera
                    </button>
                  </div>
                ) : !photo ? (
                  <button type="button" className="btn soft block" onClick={startCamera}>
                    🤳 Open Camera
                  </button>
                ) : (
                  <div className="camera-btn-group">
                    <button type="button" className="btn soft" onClick={startCamera}>
                      🔄 Retake Photo
                    </button>
                    <button type="button" className="btn danger-soft" onClick={() => setPhoto('')}>
                      🗑️ Remove Photo
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {mode === 'checkout' && (
            <>
              <label>Phone Number</label>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={handle}
                required
                placeholder="Enter registered phone number"
                pattern="[0-9+ \-]{7,15}"
                title="Please enter a valid phone number"
                autoComplete="tel"
                autoFocus
              />
            </>
          )}

          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

          <button className="btn primary block lg" disabled={loading || (mode === 'checkin' && !photo)}>
            {loading ? 'Please wait...' : mode === 'checkin' ? 'Submit Check In' : 'Submit Check Out'}
          </button>
        </form>
      </div>
    </div>
  );
}
