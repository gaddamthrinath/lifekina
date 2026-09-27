'use client';

import { useState, useEffect } from 'react';
import { Download, Laptop, Smartphone, Check, X, Sparkles, Share, PlusSquare, Monitor, ArrowRight, HelpCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();
let openModalGlobal: (() => void) | null = null;

export function triggerPWAInstall() {
  if (typeof window === 'undefined') return;

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    ((navigator as unknown as { standalone?: boolean }).standalone === true);

  if (isStandalone) {
    alert('Lifekina is already installed and running in standalone app mode!');
    return;
  }

  if (globalDeferredPrompt) {
    globalDeferredPrompt.prompt().then(() => {
      globalDeferredPrompt!.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
          globalDeferredPrompt = null;
          installListeners.forEach(fn => fn(false));
        }
      });
    }).catch(() => {
      if (openModalGlobal) openModalGlobal();
    });
  } else {
    if (openModalGlobal) openModalGlobal();
  }
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ((navigator as unknown as { standalone?: boolean }).standalone === true);
    setIsStandalone(checkStandalone);

    if (globalDeferredPrompt) {
      setCanInstall(true);
    }

    const listener = (val: boolean) => setCanInstall(val);
    installListeners.add(listener);

    return () => {
      installListeners.delete(listener);
    };
  }, []);

  return { canInstall, isStandalone, triggerInstall: triggerPWAInstall };
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState<'windows' | 'mac' | 'android' | 'ios' | 'other'>('windows');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ((navigator as unknown as { standalone?: boolean }).standalone === true);
    setIsStandalone(checkStandalone);
    if (checkStandalone) return;

    // Detect user platform
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua)) setPlatform('android');
    else if (/macintosh|mac os x/.test(ua)) setPlatform('mac');
    else if (/windows|win32|win64/.test(ua)) setPlatform('windows');
    else setPlatform('other');

    // Register global modal opener
    openModalGlobal = () => setShowModal(true);

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('lifekina_pwa_banner_dismissed');
    if (!dismissedAt || (Date.now() - Number(dismissedAt) > 48 * 60 * 60 * 1000)) {
      setShowBanner(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      installListeners.forEach(fn => fn(true));
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowBanner(false);
      setShowModal(false);
      setIsStandalone(true);
      installListeners.forEach(fn => fn(false));
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      openModalGlobal = null;
    };
  }, []);

  const handleInstallAction = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          globalDeferredPrompt = null;
          setDeferredPrompt(null);
          setShowBanner(false);
          setShowModal(false);
          installListeners.forEach(fn => fn(false));
        }
      } catch {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('lifekina_pwa_banner_dismissed', String(Date.now()));
  };

  if (isStandalone) return null;

  return (
    <>
      {/* Floating Bottom Install Banner */}
      {showBanner && (
        <div className="pwa-install-banner" role="dialog" aria-label="Install Lifekina App">
          <div className="pwa-banner-content">
            <div className="pwa-banner-icon">
              <Sparkles size={20} color="#fff" strokeWidth={2.5} />
            </div>
            <div className="pwa-banner-text">
              <div className="pwa-banner-title">Install Lifekina App</div>
              <div className="pwa-banner-sub">
                Run as a standalone native app on {platform === 'windows' ? 'Windows' : platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Desktop'} with 100% offline access.
              </div>
            </div>
          </div>
          <div className="pwa-banner-actions">
            <button className="btn btn-primary btn-sm" onClick={handleInstallAction}>
              <Download size={14} /> Install App
            </button>
            <button className="ibtn" onClick={handleDismissBanner} title="Dismiss for now">
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Interactive App Installation Guide Modal */}
      {showModal && (
        <div className="modal-bg" onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Sparkles size={16} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="modal-title">Install Lifekina App</div>
                  <div className="modal-sub">Standalone window • Pin to Taskbar • 100% Offline</div>
                </div>
              </div>
              <button className="ibtn" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Direct 1-Click Install Button if supported */}
              {deferredPrompt && (
                <div style={{ padding: '14px 16px', background: 'var(--brand-light)', borderRadius: 8, border: '1.5px solid var(--brand-mid)', textAlign: 'center' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--brand-dark)', marginBottom: 8 }}>
                    1-Click Direct Installation Ready
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px 18px', fontSize: 14 }}
                    onClick={handleInstallAction}
                  >
                    <Download size={16} /> Click to Install Lifekina Now
                  </button>
                </div>
              )}

              {/* Windows / Desktop Chrome / Edge Instructions */}
              {(platform === 'windows' || platform === 'mac' || platform === 'other') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <Monitor size={14} color="var(--brand-dark)" /> Windows &amp; Desktop Browser Steps:
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      1
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Look for the <strong>Install icon</strong> (computer with down arrow) in your browser address bar at the top-right.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      2
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Or click the browser menu (<strong>⋮</strong> on Chrome / <strong>⋯</strong> on Edge) &rarr; select <strong>&quot;Install Lifekina&quot;</strong>.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      3
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Click <strong>Install</strong>. Lifekina will launch in its own desktop window and add a shortcut to your Start Menu and Desktop.
                    </div>
                  </div>
                </div>
              )}

              {/* Android Instructions */}
              {platform === 'android' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <Smartphone size={14} color="var(--brand-dark)" /> Android Chrome Steps:
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      1
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Tap the Chrome menu (<strong>⋮</strong>) in the top-right corner.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      2
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Tap <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                    </div>
                  </div>
                </div>
              )}

              {/* iOS Instructions */}
              {platform === 'ios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <Smartphone size={14} color="var(--brand-dark)" /> iPhone / iPad Safari Steps:
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      1
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Tap the <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Share size={12} /> Share</strong> button in Safari toolbar.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>
                      2
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-main)', lineHeight: 1.4 }}>
                      Scroll down and tap <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><PlusSquare size={12} /> Add to Home Screen</strong>.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-foot">
              <button className="btn btn-primary btn-sm" onClick={() => setShowModal(false)}>
                <Check size={14} /> Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
