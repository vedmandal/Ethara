import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const isPhoneLike = (value) => /^[+\d\s()-]+$/.test(value.trim()) && /\d{6,}/.test(value);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.login(form);
      login(data.user, data.token);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const helperLabel = isPhoneLike(form.identifier)
    ? 'Phone number detected'
    : 'Use the email or phone tied to your account';

  return (
    <div className="ether-login-page">
      <nav className="ether-login-nav">
        <Link to="/" className="ether-login-logo">ETHER</Link>
        <Link className="ether-login-launch" to="/register">Launch App</Link>
      </nav>

      <main className="ether-login-main">
        <div className="ether-login-ambient ether-login-ambient-left" />
        <div className="ether-login-ambient ether-login-ambient-right" />

        <div className="ether-login-shell">
          <section className="ether-login-card">
            <div className="ether-login-heading">
              <h1>
                Enter the <span>Ether</span>
              </h1>
              <p>Sign in to your secure identity in the next dimension of messaging.</p>
            </div>

            {error && <div className="ether-login-alert">{error}</div>}

            <form className="ether-login-form" onSubmit={handleSubmit}>
              <div className="ether-login-field">
                <label htmlFor="identifier">Email or Phone</label>
                <div className="ether-login-input-wrap">
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2 8 5 8-5" />
                    </svg>
                  </span>
                  <input
                    id="identifier"
                    type="text"
                    name="identifier"
                    placeholder="you@ether.protocol or +91 98765 43210"
                    value={form.identifier}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                </div>
                <p className="ether-login-hint">{helperLabel}</p>
              </div>

              <div className="ether-login-field">
                <label htmlFor="password">Secure Password</label>
                <div className="ether-login-input-wrap">
                  <span className="ether-login-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm-6 6.7V17a1 1 0 1 0 2 0v-1.3a2 2 0 1 0-2 0ZM10 9V7a2 2 0 1 1 4 0v2h-4Z" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
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
              </div>

              <button className="ether-login-submit" type="submit" disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Initialize Session'}
              </button>
            </form>

            <div className="ether-login-links">
              <Link to="/forgot-password">Forgot password?</Link>
              <span>•</span>
              <Link to="/register">Create account</Link>
            </div>

            <div className="ether-login-trust">
              <div>
                <strong>Encrypted</strong>
                <span>End-to-end session protection</span>
              </div>
              <div>
                <strong>Mesh Ready</strong>
                <span>Built for decentralized delivery</span>
              </div>
              <div>
                <strong>Biometric</strong>
                <span>Device-level access control</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
