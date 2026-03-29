import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // email | otp | reset
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await authAPI.forgotPassword({ email });
      setUserId(data.userId);
      setStep('otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const handleOTP = (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setStep('reset');
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 chars'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword({ userId, otp, newPassword: password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="auth-logo-text">Pulse<span>Chat</span></span>
        </div>

        {step === 'email' && (
          <>
            <h2>Forgot password?</h2>
            <p>Enter your email and we'll send a reset code</p>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleEmail}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Send Reset Code'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            <h2>Enter OTP</h2>
            <p>We sent a 6-digit code to <strong>{email}</strong></p>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleOTP}>
              <div className="form-group">
                <label className="form-label">OTP Code</label>
                <input className="form-input" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="123456" autoFocus style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} />
              </div>
              <button className="btn btn-primary btn-full" type="submit">Continue</button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <h2>New password</h2>
            <p>Choose a strong password for your account</p>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
          <Link to="/login" style={{ color: 'var(--green-primary)', fontWeight: 600 }}>← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
