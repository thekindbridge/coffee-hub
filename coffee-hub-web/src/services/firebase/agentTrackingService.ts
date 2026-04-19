import type { DeliveryLocation } from '../../types';
import { updateDeliveryTrackingRequest } from '../api/ordersService';
import { getCurrentUserIdToken } from '../auth/authService';
import { toAppServiceError } from '../platform/serviceError';

type PersistAgentTrackingLocationParams = {
  agentId: string;
  location: DeliveryLocation;
  orderDocId: string;
  orderId: string;
};

export const persistAgentTrackingLocation = async ({
  agentId,
  location,
  orderDocId,
  orderId,
}: PersistAgentTrackingLocationParams) => {
  try {
    const idToken = await getCurrentUserIdToken(true);
    if (!idToken) {
      throw new Error('Please sign in again before sending delivery updates.');
    }

    await updateDeliveryTrackingRequest(
      {
        agentId,
        location,
        orderDocId,
        orderId,
      },
      idToken,
    );
  } catch (error) {
    throw toAppServiceError(
      error,
      'Unable to update delivery tracking.',
      'network',
    );
  }
};
