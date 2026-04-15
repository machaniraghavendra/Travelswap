import { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TravelDashboardPage from './pages/TravelDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { ThemeProvider } from './ThemeContext';

function GlobalModalScrollLock() {
  const lockedRef = useRef(false);
  const scrollYRef = useRef(0);

  useEffect(() => {
    const body = document.body;

    const lock = () => {
      if (lockedRef.current) return;
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '';
      body.style.top = `-${scrollYRef.current}px`;
      body.classList.add('modal-open');
      lockedRef.current = true;
    };

    const unlock = () => {
      if (!lockedRef.current) return;
      body.classList.remove('modal-open');
      body.style.top = '';
      body.style.paddingRight = '';
      const lastY = scrollYRef.current;
      lockedRef.current = false;
      window.scrollTo(0, lastY);
    };

    const update = () => {
      const hasModal = Boolean(document.querySelector('.popup-wrap,[role="dialog"][aria-modal="true"]'));
      if (hasModal) {
        lock();
      } else {
        unlock();
      }
    };

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(update);
    });

    observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', update);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      unlock();
    };
  }, []);

  return null;
}

function AuthGate({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-inline">
          <span className="spinner" aria-hidden="true" />
          <span>Loading TravelSwap...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicGate({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-inline">
          <span className="spinner" aria-hidden="true" />
          <span>Loading TravelSwap...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user?.role === 'TRAVEL') {
      return <Navigate to="/travel/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  function RoleDashboard() {
    const { user } = useAuth();
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (user.role === 'ADMIN') return <AdminDashboardPage />;
    if (user.role === 'TRAVEL') return <Navigate to="/travel/dashboard" replace />;
    return <UserDashboardPage />;
  }

  function TravelOnlyDashboard() {
    const { user } = useAuth();
    if (!user) {
      return <Navigate to="/travel/login" replace />;
    }
    if (user.role !== 'TRAVEL') {
      return <Navigate to="/dashboard" replace />;
    }
    return <TravelDashboardPage />;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <GlobalModalScrollLock />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AuthGate><RoleDashboard /></AuthGate>} />
            <Route path="/travel/dashboard" element={<AuthGate><TravelOnlyDashboard /></AuthGate>} />
            <Route path="/login" element={<PublicGate><LoginPage accountType="USER" /></PublicGate>} />
            <Route path="/travel/login" element={<PublicGate><LoginPage accountType="TRAVEL" /></PublicGate>} />
            <Route path="/register" element={<PublicGate><RegisterPage accountType="USER" /></PublicGate>} />
            <Route path="/travel/register" element={<PublicGate><RegisterPage accountType="TRAVEL" /></PublicGate>} />
            <Route path="/forgot-password" element={<PublicGate><ForgotPasswordPage /></PublicGate>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
