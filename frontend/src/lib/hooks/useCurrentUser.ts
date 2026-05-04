'use client';

import { useMemo } from 'react';
import { getCurrentUser } from '../auth/session';

export function useCurrentUser() {
  return useMemo(() => getCurrentUser(), []);
}
