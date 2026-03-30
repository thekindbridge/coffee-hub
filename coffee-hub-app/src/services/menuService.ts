import type { MenuItem } from '../types';
import { AppServiceError, toAppServiceError } from './serviceError';
import { getApi } from './api/apiClient';

type MenuApiResponse = {
  menu?: MenuItem[];
  error?: string;
};

export const fetchMenu = async () => {
  try {
    const payload = await getApi<MenuApiResponse>('/api/menu');

    if (!Array.isArray(payload.menu)) {
      throw new AppServiceError('Unexpected menu response from the server.', {
        code: 'validation',
      });
    }

    return payload.menu;
  } catch (error) {
    throw toAppServiceError(error, 'Unable to load menu items.', 'network');
  }
};
