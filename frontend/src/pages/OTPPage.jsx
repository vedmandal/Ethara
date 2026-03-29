import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OTPPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputsRef = useRef([]);

  // Redirect if no state
  useEffect(() => {
    if (!state?.userId) navigate('/register');
  }, [state, navigate]);

  // Countdown for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleInput = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');
    // Auto-advance
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
    // Auto-submit
    if (index === 5 && value) {
      const code = [...newOtp.slice(0, 5), value].join('');
      if (code.length === 6) submitOTP(code);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      submitOTP(pasted);
    }
  };

  const submitOTP = async (code) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await authAPI.verifyOTP({ userId: state.userId, otp: code });
      login(data.user, data.token);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    submitOTP(code);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authAPI.resendOTP({ userId: state.userId });
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  const deliveryTarget = state?.phone || state?.email || 'your account';

  return (
    <div className="auth-page auth-reference-page">
      <div className="auth-reference-shell auth-reference-single">
        <div className="auth-device-shell">
          <div className="auth-device-card auth-device-card-otp">
            <div className="otp-topbar">
              <button className="otp-back-btn" type="button" onClick={() => navigate(-1)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className="otp-brand">Fluid Dialogue</span>
            </div>

            <h2 className="auth-device-title otp-title">Verify Your Account</h2>
            <p className="auth-device-subtitle otp-subtitle">
              Sent to <strong>{deliveryTarget}</strong>
            </p>

            {error && (
              <div className="auth-alert auth-alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="otp-inputs otp-inputs-pill" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    className="otp-input otp-input-pill"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleInput(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button className="btn btn-primary btn-full auth-device-cta otp-cta" type="submit" disabled={loading || otp.join('').length !== 6}>
                {loading ? <span className="spinner spinner-sm" /> : 'Verify'}
                {!loading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                )}
              </button>
            </form>

            <p className="otp-resend-text">
              Didn’t receive the code?
            </p>
            <div className="otp-resend-link">
              {countdown > 0 ? (
                <span>Resend code in 00:{String(countdown).padStart(2, '0')}</span>
              ) : (
                <button onClick={handleResend} disabled={resending} type="button">
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </div>

            <div className="otp-security-note">
              <div className="otp-security-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2 4 5v6c0 5 3.4 9.4 8 10.8 4.6-1.4 8-5.8 8-10.8V5l-8-3Z" />
                </svg>
              </div>
              <div>
                <strong>Secure Verification</strong>
                <p>We use end-to-end encrypted signals to ensure your identity remains private and secure.</p>
              </div>
            </div>

            <div className="otp-footer-note">Fluid dialogue messaging • privacy policy • terms of service</div>
          </div>
        </div>
      </div>
    </div>
  );
}
