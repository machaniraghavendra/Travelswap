import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import UserDashboardPage from './pages/UserDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TravelDashboardPage from './pages/TravelDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import { ThemeProvider } from './ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';

function AuthGate({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-shell">Loading TravelSwap...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicGate({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="loading-shell">Loading TravelSwap...</div>;
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
          <ThemeSwitcher />
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
