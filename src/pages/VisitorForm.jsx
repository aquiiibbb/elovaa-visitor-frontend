import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const empty = { name: '', email: '', phone: '', purpose: '' };
const MAX_W = 640;

export default function VisitorForm() {
  const [mode, setMode] = useState('checkin');
  const [form, setForm] = useState(empty);
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
          height: { ideal: 720 }
        },
        audio: false
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
        text: 'Unable to access camera. Please grant camera permission in your browser (HTTPS required).'
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

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (mode === 'checkin' && !photo) {
      setMsg({ type: 'error', text: 'Please capture a photo before submitting check-in.' });
      return;
    }
    setLoading(true);
    try {
      if (mode === 'checkin') {
        const { data } = await axios.post('/api/visitors/checkin', { ...form, photo });
        setMsg({ type: 'success', text: `Welcome ${data.visitor.name}, your check-in is complete! ✅` });
        setForm(empty);
        setPhoto('');
      } else {
        const { data } = await axios.post('/api/visitors/checkout', { phone: form.phone });
        setMsg({ type: 'success', text: `Thank you ${data.visitor.name}, your check-out is complete! ✅` });
        setForm(empty);
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
            ? 'Welcome to ELOVAA. Please enter your details and capture a selfie photo.'
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
            <div className="grid2">
              <div>
                <label>Name</label>
                <input name="name" value={form.name} onChange={handle} required placeholder="Full name" autoComplete="name" />
              </div>
              <div>
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={handle} required placeholder="email@example.com" autoComplete="email" />
              </div>
            </div>
          )}

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

          {mode === 'checkin' && (
            <>
              <label>Purpose of Visit</label>
              <input name="purpose" value={form.purpose} onChange={handle} required placeholder="Meeting, Interview, Delivery..." />

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

          {msg && <div className={`msg ${msg.type}`}>{msg.text}</div>}

          <button className="btn primary block lg" disabled={loading || (mode === 'checkin' && !photo)}>
            {loading ? 'Please wait...' : mode === 'checkin' ? 'Submit Check In' : 'Submit Check Out'}
          </button>
        </form>
      </div>
    </div>
  );
}
