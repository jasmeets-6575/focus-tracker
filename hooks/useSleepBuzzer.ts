'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseSleepBuzzerOptions = {
  isSleeping: boolean;
  delayMs?: number;
};

type UseSleepBuzzerReturn = {
  buzzerActive: boolean;
  buzzerDismissed: boolean;
  sleepAlarmRemainingMs: number;
  buzzerError: string | null;
  dismissBuzzer: () => void;
};

export function useSleepBuzzer(options: UseSleepBuzzerOptions): UseSleepBuzzerReturn {
  const { isSleeping, delayMs = 10_000 } = options;

  const [buzzerActive, setBuzzerActive] = useState(false);
  const [buzzerDismissed, setBuzzerDismissed] = useState(false);
  const [sleepAlarmRemainingMs, setSleepAlarmRemainingMs] = useState(delayMs);
  const [buzzerError, setBuzzerError] = useState<string | null>(null);

  const sleepStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sirenIntervalRef = useRef<number | null>(null);

  const stopBuzzer = useCallback(() => {
    if (sirenIntervalRef.current !== null) {
      window.clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }

    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch {
        // Oscillator may already be stopped; safe to ignore.
      }
      oscillatorRef.current.disconnect();
      oscillatorRef.current = null;
    }

    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }

    setBuzzerActive(false);
  }, []);

  const startBuzzer = useCallback(async () => {
    if (buzzerActive) {
      return;
    }

    try {
      const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        setBuzzerError('Audio alert is not supported in this browser.');
        return;
      }

      const context = audioContextRef.current ?? new Ctx();
      audioContextRef.current = context;

      if (context.state === 'suspended') {
        await context.resume();
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(700, context.currentTime);
      gainNode.gain.setValueAtTime(0.1, context.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();

      let highTone = false;
      sirenIntervalRef.current = window.setInterval(() => {
        highTone = !highTone;
        oscillator.frequency.setValueAtTime(highTone ? 960 : 660, context.currentTime);
      }, 220);

      oscillatorRef.current = oscillator;
      gainRef.current = gainNode;
      setBuzzerError(null);
      setBuzzerActive(true);
    } catch {
      setBuzzerError('Unable to start alarm automatically. Interact with the page and try again.');
    }
  }, [buzzerActive]);

  useEffect(() => {
    if (!isSleeping) {
      sleepStartedAtRef.current = null;
      setSleepAlarmRemainingMs(delayMs);
      setBuzzerDismissed(false);
      stopBuzzer();
      return;
    }

    if (sleepStartedAtRef.current === null) {
      sleepStartedAtRef.current = Date.now();
    }

    const tick = () => {
      if (sleepStartedAtRef.current === null) {
        return;
      }

      const elapsed = Date.now() - sleepStartedAtRef.current;
      const remaining = Math.max(0, delayMs - elapsed);
      setSleepAlarmRemainingMs(remaining);

      if (remaining === 0 && !buzzerDismissed && !buzzerActive) {
        void startBuzzer();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [buzzerActive, buzzerDismissed, delayMs, isSleeping, startBuzzer, stopBuzzer]);

  useEffect(() => {
    return () => {
      stopBuzzer();

      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stopBuzzer]);

  const dismissBuzzer = useCallback(() => {
    setBuzzerDismissed(true);
    stopBuzzer();
  }, [stopBuzzer]);

  return {
    buzzerActive,
    buzzerDismissed,
    sleepAlarmRemainingMs,
    buzzerError,
    dismissBuzzer
  };
}
