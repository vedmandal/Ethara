import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '', displayName: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.username || form.username.length < 3) e.username = 'At least 3 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = 'Letters, numbers and _ only';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (form.phone && !/^\+?[0-9\s()-]{7,20}$/.test(form.phone)) e.phone = 'Valid phone required';
    if (!form.password || form.password.length < 6) e.password = 'At least 6 characters';
    return e;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setServerError('');
    try {
      const { data } = await authAPI.register(form);
      navigate('/verify-otp', { state: { userId: data.userId, email: form.email } });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ether-login-page ether-register-page">
      <nav className="ether-login-nav">
        <Link to="/" className="ether-login-logo">ETHER</Link>
        <Link className="ether-login-launch" to="/login">Log In</Link>
      </nav>

      <main className="ether-login-main">
        <div className="ether-login-ambient ether-login-ambient-left" />
        <div className="ether-login-ambient ether-login-ambient-right" />

        <div className="ether-login-shell">
          <section className="ether-login-card ether-register-card">
            <div className="ether-login-heading">
              <h1>
                Join the <span>Ether</span>
              </h1>
              <p>Create your secure identity in the same luminous messaging system.</p>
            </div>

            {serverError && <div className="ether-login-alert">{serverError}</div>}

            <form className="ether-register-form" onSubmit={handleSubmit}>
              <div className="ether-login-field">
                <label htmlFor="displayName">Display Name</label>
                <div className="ether-login-input-wrap">
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.01-8 4.5V21h16v-2.5c0-2.49-3.58-4.5-8-4.5Z" />
                    </svg>
                  </span>
                  <input
                    id="displayName"
                    name="displayName"
                    placeholder="Your full name"
                    value={form.displayName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="ether-login-field">
                <label htmlFor="username">Username</label>
                <div className={`ether-login-input-wrap ${errors.username ? 'ether-field-error' : ''}`}>
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 12a8 8 0 1 1 8 8h-1.4a2.6 2.6 0 1 1 0-5.2H13a3 3 0 1 0-3-3v1.2a2 2 0 1 1-4 0V12Z" />
                    </svg>
                  </span>
                  <input
                    id="username"
                    name="username"
                    placeholder="unique_username"
                    value={form.username}
                    onChange={handleChange}
                    autoFocus
                  />
                </div>
                {errors.username && <p className="ether-login-error">{errors.username}</p>}
              </div>

              <div className="ether-login-field">
                <label htmlFor="email">Email Address</label>
                <div className={`ether-login-input-wrap ${errors.email ? 'ether-field-error' : ''}`}>
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2 8 5 8-5" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="you@ether.protocol"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && <p className="ether-login-error">{errors.email}</p>}
              </div>

              <div className="ether-login-field">
                <label htmlFor="phone">Phone</label>
                <div className={`ether-login-input-wrap ${errors.phone ? 'ether-field-error' : ''}`}>
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6.6 10.8a15.5 15.5 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.24 11.3 11.3 0 0 0 3.56.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.49a1 1 0 0 1 1 1 11.3 11.3 0 0 0 .57 3.56 1 1 0 0 1-.24 1Z" />
                    </svg>
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="+1 555 123 4567"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
                {errors.phone && <p className="ether-login-error">{errors.phone}</p>}
              </div>

              <div className="ether-login-field ether-register-full">
                <label htmlFor="password">Secure Password</label>
                <div className={`ether-login-input-wrap ${errors.password ? 'ether-field-error' : ''}`}>
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 6.7V17a1 1 0 1 0 2 0v-1.3a2 2 0 1 0-2 0ZM10 9V7a2 2 0 1 1 4 0v2h-4Z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                  />
                  <button
                    className="ether-login-visibility"
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {errors.password && <p className="ether-login-error">{errors.password}</p>}
              </div>

              <button className="ether-login-submit ether-register-full" type="submit" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Initialize Account'}
              </button>
            </form>

            <div className="ether-login-links">
              <span>Already part of the protocol?</span>
              <Link to="/login">Log in here</Link>
            </div>

            <div className="ether-login-trust">
              <div>
                <strong>Encrypted</strong>
                <span>Private onboarding with secure OTP verification</span>
              </div>
              <div>
                <strong>Mesh Ready</strong>
                <span>Identity built for decentralized communication</span>
              </div>
              <div>
                <strong>Biometric</strong>
                <span>Ready for device-bound access controls</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
