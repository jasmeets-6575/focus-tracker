'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CameraTracker } from '@/components/CameraTracker';
import { InfoHint } from '@/components/InfoHint';
import { Stopwatch } from '@/components/Stopwatch';
import { ToggleSwitch } from '@/components/ToggleSwitch';
import { ProtectedAction, useParentalLock } from '@/hooks/useParentalLock';
import { usePresenceDetection } from '@/hooks/usePresenceDetection';
import { useSleepBuzzer } from '@/hooks/useSleepBuzzer';
import { useStopwatch } from '@/hooks/useStopwatch';

const SLEEP_BUZZER_DELAY_MS = 10_000;
const HIDE_AUTO_OFF_OPTIONS = [
  { label: '5 seconds', value: 5000 },
  { label: '10 seconds', value: 10000 },
  { label: '30 seconds', value: 30000 }
];

export default function Page() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [autoModeEnabled, setAutoModeEnabled] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [privacyGuardEnabled, setPrivacyGuardEnabled] = useState(true);
  const [hideAutoOffMs, setHideAutoOffMs] = useState(10000);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);

  const hiddenCameraTimeoutRef = useRef<number | null>(null);

  const {
    cameraEnabled,
    detectionActive,
    personPresent,
    eyesClosed,
    isSleeping,
    lastSeenAt,
    detectionLoopRunning,
    absenceGraceRemainingMs,
    sleepGraceRemainingMs,
    cameraStatus,
    presenceStatus,
    alertnessStatus,
    errorMessage,
    enableCamera,
    disableCamera
  } = usePresenceDetection({
    videoRef,
    gracePeriodMs: 3000,
    detectionIntervalMs: 200,
    minDetectionConfidence: 0.6,
    eyeClosedThreshold: 0.55,
    sleepGraceMs: 2000
  });

  const stopwatch = useStopwatch({ initialMs: 0 });
  const { setRunGate } = stopwatch;

  const executeLockedAction = (action: ProtectedAction) => {
    if (action === 'pause') {
      stopwatch.pause();
      return;
    }

    disableCamera();
  };

  const {
    parentalControlEnabled,
    parentalPassword,
    parentalError,
    lockedAction,
    unlockPassword,
    unlockError,
    isUnlockCooldownActive,
    setParentalPassword,
    setUnlockPassword,
    handleParentalToggle,
    requestProtectedAction,
    handleUnlockConfirm,
    cancelUnlock
  } = useParentalLock({ onExecuteAction: executeLockedAction });

  const { buzzerActive, buzzerDismissed, sleepAlarmRemainingMs, buzzerError, dismissBuzzer } = useSleepBuzzer({
    isSleeping,
    delayMs: SLEEP_BUZZER_DELAY_MS
  });

  const autoRunGate = useMemo(() => {
    if (!autoModeEnabled) {
      return true;
    }
    if (!cameraEnabled || !detectionActive) {
      return true;
    }

    return personPresent && !isSleeping;
  }, [autoModeEnabled, cameraEnabled, detectionActive, personPresent, isSleeping]);

  useEffect(() => {
    setRunGate(autoRunGate);
  }, [autoRunGate, setRunGate]);

  useEffect(() => {
    const originalConsoleError = console.error;

    console.error = (...args: unknown[]) => {
      const firstArg = typeof args[0] === 'string' ? args[0] : '';
      const isKnownWasmInfo =
        firstArg.includes('Created TensorFlow Lite XNNPACK delegate for CPU') ||
        firstArg.includes('INFO: Created TensorFlow Lite XNNPACK delegate for CPU');

      if (isKnownWasmInfo) {
        return;
      }

      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    if (!privacyGuardEnabled || !cameraEnabled) {
      if (hiddenCameraTimeoutRef.current !== null) {
        window.clearTimeout(hiddenCameraTimeoutRef.current);
        hiddenCameraTimeoutRef.current = null;
      }
      return;
    }

    const clearHideTimer = () => {
      if (hiddenCameraTimeoutRef.current !== null) {
        window.clearTimeout(hiddenCameraTimeoutRef.current);
        hiddenCameraTimeoutRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      clearHideTimer();

      if (!document.hidden) {
        return;
      }

      hiddenCameraTimeoutRef.current = window.setTimeout(() => {
        disableCamera();
        setPrivacyNotice(`Camera auto-disabled after ${Math.round(hideAutoOffMs / 1000)}s in hidden tab.`);
      }, hideAutoOffMs);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearHideTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [cameraEnabled, disableCamera, hideAutoOffMs, privacyGuardEnabled]);

  const timerStatus = stopwatch.isRunning ? 'Running' : 'Paused';

  const renderSidebarContent = (scope: 'desktop' | 'mobile') => (
    <>
      <section className="card small">
        <h2 className="section-title">
          Camera Controls
          <InfoHint
            label="Camera controls info"
            text="Manage camera, auto tracking, and quick status from here."
          />
        </h2>
        <div className="status-grid">
          <span className={`badge ${cameraEnabled ? 'success' : 'neutral'}`}>Camera: {cameraStatus}</span>
          <span className={`badge ${presenceStatus === 'Present' ? 'success' : 'warning'}`}>Presence: {presenceStatus}</span>
          <span className={`badge ${alertnessStatus === 'Sleeping' ? 'warning' : 'success'}`}>Alertness: {alertnessStatus}</span>
        </div>
        <div className="toggle-row">
          <label className="switch-label" htmlFor={`auto-mode-toggle-${scope}`}>
            Auto camera tracking
          </label>
          <ToggleSwitch
            id={`auto-mode-toggle-${scope}`}
            label="Auto camera tracking"
            checked={autoModeEnabled}
            onChange={setAutoModeEnabled}
          />
        </div>
      </section>

      <section className="card small">
        <h2 className="section-title">
          Privacy Guard
          <InfoHint
            label="Privacy guard info"
            text="Auto turns camera off if this tab stays hidden for selected time. Emergency Camera Off is always available."
          />
        </h2>
        <div className="toggle-row">
          <label className="switch-label" htmlFor={`privacy-guard-toggle-${scope}`}>
            Auto camera-off on hidden tab
          </label>
          <ToggleSwitch
            id={`privacy-guard-toggle-${scope}`}
            label="Auto camera-off on hidden tab"
            checked={privacyGuardEnabled}
            onChange={setPrivacyGuardEnabled}
          />
        </div>
        <label className="field-label">
          Hidden-tab timeout
          <select value={hideAutoOffMs} onChange={(event) => setHideAutoOffMs(Number(event.target.value))}>
            {HIDE_AUTO_OFF_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="button-row">
          <button
            type="button"
            onClick={() => {
              disableCamera();
              setPrivacyNotice('Camera disabled by emergency privacy action.');
            }}
          >
            Emergency Camera Off
          </button>
        </div>
      </section>

      <section className="card small">
        <h2 className="section-title">
          Parental Control
          <InfoHint
            label="Parental control info"
            text="When enabled, Pause and Disable Camera require parental password confirmation."
          />
        </h2>
        <div className="toggle-row">
          <label className="switch-label" htmlFor={`parental-control-toggle-${scope}`}>
            Lock Pause + Disable Camera
          </label>
          <ToggleSwitch
            id={`parental-control-toggle-${scope}`}
            label="Lock Pause and Disable Camera"
            checked={parentalControlEnabled}
            onChange={handleParentalToggle}
          />
        </div>
        <label className="field-label">
          Parental password
          <input
            type="password"
            value={parentalPassword}
            autoComplete="new-password"
            onChange={(event) => setParentalPassword(event.target.value)}
            placeholder="Set password"
          />
        </label>
        {parentalError ? <p className="error-text">{parentalError}</p> : null}
      </section>

      <section className="card small">
        <h2 className="section-title">
          Sleep Alert Buzzer
          <InfoHint
            label="Sleep alert info"
            text="If sleeping is detected continuously for 10 seconds, buzzer starts. Stop Buzzer mutes it until you are awake again."
          />
        </h2>
        <p className="subtitle">Siren starts if sleep is detected for 10 seconds.</p>
        <div className="status-grid">
          <span className={`badge ${buzzerActive ? 'warning' : 'neutral'}`}>Alarm: {buzzerActive ? 'Ringing' : 'Silent'}</span>
          <span className="badge neutral">Trigger In: {(sleepAlarmRemainingMs / 1000).toFixed(1)}s</span>
        </div>
        <div className="button-row">
          <button type="button" onClick={dismissBuzzer}>
            Stop Buzzer
          </button>
        </div>
        {buzzerDismissed && isSleeping ? <p className="subtitle">Alarm muted until eyes open again.</p> : null}
        {buzzerError ? <p className="error-text">{buzzerError}</p> : null}
      </section>

    </>
  );

  return (
    <main className="container app-shell">
      <header>
        <div className="header-top">
          <h1 className="section-title">
            Focus Timer
            <InfoHint
              label="App info"
              text="Tracks focus time with local webcam presence and eye-closure detection. Video processing stays in your browser."
            />
          </h1>
          <button type="button" className="mobile-sidebar-toggle" onClick={() => setMobileSidebarOpen(true)}>
            Settings
          </button>
        </div>
        <p className="subtitle">Stay focused. Timer runs while you are present and alert.</p>
      </header>

      <div className="status-grid top-status-grid">
        <span className={`badge ${timerStatus === 'Running' ? 'success' : 'neutral'}`}>Timer: {timerStatus}</span>
        <span className={`badge ${cameraEnabled ? 'success' : 'neutral'}`}>Camera: {cameraStatus}</span>
        <span className={`badge optional-mobile ${presenceStatus === 'Present' ? 'success' : 'warning'}`}>
          Presence: {presenceStatus}
        </span>
        <span className={`badge optional-mobile ${alertnessStatus === 'Sleeping' ? 'warning' : 'success'}`}>
          Alertness: {alertnessStatus}
        </span>
        <span className={`badge optional-mobile ${parentalControlEnabled ? 'warning' : 'neutral'}`}>
          Parental Lock: {parentalControlEnabled ? 'On' : 'Off'}
        </span>
        <span className={`badge optional-mobile ${privacyGuardEnabled ? 'success' : 'warning'}`}>
          Privacy Guard: {privacyGuardEnabled ? 'On' : 'Off'}
        </span>
      </div>
      {privacyNotice ? <p className="subtitle notice-text">{privacyNotice}</p> : null}

      <div className="layout-grid">
        <div className="panel-stack focus-main">
          <Stopwatch
            elapsedMs={stopwatch.elapsedMs}
            initialMs={stopwatch.initialMs}
            isRunning={stopwatch.isRunning}
            onInitialMsChange={stopwatch.setInitialMs}
            onStart={stopwatch.start}
            onPause={() => requestProtectedAction('pause')}
            onReset={stopwatch.reset}
          />

          <CameraTracker
            videoRef={videoRef}
            cameraStatus={cameraStatus}
            presenceStatus={presenceStatus}
            alertnessStatus={alertnessStatus}
            detectionActive={detectionActive}
            detectionLoopRunning={detectionLoopRunning}
            lastSeenAt={lastSeenAt}
            absenceGraceRemainingMs={absenceGraceRemainingMs}
            sleepGraceRemainingMs={sleepGraceRemainingMs}
            eyesClosed={eyesClosed}
            errorMessage={errorMessage}
            autoModeEnabled={autoModeEnabled}
            onAutoModeChange={setAutoModeEnabled}
            onEnableCamera={enableCamera}
            onDisableCamera={() => requestProtectedAction('disableCamera')}
            showDebug={false}
          />
        </div>

        <aside className="panel-stack sidebar-desktop">{renderSidebarContent('desktop')}</aside>
      </div>

      {mobileSidebarOpen ? (
        <section className="mobile-sidebar-backdrop" role="dialog" aria-modal="true" aria-label="Sidebar settings">
          <aside className="mobile-sidebar">
            <div className="mobile-sidebar-header">
              <h2>Settings</h2>
              <button type="button" onClick={() => setMobileSidebarOpen(false)}>
                Close
              </button>
            </div>
            <div className="mobile-sidebar-content">{renderSidebarContent('mobile')}</div>
          </aside>
        </section>
      ) : null}

      {lockedAction ? (
        <section className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
          <div className="modal-card">
            <h2 id="unlock-title">Parental Password Required</h2>
            <p className="subtitle">
              Enter password to {lockedAction === 'pause' ? 'pause the timer' : 'disable the camera'}.
            </p>
            <label>
              Password
              <input
                type="password"
                value={unlockPassword}
                autoComplete="current-password"
                onChange={(event) => setUnlockPassword(event.target.value)}
                autoFocus
              />
            </label>
            {unlockError ? <p className="error-text">{unlockError}</p> : null}
            <div className="button-row">
              <button
                type="button"
                onClick={handleUnlockConfirm}
                disabled={isUnlockCooldownActive}
              >
                Confirm
              </button>
              <button type="button" onClick={cancelUnlock}>
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
