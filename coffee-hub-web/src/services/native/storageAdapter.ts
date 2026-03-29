import type { StorageAdapter } from '../platform/storageAdapter';

export const nativeStorageAdapter: StorageAdapter = {
  read: () => null,
  remove: () => undefined,
  write: () => undefined,
};
