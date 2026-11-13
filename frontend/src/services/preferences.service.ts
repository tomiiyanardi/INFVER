import type { ProfileId } from '@/types/api';
const key = 'infver.profile';
export const preferences = {
  readProfile(): ProfileId | null { try { const value = localStorage.getItem(key); return value === 'conservative' || value === 'moderate' || value === 'aggressive' ? value : null; } catch { return null; } },
  saveProfile(profile: ProfileId): void { try { localStorage.setItem(key, profile); } catch { /* El test sigue funcionando sin almacenamiento local. */ } },
};
