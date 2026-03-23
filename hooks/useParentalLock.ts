'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isPasswordValid } from '@/lib/parentalControl';

export type ProtectedAction = 'pause' | 'disableCamera';

type UseParentalLockOptions = {
  onExecuteAction: (action: ProtectedAction) => void;
  maxUnlockAttempts?: number;
  unlockCooldownMs?: number;
};

type UseParentalLockReturn = {
  parentalControlEnabled: boolean;
  parentalPassword: string;
  parentalError: string | null;
  lockedAction: ProtectedAction | null;
  unlockPassword: string;
  unlockError: string | null;
  isUnlockCooldownActive: boolean;
  setParentalPassword: (value: string) => void;
  setUnlockPassword: (value: string) => void;
  handleParentalToggle: (enabled: boolean) => void;
  requestProtectedAction: (action: ProtectedAction) => void;
  handleUnlockConfirm: () => void;
  cancelUnlock: () => void;
};

export function useParentalLock(options: UseParentalLockOptions): UseParentalLockReturn {
  const { onExecuteAction, maxUnlockAttempts = 5, unlockCooldownMs = 60_000 } = options;

  const [parentalControlEnabled, setParentalControlEnabled] = useState(false);
  const [parentalPassword, setParentalPasswordState] = useState('');
  const [parentalError, setParentalError] = useState<string | null>(null);
  const [lockedAction, setLockedAction] = useState<ProtectedAction | null>(null);
  const [unlockPassword, setUnlockPasswordState] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  const [unlockLockedUntil, setUnlockLockedUntil] = useState<number | null>(null);

  const requiresParentalCheck = useMemo(
    () => parentalControlEnabled && parentalPassword.trim().length > 0,
    [parentalControlEnabled, parentalPassword]
  );

  useEffect(() => {
    if (unlockLockedUntil === null) {
      return;
    }

    const remainingMs = unlockLockedUntil - Date.now();

    if (remainingMs <= 0) {
      setUnlockLockedUntil(null);
      setUnlockError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUnlockLockedUntil(null);
      setUnlockError(null);
    }, remainingMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [unlockLockedUntil]);

  const setParentalPassword = useCallback(
    (value: string) => {
      setParentalPasswordState(value);
      if (parentalError) {
        setParentalError(null);
      }
    },
    [parentalError]
  );

  const setUnlockPassword = useCallback(
    (value: string) => {
      setUnlockPasswordState(value);
      if (unlockError) {
        setUnlockError(null);
      }
    },
    [unlockError]
  );

  const handleParentalToggle = useCallback((enabled: boolean) => {
    if (enabled && parentalPassword.trim().length < 4) {
      setParentalError('Set a parental password (minimum 4 characters) before enabling the lock.');
      setParentalControlEnabled(false);
      return;
    }

    setParentalError(null);
    setParentalControlEnabled(enabled);
  }, [parentalPassword]);

  const requestProtectedAction = useCallback(
    (action: ProtectedAction) => {
      if (!requiresParentalCheck) {
        onExecuteAction(action);
        return;
      }

      setUnlockPasswordState('');
      setUnlockError(null);
      setLockedAction(action);
    },
    [onExecuteAction, requiresParentalCheck]
  );

  const handleUnlockConfirm = useCallback(() => {
    if (!lockedAction) {
      return;
    }

    if (unlockLockedUntil && Date.now() < unlockLockedUntil) {
      const remaining = Math.max(0, Math.ceil((unlockLockedUntil - Date.now()) / 1000));
      setUnlockError(`Too many attempts. Try again in ${remaining}s.`);
      return;
    }

    if (!isPasswordValid(unlockPassword, parentalPassword)) {
      const nextAttempts = unlockAttempts + 1;
      setUnlockAttempts(nextAttempts);

      if (nextAttempts >= maxUnlockAttempts) {
        const lockUntil = Date.now() + unlockCooldownMs;
        setUnlockLockedUntil(lockUntil);
        setUnlockAttempts(0);
        setUnlockError(`Too many attempts. Locked for ${Math.round(unlockCooldownMs / 1000)}s.`);
      } else {
        setUnlockError(`Incorrect password. Attempts left: ${maxUnlockAttempts - nextAttempts}.`);
      }
      return;
    }

    onExecuteAction(lockedAction);
    setLockedAction(null);
    setUnlockPasswordState('');
    setUnlockError(null);
    setUnlockAttempts(0);
    setUnlockLockedUntil(null);
  }, [
    lockedAction,
    maxUnlockAttempts,
    onExecuteAction,
    parentalPassword,
    unlockAttempts,
    unlockCooldownMs,
    unlockLockedUntil,
    unlockPassword
  ]);

  const cancelUnlock = useCallback(() => {
    setLockedAction(null);
    setUnlockPasswordState('');
    setUnlockError(null);
  }, []);

  const isUnlockCooldownActive = Boolean(unlockLockedUntil && Date.now() < unlockLockedUntil);

  return {
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
  };
}
