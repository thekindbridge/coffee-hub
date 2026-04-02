import { useContext } from 'react';
import { UserRoleContext } from './RoleProvider';

export const useUserRole = () => {
  const value = useContext(UserRoleContext);

  if (!value) {
    throw new Error('useUserRole must be used within RoleProvider.');
  }

  return value;
};
