'use client';

import { useQuery } from '@tanstack/react-query';
import { getMe }    from '../auth/session';

export function useCurrentUser() {
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn:  getMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return data ?? null;
}
