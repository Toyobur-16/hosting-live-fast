import { useState, useEffect, useRef, useCallback } from 'react';
import { playSessionWarningSound } from '../utils/audioAlert';

interface UseIdleTimerOptions {
  enabled: boolean;
  onTimeout: () => void;
  onExtendSession?: () => Promise<boolean | void>;
  defaultTimeoutMinutes?: number;
  warningDurationSeconds?: number;
}

export function useIdleTimer({
  enabled,
  onTimeout,
  onExtendSession,
  defaultTimeoutMinutes = 15,
  warningDurationSeconds = 60
}: UseIdleTimerOptions) {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(warningDurationSeconds);
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const isWarningOpenRef = useRef<boolean>(false);
  isWarningOpenRef.current = isWarningOpen;

  // Read configurable timeout from localStorage
  const getTimeoutMs = useCallback(() => {
    try {
      const stored = localStorage.getItem('bot_idle_timeout_min');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 1) {
          return parsed * 60 * 1000;
        }
      }
    } catch {}
    return defaultTimeoutMinutes * 60 * 1000;
  }, [defaultTimeoutMinutes]);

  const isFeatureEnabled = useCallback(() => {
    try {
      const stored = localStorage.getItem('bot_idle_timer_enabled');
      if (stored !== null) {
        return stored === 'true';
      }
    } catch {}
    return true; // Enabled by default
  }, []);

  // Update activity timestamp (throttled to once per second)
  const lastThrottleRef = useRef<number>(0);
  const registerActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottleRef.current < 1000) return;
    lastThrottleRef.current = now;

    // Only update activity if warning modal is NOT currently open
    if (!isWarningOpenRef.current) {
      lastActivityRef.current = now;
    }
  }, []);

  // Set up event listeners for user activity
  useEffect(() => {
    if (!enabled) {
      setIsWarningOpen(false);
      return;
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown'];
    events.forEach((ev) => window.addEventListener(ev, registerActivity, { passive: true }));

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, registerActivity));
    };
  }, [enabled, registerActivity]);

  // Main idle checking loop
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (!isFeatureEnabled()) return;
      if (isWarningOpenRef.current) return;

      const idleMs = Date.now() - lastActivityRef.current;
      const thresholdMs = getTimeoutMs();

      if (idleMs >= thresholdMs) {
        // Trigger Session Expiring Warning!
        setIsWarningOpen(true);
        setSecondsRemaining(warningDurationSeconds);
        playSessionWarningSound();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [enabled, getTimeoutMs, isFeatureEnabled, warningDurationSeconds]);

  // Countdown loop while warning modal is active
  useEffect(() => {
    if (!isWarningOpen) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsWarningOpen(false);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWarningOpen, onTimeout]);

  // One-click extend session action
  const extendSession = useCallback(async () => {
    setIsExtending(true);
    try {
      if (onExtendSession) {
        await onExtendSession();
      }
      lastActivityRef.current = Date.now();
      setIsWarningOpen(false);
      setSecondsRemaining(warningDurationSeconds);
    } catch (e) {
      console.warn('Failed to extend session:', e);
    } finally {
      setIsExtending(false);
    }
  }, [onExtendSession, warningDurationSeconds]);

  // Trigger test warning for demonstration/settings verification
  const triggerTestWarning = useCallback(() => {
    setIsWarningOpen(true);
    setSecondsRemaining(warningDurationSeconds);
    playSessionWarningSound();
  }, [warningDurationSeconds]);

  return {
    isWarningOpen,
    secondsRemaining,
    isExtending,
    extendSession,
    triggerTestWarning,
    closeWarning: () => setIsWarningOpen(false)
  };
}
