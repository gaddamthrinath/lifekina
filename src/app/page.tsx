'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles, ShieldCheck, ArrowRight, Lock, Database,
  WifiOff, KeyRound, Receipt, CheckSquare, FileText,
  Calendar, ChevronDown, CheckCircle2, XCircle,
  Bell, Download
} from 'lucide-react';
import PWAInstallPrompt, { usePWAInstall } from '@/components/PWAInstallPrompt';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'tasks' | 'notes' | 'calendar'>('expenses');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { isStandalone, triggerInstall } = usePWAInstall();

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Do I need to sign up or create an account?',
      a: 'No. Lifekina has no account creation, no email signups, and no passwords. The app runs directly in your browser and your data stays on your local device.',
    },
    {
      q: 'Where is my data stored?',
      a: 'All transactions, tasks, notes, and calendar events are stored inside your browser\'s local IndexedDB database. Nothing is sent to an external server or cloud provider.',
    },
    {
      q: 'Can I export or backup my data?',
      a: 'Yes. You can export all your data anytime as a clean JSON backup file with a single click from the Settings page, and restore it on any browser or computer.',
    },
    {
      q: 'Does it work offline?',
      a: 'Yes. Lifekina is a Progressive Web App (PWA). Once loaded, it works completely offline without requiring an active internet connection.',
    },
    {
      q: 'Can I lock my workspace on shared computers?',
      a: 'Yes. Lifekina includes built-in support for WebAuthn (Fingerprint, Face ID, Windows Hello) and an optional 4–6 digit security PIN to prevent unauthorized local access.',
    },
  ];

  return (
    <div className="lp-body">
      {/* ─── Navigation Header ────────────────────────────────────────────── */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" className="lp-logo">
            <div className="lp-logo-icon">
              <Sparkles size={20} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span className="lp-logo-text">Lifekina</span>
          </Link>

          <nav className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#privacy" className="lp-nav-link">Privacy &amp; Local DB</a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
          </nav>

          <Link href="/dashboard" className="lp-nav-btn">
            Launch Workspace <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ─── Hero Section ─────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-badge-pill">
          <Lock size={13} /> Local-First Workspace • No Sign Up • Zero Cloud Servers
        </div>

        <h1 className="lp-hero-title">
          One quiet, private space for your <span className="lp-gradient-text">daily life</span>.
        </h1>

        <p className="lp-hero-sub">
          Track expenses, manage daily tasks, write markdown notes, and schedule calendar reminders.
          Everything runs 100% inside your browser — no tracking, no logins, and zero cloud databases.
        </p>

        <div className="lp-hero-actions">
          <Link href="/dashboard" className="lp-btn-primary">
            Launch Workspace <ArrowRight size={16} />
          </Link>
          {!isStandalone && (
            <button
              type="button"
              onClick={() => triggerInstall()}
              className="lp-btn-outline"
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Download size={15} color="var(--brand-dark)" />
              <span>Install Desktop / Mobile App</span>
            </button>
          )}
          <a href="#features" className="lp-btn-outline">
            Explore Capabilities
          </a>
        </div>

        {/* Core Guarantees Bar */}
        <div className="lp-trust-row">
          <div className="lp-trust-item">
            <Database size={16} className="lp-trust-icon" />
            <span>100% Local IndexedDB</span>
          </div>
          <div className="lp-trust-item">
            <WifiOff size={16} className="lp-trust-icon" />
            <span>Full Offline Access</span>
          </div>
          <div className="lp-trust-item">
            <KeyRound size={16} className="lp-trust-icon" />
            <span>Biometric / PIN Lock</span>
          </div>
          <div className="lp-trust-item">
            <ShieldCheck size={16} className="lp-trust-icon" />
            <span>Zero Tracking or Telemetry</span>
          </div>
        </div>
      </section>

      {/* ─── Interactive Mockup Showcase ─────────────────────────────────── */}
      <div className="lp-preview-container">
        <div className="lp-mockup-window">
          <div className="lp-mockup-bar">
            <div className="lp-mockup-bar-left">
              <div className="lp-mockup-dots">
                <span className="lp-mockup-dot red" />
                <span className="lp-mockup-dot yellow" />
                <span className="lp-mockup-dot green" />
              </div>
              <div className="lp-mockup-title">
                <ShieldCheck size={13} color="#10b981" /> lifekina.local — Private Daily Workspace
              </div>
            </div>
            <div className="lp-mockup-tabs">
              {(['expenses', 'tasks', 'notes', 'calendar'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`lp-mockup-tab-btn ${activeTab === tab ? 'active' : ''}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="lp-mockup-content">
            {activeTab === 'expenses' && (
              <div className="lp-mockup-grid">
                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Monthly Spent</span>
                    <span className="lp-mockup-tag" style={{ background: '#ecfdf5', color: '#059669' }}>September</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>$1,420.50</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Across 18 transactions</div>
                </div>

                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Top Category</span>
                    <span className="lp-mockup-tag" style={{ background: '#f1f5f9', color: '#475569' }}>Groceries</span>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>$580.00</div>
                  <div style={{ width: '100%', height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '42%', height: '100%', background: '#10b981' }} />
                  </div>
                </div>

                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Recent Entries</span>
                    <span className="lp-mockup-tag" style={{ background: '#f8fafc', color: '#64748b' }}>Auto-Sorted</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Morning Coffee</span>
                      <strong style={{ color: '#0f172a' }}>$4.50</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Weekly Market</span>
                      <strong style={{ color: '#0f172a' }}>$84.20</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="lp-mockup-grid">
                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>To Do (2)</span>
                    <span className="lp-mockup-tag" style={{ background: '#fef3c7', color: '#d97706' }}>Pending</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                      Review quarterly financial goals
                    </div>
                    <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                      Renew home utility subscriptions
                    </div>
                  </div>
                </div>

                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>In Progress (1)</span>
                    <span className="lp-mockup-tag" style={{ background: '#e0e7ff', color: '#4338ca' }}>Active</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5 }}>
                    Organize monthly tax invoices
                  </div>
                </div>

                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Completed (4)</span>
                    <span className="lp-mockup-tag" style={{ background: '#ecfdf5', color: '#059669' }}>Done</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12.5, textDecoration: 'line-through', color: '#94a3b8' }}>
                    Backup local workspace data
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="lp-mockup-grid">
                <div className="lp-mockup-card lp-mockup-card-wide">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Weekly Plan &amp; Objectives</span>
                    <span className="lp-mockup-tag" style={{ background: '#ecfdf5', color: '#059669' }}>Pinned</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                    - Optimize monthly grocery and transport budget.<br />
                    - Complete personal development reading list.<br />
                    - Everything stays 100% private in local Markdown storage.
                  </div>
                </div>

                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Book Ideas</span>
                    <span className="lp-mockup-tag" style={{ background: '#f1f5f9', color: '#64748b' }}>Note</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>
                    Quick thoughts on productivity, focus, and local-first computing systems.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="lp-mockup-grid">
                <div className="lp-mockup-card">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Upcoming Alerts</span>
                    <span className="lp-mockup-tag" style={{ background: '#fee2e2', color: '#b91c1c' }}>Today</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                    <Bell size={16} color="#ef4444" />
                    <span>6:00 PM — Evening Reflection</span>
                  </div>
                </div>

                <div className="lp-mockup-card lp-mockup-card-wide">
                  <div className="lp-mockup-card-head">
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Native Notifications</span>
                    <span className="lp-mockup-tag" style={{ background: '#ecfdf5', color: '#059669' }}>Audio &amp; Push</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    Browser Web Notification API integration with pleasant synthesized audio chimes when reminders trigger.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4 Feature Pillars ────────────────────────────────────────────── */}
      <section id="features" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-tag">All-In-One Workspace</div>
          <h2 className="lp-section-title">Four core tools. Zero friction.</h2>
          <p className="lp-section-desc">
            Stop switching between five separate apps. Lifekina unites your daily tracking into a single, cohesive workflow.
          </p>
        </div>

        <div className="lp-features-grid">
          {/* Feature 1 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Receipt size={24} />
            </div>
            <h3 className="lp-feature-title">Expense Tracker</h3>
            <p className="lp-feature-text">
              Log daily expenses with custom categories, multi-currency support, and monthly visual breakdown charts.
            </p>
            <ul className="lp-feature-points">
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Visual category spending charts</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Global currency selection ($, €, ₹, ¥)</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Fast sub-second logging interface</li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <CheckSquare size={24} />
            </div>
            <h3 className="lp-feature-title">Tasks &amp; Kanban</h3>
            <p className="lp-feature-text">
              Organize daily to-dos across Monthly, Weekly, and Quarterly periods with visual Kanban stages.
            </p>
            <ul className="lp-feature-points">
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> To Do, In Progress, Completed boards</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Color-coded priority badges</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Time duration metrics</li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-box" style={{ background: '#fdf4ff', color: '#a855f7' }}>
              <FileText size={24} />
            </div>
            <h3 className="lp-feature-title">Notes &amp; Scratchpad</h3>
            <p className="lp-feature-text">
              Write private markdown notes, capture thoughts on the fly, and pin your most important notes to the top.
            </p>
            <ul className="lp-feature-points">
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Clean markdown note editor</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Instant local autosaving</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Pinning and fast tag search</li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="lp-feature-card">
            <div className="lp-feature-icon-box" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <Calendar size={24} />
            </div>
            <h3 className="lp-feature-title">Calendar &amp; Reminders</h3>
            <p className="lp-feature-text">
              Inspect expenses, tasks, and scheduled alerts on an interactive calendar with native browser notifications.
            </p>
            <ul className="lp-feature-points">
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Interactive Day Activity drawer</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Native Web Notification API alerts</li>
              <li className="lp-feature-point"><CheckCircle2 size={14} color="#10b981" /> Synthesized audio chime triggers</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Privacy & Architecture Comparison ───────────────────────────── */}
      <section id="privacy" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-tag">Privacy Architecture</div>
          <h2 className="lp-section-title">Why local-first matters</h2>
          <p className="lp-section-desc">
            Your personal finances and private notes belong to you — not on remote advertising servers.
          </p>
        </div>

        <div className="lp-comparison-container">
          {/* Cloud Apps */}
          <div className="lp-comp-card lp-comp-cloud">
            <div className="lp-comp-header">
              <div className="lp-comp-title">Traditional Cloud Apps</div>
              <div className="lp-comp-sub">Centralized databases and cloud accounts</div>
            </div>
            <ul className="lp-comp-list">
              <li className="lp-comp-item">
                <XCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Requires mandatory account creation and email sign up.</span>
              </li>
              <li className="lp-comp-item">
                <XCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Financial entries and notes are stored on external servers.</span>
              </li>
              <li className="lp-comp-item">
                <XCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Data tracking, analytics cookies, and telemetry scripts.</span>
              </li>
              <li className="lp-comp-item">
                <XCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Requires active internet connection to function.</span>
              </li>
            </ul>
          </div>

          {/* Lifekina */}
          <div className="lp-comp-card lp-comp-local">
            <span className="lp-comp-badge">Lifekina Standard</span>
            <div className="lp-comp-header">
              <div className="lp-comp-title">Lifekina Local-First</div>
              <div className="lp-comp-sub">100% private, client-side browser database</div>
            </div>
            <ul className="lp-comp-list">
              <li className="lp-comp-item">
                <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>No signup or login ever</strong>. Launch and start immediately.</span>
              </li>
              <li className="lp-comp-item">
                <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>IndexedDB local storage</strong>. All data stays strictly on your device.</span>
              </li>
              <li className="lp-comp-item">
                <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>WebAuthn &amp; PIN Lock</strong>. Secure the app locally with biometric passkeys.</span>
              </li>
              <li className="lp-comp-item">
                <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>1-Click Data Portability</strong>. Export/import complete JSON backups anytime.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── How It Works (3 Steps) ───────────────────────────────────────── */}
      <section id="how-it-works" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-tag">Simplicity First</div>
          <h2 className="lp-section-title">Up and running in 5 seconds</h2>
          <p className="lp-section-desc">
            No verification links. No passwords to remember. Get straight to work.
          </p>
        </div>

        <div className="lp-steps-grid">
          <div className="lp-step-card">
            <div className="lp-step-num">01</div>
            <h3 className="lp-step-title">Open the App</h3>
            <p className="lp-step-desc">
              Click Launch Workspace to start. The app loads instantly into your browser without an account.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-num">02</div>
            <h3 className="lp-step-title">Choose Your Currency</h3>
            <p className="lp-step-desc">
              Select your currency code and preferred date format. Default categories are populated automatically.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-num">03</div>
            <h3 className="lp-step-title">Enjoy Total Privacy</h3>
            <p className="lp-step-desc">
              Track daily expenses, manage tasks, and set reminders knowing everything stays on your machine.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Frequently Asked Questions ──────────────────────────────────── */}
      <section id="faq" className="lp-section">
        <div className="lp-section-header">
          <div className="lp-section-tag">Answers</div>
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
          <p className="lp-section-desc">
            Common questions about local storage, privacy, and device backups.
          </p>
        </div>

        <div className="lp-faq-container">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="lp-faq-item">
                <button
                  className="lp-faq-question"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    color="#64748b"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </button>
                {isOpen && (
                  <div className="lp-faq-answer">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Final CTA Box ───────────────────────────────────────────────── */}
      <section className="lp-section" style={{ paddingTop: 20 }}>
        <div className="lp-cta-box">
          <h2 className="lp-cta-title">Ready for a quiet, private workspace?</h2>
          <p className="lp-cta-desc">
            No signup forms. No credit cards. No passwords. Start organizing your daily life locally today.
          </p>
          <Link href="/dashboard" className="lp-btn-primary" style={{ padding: '16px 36px', fontSize: 16 }}>
            Launch Lifekina Workspace <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-left">
            <div className="lp-logo-icon" style={{ width: 28, height: 28, borderRadius: 8 }}>
              <Sparkles size={14} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
              Lifekina
            </span>
            <span className="lp-footer-text" style={{ marginLeft: 8 }}>
              • 100% Local-First Daily Workspace
            </span>
          </div>

          <div className="lp-footer-links">
            <Link href="/dashboard" className="lp-footer-link">Dashboard</Link>
            <Link href="/entries" className="lp-footer-link">Expenses</Link>
            <Link href="/tasks" className="lp-footer-link">Tasks</Link>
            <Link href="/calendar" className="lp-footer-link">Calendar</Link>
            <Link href="/notes" className="lp-footer-link">Notes</Link>
            <Link href="/settings" className="lp-footer-link">Settings</Link>
          </div>
        </div>
      </footer>

      {/* Interactive PWA Install Prompt Banner & Guide Modal */}
      <PWAInstallPrompt />
    </div>
  );
}

