import type { DialogAdapter } from '../platform/dialogAdapter';

export const nativeDialogAdapter: DialogAdapter = {
  alert: () => undefined,
  confirm: () => false,
};
