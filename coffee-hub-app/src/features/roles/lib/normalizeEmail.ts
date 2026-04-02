export const normalizeEmail = (email?: string | null) => `${email ?? ''}`.trim().toLowerCase();
