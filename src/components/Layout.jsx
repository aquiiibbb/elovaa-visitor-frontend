import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import logo from '../assets/logo.png';

export default function Layout({ children }) {
  const { logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <img src={logo} alt="ELOVAA" className="topbar-logo" />
          <nav className="topnav">
            <NavLink to="/" end>Visitor Form</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
          </nav>
          <button className="btn ghost sm" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">© {new Date().getFullYear()} ELOVAA · Visitor Management</footer>
    </div>
  );
}
