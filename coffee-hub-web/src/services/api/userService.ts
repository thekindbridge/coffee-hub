import type { CustomerProfile } from '../../features/app/types';
import { postApi } from './apiClient';

type SyncUserProfileBody = {
  email: string;
  name: string;
};

type SyncUserProfileResponse = {
  firebaseCustomToken: string;
  profile: CustomerProfile;
};

export const syncUserProfileRequest = async (
  body: SyncUserProfileBody,
  idToken: string,
) => postApi<SyncUserProfileResponse>('/api/users', body, idToken);
