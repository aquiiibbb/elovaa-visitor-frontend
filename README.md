# ELOVAA Frontend (React + Vite)

## Local Development
```bash
cd frontend
npm install
npm run dev
```
Open in browser: `http://localhost:5173` (ensure backend is running first).

## Configuration
Configure `VITE_API_URL` in `.env`:
- Local: `http://localhost:5000`
- Production: `https://elovaa-backend-visitor.onrender.com`

## Admin Credentials
- **Email**: `elovaaacadmy@gmail.com`
- **Password**: `elovaa#012`

## Production Build
```bash
npm run build
```
Build output generated in `dist/`.

## Deployment (Vercel)
1. Repository: [https://github.com/aquiiibbb/elovaa-visitor-frontend](https://github.com/aquiiibbb/elovaa-visitor-frontend)
2. Framework Preset: `Vite`
3. Environment Variable:
   - `VITE_API_URL`: Backend API URL (without trailing slash)
