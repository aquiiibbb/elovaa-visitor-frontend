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

  const startCamera = async () => {
    setMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      setPhoto('');
      setCameraOn(true);
    } catch {
      setMsg({ type: 'error', text: 'Camera nahi khul paya. Browser me camera permission allow karo (site HTTPS par honi chahiye).' });
    }
  };

  // video element render hone ke baad stream attach karo
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraOn]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_W / v.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d').drawImage(v, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.75));
    stopCamera();
  };

  useEffect(() => () => stopCamera(), []);

  const switchMode = (m) => {
    setMode(m);
    setMsg(null);
    stopCamera();
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (mode === 'checkin') {
        const { data } = await axios.post('/api/visitors/checkin', { ...form, photo });
        setMsg({ type: 'success', text: `${data.visitor.name}, aapka check-in ho gaya ✅` });
        setForm(empty);
        setPhoto('');
      } else {
        const { data } = await axios.post('/api/visitors/checkout', { phone: form.phone });
        setMsg({ type: 'success', text: `${data.visitor.name}, aapka check-out ho gaya ✅` });
        setForm(empty);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Kuch galat ho gaya, dobara try karo' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-wrap">
      <div className="card">
        <h2>Visitor {mode === 'checkin' ? 'Check In' : 'Check Out'}</h2>
        <p className="muted">
          {mode === 'checkin' ? 'ELOVAA me aapka swagat hai. Details bharein aur photo click karein.' : 'Apna phone number daalkar check-out karein.'}
        </p>

        <div className="seg">
          <button type="button" className={mode === 'checkin' ? 'active' : ''} onClick={() => switchMode('checkin')}>Check In</button>
          <button type="button" className={mode === 'checkout' ? 'active' : ''} onClick={() => switchMode('checkout')}>Check Out</button>
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
          <input name="phone" type="tel" inputMode="tel" value={form.phone} onChange={handle} required placeholder="Phone number" pattern="[0-9+ \-]{7,15}" title="Valid phone number daalo" autoComplete="tel" />

          {mode === 'checkin' && (
            <>
              <label>Purpose of Visit</label>
              <input name="purpose" value={form.purpose} onChange={handle} required placeholder="Meeting, Interview, Delivery..." />

              <label>Photo</label>
              <div className="camera">
                {cameraOn && <video ref={videoRef} autoPlay playsInline muted />}
                {!cameraOn && photo && <img src={photo} alt="captured" />}
                {!cameraOn && !photo && <div className="placeholder"><span>📷</span>Photo abhi nahi li gayi</div>}
              </div>
              <div className="row">
                {!cameraOn ? (
                  <button type="button" className="btn soft block" onClick={startCamera}>{photo ? 'Retake Photo' : 'Open Camera'}</button>
                ) : (
                  <button type="button" className="btn soft block" onClick={capture}>📸 Click Photo</button>
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
