import type { User } from '../hub/types';

export async function fetchUsers(userIds: string[], signal?: AbortSignal): Promise<User[]> {
  if (userIds.length === 0) return [];
  const res = await fetch(`/_api/v3/users/list?userIds=${userIds.join(',')}`, {
    credentials: 'same-origin',
    signal,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.users ?? [];
}
