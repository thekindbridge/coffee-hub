import { useProfileContext } from './ProfileProvider';

export const useProfileData = () => {
  const {
    authDisplayName,
    authPhotoUrl,
    currentUserEmail,
    currentUserId,
    error,
    isCompletionPromptVisible,
    isLoading,
    isPromptSuppressed,
    isProfileComplete,
    missingFields,
    primaryAddress,
    profile,
    profileDisplayName,
  } = useProfileContext();

  return {
    authDisplayName,
    authPhotoUrl,
    currentUserEmail,
    currentUserId,
    error,
    isCompletionPromptVisible,
    isLoading,
    isPromptSuppressed,
    isProfileComplete,
    missingFields,
    primaryAddress,
    profile,
    profileDisplayName,
  };
};
