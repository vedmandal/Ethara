import React from 'react';
import { Link } from 'react-router-dom';

const featureCards = [
  {
    title: 'Real-time Security',
    copy: 'Quantum-resistant encryption layers verify every packet in real time without compromising speed.',
    tone: 'primary',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 5 6v5c0 4.8 2.9 8.9 7 10 4.1-1.1 7-5.2 7-10V6l-7-3Z" />
      </svg>
    ),
  },
  {
    title: 'High-Fidelity Media',
    copy: 'Share crisp photos, voice notes, and video without flattening quality across desktop and mobile.',
    tone: 'secondary',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Zm3 1v8h10V8H7Zm2 2h6v4H9v-4Z" />
      </svg>
    ),
  },
  {
    title: 'Encrypted Calls',
    copy: 'Crystal clear audio and video with low-latency tunnels built for private conversations that stay stable.',
    tone: 'tertiary',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 8.5V6.8c0-1.3 1.4-2.1 2.5-1.4l3 1.8c1 .6 1 2.1 0 2.7l-3 1.8A1.67 1.67 0 0 1 15 10.2V8.5ZM4 7a3 3 0 0 1 3-3h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z" />
      </svg>
    ),
  },
];

const bullets = [
  'Adaptive visuals that feel at home in low light and focused workspaces.',
  'Identity-first security with device verification and private recovery flows.',
  'Modern messaging architecture ready for mobile, desktop, and teams.',
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="lp-topbar">
        <Link to="/" className="lp-brand">ETHER</Link>
        <div className="lp-topbar-actions">
          <Link className="lp-btn lp-btn-ghost" to="/login">Login</Link>
          <Link className="lp-btn lp-btn-primary" to="/register">Launch App</Link>
        </div>
      </header>

      <main className="lp-main">
        <section className="lp-hero">
          <div className="lp-orb lp-orb-primary" />
          <div className="lp-orb lp-orb-tertiary" />

          <div className="lp-hero-copy">
            <p className="lp-eyebrow">Protocol for the next dimension</p>
            <h1>
              ETHER: <span>Next-Gen</span> Messaging.
            </h1>
            <p className="lp-hero-text">
              Fluid, encrypted communication wrapped in a cinematic interface that feels fast, calm, and premium from the first touch.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-btn lp-btn-primary lp-btn-large" to="/register">Get Started</Link>
              <Link className="lp-btn lp-btn-panel lp-btn-large" to="/login">Login</Link>
            </div>
          </div>

          <div className="lp-shell-wrap" aria-hidden="true">
            <div className="lp-shell-glow" />
            <div className="lp-shell">
              <div className="lp-shell-topbar">
                <div className="lp-shell-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <p>Luminous Ether Protocol</p>
              </div>

              <div className="lp-shell-body">
                <aside className="lp-shell-rail">
                  <div className="lp-rail-icon lp-rail-icon-active" />
                  <div className="lp-rail-icon" />
                  <div className="lp-rail-icon" />
                  <div className="lp-rail-spacer" />
                  <div className="lp-rail-icon" />
                </aside>

                <div className="lp-chat-card">
                  <div className="lp-message lp-message-out">
                    The latency is non-existent. How did you manage the encryption layer?
                  </div>
                  <div className="lp-message lp-message-in">
                    We rebuilt the transport around a lighter protocol and kept the privacy guarantees intact.
                  </div>
                  <div className="lp-compose">
                    <span className="lp-compose-plus">+</span>
                    <span>Type a message...</span>
                    <span className="lp-compose-send">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 20 21 12 3 4l2.8 6.5L14 12l-8.2 1.5L3 20Z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-flow-section">
          <div className="lp-section-heading">
            <p className="lp-eyebrow">Built as one continuous experience</p>
            <h2>Everything important, in one landing page.</h2>
          </div>

          <div className="lp-feature-grid">
            {featureCards.map((feature) => (
              <article key={feature.title} className={`lp-feature-card lp-${feature.tone}`}>
                <div className="lp-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section lp-showcase">
          <div className="lp-visual-panel">
            <div className="lp-visual-noise" />
            <div className="lp-visual-tag">
              <span />
              Protocol Active
            </div>
          </div>

          <div className="lp-showcase-copy">
            <p className="lp-eyebrow">One clear story</p>
            <h2>A landing page with a pulse, not a menu of separate sections.</h2>
            <p>
              This version keeps the Stitch atmosphere but presents it as one cohesive homepage. The content flows naturally from hero to proof points to call to action without desktop-only category jumping.
            </p>
            <ul className="lp-bullets">
              {bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lp-section lp-cta">
          <div className="lp-cta-glow" />
          <div className="lp-cta-content">
            <p className="lp-eyebrow">Start the conversation</p>
            <h2>Ready to evolve?</h2>
            <p>Join the protocol that reframes modern messaging around speed, privacy, and presence.</p>
            <div className="lp-hero-actions">
              <Link className="lp-btn lp-btn-light lp-btn-large" to="/register">Download Now</Link>
              <Link className="lp-btn lp-btn-panel lp-btn-large" to="/login">Read Whitepaper</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div>
          <p className="lp-footer-brand">ETHER</p>
          <p className="lp-footer-copy">© 2026 ETHER. Protocol for the next dimension.</p>
        </div>
        <div className="lp-footer-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Create Account</Link>
          <Link to="/forgot-password">Reset Password</Link>
        </div>
      </footer>
    </div>
  );
}
