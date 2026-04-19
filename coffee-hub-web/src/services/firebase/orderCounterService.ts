import type { DeliveryLocation } from '../../types';
import { updateDeliveryTrackingRequest } from '../api/ordersService';
import { getCurrentUserIdToken } from '../auth/authService';
import { toAppServiceError } from '../platform/serviceError';

export const persistActiveDeliverySession = async ({
  agentId,
  agentName,
  customerLocation,
  orderDocId,
  orderId,
}: {
  agentId: string;
  agentName: string;
  customerLocation: DeliveryLocation;
  orderDocId: string;
  orderId: string;
}) => {
  try {
    const idToken = await getCurrentUserIdToken(true);
    if (!idToken) {
      throw new Error('Please sign in again before starting delivery tracking.');
    }

    await updateDeliveryTrackingRequest(
      {
        agentId,
        agentName,
        customerLocation,
        orderDocId,
        orderId,
      },
      idToken,
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to persist the active delivery session.',
      'network',
    );
  }
};
