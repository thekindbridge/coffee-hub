export type ResolvedUserRole = 'customer' | 'admin' | 'agent';

const NON_DIGIT_PATTERN = /\D+/g;

export const normalizePhoneForRoleComparison = (value?: string | null) =>
  (value ?? '').replace(NON_DIGIT_PATTERN, '');

export const resolveRoleFromConfiguredPhones = ({
  phone,
  adminPhone,
  agentPhone,
}: {
  phone?: string | null;
  adminPhone?: string | null;
  agentPhone?: string | null;
}): ResolvedUserRole => {
  const phoneClean = normalizePhoneForRoleComparison(phone);
  const adminClean = normalizePhoneForRoleComparison(adminPhone);
  const agentClean = normalizePhoneForRoleComparison(agentPhone);

  if (phoneClean && adminClean && phoneClean === adminClean) {
    return 'admin';
  }

  if (phoneClean && agentClean && phoneClean === agentClean) {
    return 'agent';
  }

  return 'customer';
};
