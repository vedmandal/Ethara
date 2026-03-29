/**
 * App Root - Router, Providers, Protected Routes
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OTPPage from './pages/OTPPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChatPage from './pages/ChatPage';
import LoadingScreen from './components/shared/LoadingScreen';
import './index.css';

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

// ─── Public Route (redirect if logged in) ─────────────────────────────────────
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return !user ? children : <Navigate to="/app" replace />;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/app" replace /> : <LandingPage />;
};

// ─── App Routes ───────────────────────────────────────────────────────────────
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomeRoute />} />
    <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
    <Route path="/verify-otp" element={<PublicRoute><OTPPage /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
    <Route path="/app" element={
      <ProtectedRoute>
        <ChatProvider>
          <ChatPage />
        </ChatProvider>
      </ProtectedRoute>
    } />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
