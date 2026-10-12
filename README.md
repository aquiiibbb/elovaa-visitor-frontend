# ELOVAA Frontend (React + Vite)

## Run (local)
```
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173  (backend pehle chalu hona chahiye)

`.env` me `VITE_API_URL` backend ka link hai (local: http://localhost:5000).

## Login
- Email: elovaaacadmy@gmail.com
- Password: elovaa#012

## Build
```
npm run build      # dist/ folder banega
```

## Deploy (Vercel ya Netlify)
1. `frontend` folder GitHub par daalo (ya Root Directory = `frontend`).
2. Build command: `npm run build`, Output directory: `dist`.
3. Environment variable: `VITE_API_URL` = backend ka deployed link (e.g. https://elovaa-visitor-backend.onrender.com), bina last `/` ke.
4. Deploy ke baad frontend ka link backend ke `FRONTEND_URL` me daalo (Render env) taaki CORS allow ho.
