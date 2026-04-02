import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';
import type { AuthState } from '../../../hooks/useAuth';
import type { CustomerProfile, ProfileAddress } from '../../../types';
import {
  EMPTY_PROFILE,
  PROFILE_PROMPT_STORAGE_KEY,
  getPrimaryProfileAddress,
  getProfileDisplayName,
  getProfileMissingFields,
  isProfileComplete,
} from '../lib/profileMappers';
import { subscribeToCustomerProfile } from '../services/profileService';

type ProfileContextValue = {
  authDisplayName: string;
  authPhotoUrl: string;
  currentUserEmail: string;
  currentUserId: string;
  dismissCompletionPromptForSession: () => void;
  error: string;
  isCompletionPromptVisible: boolean;
  isLoading: boolean;
  isPromptSuppressed: boolean;
  isProfileComplete: boolean;
  missingFields: string[];
  primaryAddress: ProfileAddress | null;
  profile: CustomerProfile;
  profileDisplayName: string;
  setCompletionPromptVisible: Dispatch<SetStateAction<boolean>>;
  setProfileState: Dispatch<SetStateAction<CustomerProfile>>;
  suppressCompletionPrompt: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

const getPromptStorageKey = (currentUserId: string) => (
  `${PROFILE_PROMPT_STORAGE_KEY}:${currentUserId}`
);

type ProfileProviderProps = PropsWithChildren<{
  auth: AuthState;
}>;

export function ProfileProvider({ auth, children }: ProfileProviderProps) {
  const [profile, setProfile] = useState<CustomerProfile>({
    ...EMPTY_PROFILE,
    email: auth.currentUserEmail,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPromptSuppressed, setIsPromptSuppressed] = useState(false);
  const [isPromptPreferenceReady, setIsPromptPreferenceReady] = useState(false);
  const [hasDismissedPromptForSession, setHasDismissedPromptForSession] = useState(false);
  const [isCompletionPromptVisible, setCompletionPromptVisible] = useState(false);

  useEffect(() => {
    if (!auth.currentUserId) {
      setProfile({
        ...EMPTY_PROFILE,
        email: auth.currentUserEmail,
      });
      setError('');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeToCustomerProfile(
      auth.currentUserId,
      auth.currentUserEmail,
      nextProfile => {
        setProfile(nextProfile);
        setError('');
        setIsLoading(false);
      },
      nextError => {
        setProfile({
          ...EMPTY_PROFILE,
          email: auth.currentUserEmail,
        });
        setError(nextError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [auth.currentUserEmail, auth.currentUserId]);

  useEffect(() => {
    let isMounted = true;

    if (!auth.currentUserId) {
      setIsPromptSuppressed(false);
      setIsPromptPreferenceReady(true);
      setHasDismissedPromptForSession(false);
      return () => {
        isMounted = false;
      };
    }

    setIsPromptPreferenceReady(false);
    setHasDismissedPromptForSession(false);

    void AsyncStorage.getItem(getPromptStorageKey(auth.currentUserId))
      .then(storedValue => {
        if (!isMounted) {
          return;
        }

        setIsPromptSuppressed(storedValue === '1');
        setIsPromptPreferenceReady(true);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setIsPromptSuppressed(false);
        setIsPromptPreferenceReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, [auth.currentUserId]);

  const profileState = useMemo(() => ({
    ...profile,
    email: profile.email || auth.currentUserEmail,
  }), [auth.currentUserEmail, profile]);

  const primaryAddress = useMemo(
    () => getPrimaryProfileAddress(profileState),
    [profileState],
  );

  const missingFields = useMemo(
    () => getProfileMissingFields(profileState),
    [profileState],
  );

  const isComplete = useMemo(
    () => isProfileComplete(profileState),
    [profileState],
  );

  useEffect(() => {
    if (!auth.currentUserId || !isPromptPreferenceReady || isLoading) {
      setCompletionPromptVisible(false);
      return;
    }

    if (isComplete || isPromptSuppressed || hasDismissedPromptForSession) {
      setCompletionPromptVisible(false);
      return;
    }

    setCompletionPromptVisible(true);
  }, [
    auth.currentUserId,
    hasDismissedPromptForSession,
    isComplete,
    isLoading,
    isPromptPreferenceReady,
    isPromptSuppressed,
  ]);

  const dismissCompletionPromptForSession = useCallback(() => {
    setHasDismissedPromptForSession(true);
    setCompletionPromptVisible(false);
  }, []);

  const suppressCompletionPrompt = useCallback(async () => {
    setHasDismissedPromptForSession(true);
    setCompletionPromptVisible(false);
    setIsPromptSuppressed(true);

    if (!auth.currentUserId) {
      return;
    }

    await AsyncStorage.setItem(getPromptStorageKey(auth.currentUserId), '1');
  }, [auth.currentUserId]);

  const value = useMemo<ProfileContextValue>(() => ({
    authDisplayName: auth.user?.displayName || '',
    authPhotoUrl: auth.user?.photoURL || '',
    currentUserEmail: auth.currentUserEmail,
    currentUserId: auth.currentUserId,
    dismissCompletionPromptForSession,
    error,
    isCompletionPromptVisible,
    isLoading,
    isPromptSuppressed,
    isProfileComplete: isComplete,
    missingFields,
    primaryAddress,
    profile: profileState,
    profileDisplayName: getProfileDisplayName(
      profileState,
      auth.user?.displayName || '',
      auth.currentUserEmail,
    ),
    setCompletionPromptVisible,
    setProfileState: setProfile,
    suppressCompletionPrompt,
  }), [
    auth.currentUserEmail,
    auth.currentUserId,
    auth.user?.displayName,
    auth.user?.photoURL,
    dismissCompletionPromptForSession,
    error,
    isComplete,
    isCompletionPromptVisible,
    isLoading,
    isPromptSuppressed,
    missingFields,
    primaryAddress,
    profileState,
    suppressCompletionPrompt,
  ]);

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfileContext = () => {
  const value = useContext(ProfileContext);

  if (!value) {
    throw new Error('useProfileContext must be used within ProfileProvider.');
  }

  return value;
};
