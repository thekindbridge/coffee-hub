const DUMMY_AUTH_TOKEN = 'dummy-id-token';

export type DummyAuthUser = {
  displayName: string;
  email: string;
  emailVerified: boolean;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  photoURL: string;
  uid: string;
};

export type AuthSessionSnapshot = {
  currentUserEmail: string;
  currentUserId: string;
  isLoggedIn: boolean;
  user: DummyAuthUser | null;
};

const listeners = new Set<(snapshot: AuthSessionSnapshot) => void>();

const createDummyUser = (): DummyAuthUser => ({
  displayName: 'Pavan Kumar',
  email: 'dummy@example.com',
  emailVerified: true,
  getIdToken: async () => DUMMY_AUTH_TOKEN,
  photoURL: '',
  uid: 'dummy-user',
});

let currentUser: DummyAuthUser | null = null;

const buildSnapshot = (): AuthSessionSnapshot => ({
  currentUserEmail: currentUser?.email || '',
  currentUserId: currentUser?.uid || '',
  isLoggedIn: Boolean(currentUser),
  user: currentUser,
});

const notifyListeners = () => {
  const snapshot = buildSnapshot();
  listeners.forEach(listener => {
    listener(snapshot);
  });
};

export const subscribeToAuthSession = (
  listener: (snapshot: AuthSessionSnapshot) => void,
) => {
  listeners.add(listener);
  listener(buildSnapshot());

  return () => {
    listeners.delete(listener);
  };
};

export const getCurrentAuthUser = (): DummyAuthUser | null => currentUser;

export const getCurrentUserIdToken = async (_forceRefresh = false) => (
  currentUser ? DUMMY_AUTH_TOKEN : ''
);

export const loginAsDummyUser = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  currentUser = createDummyUser();
  notifyListeners();
  return currentUser;
};

export const logoutCurrentUser = async () => {
  currentUser = null;
  notifyListeners();
};
