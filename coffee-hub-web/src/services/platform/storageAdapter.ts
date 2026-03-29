import {
  readBrowserStorage,
  removeBrowserStorage,
  writeBrowserStorage,
} from '../browser/storageService';

export interface StorageAdapter {
  read(key: string): string | null;
  remove(key: string): void;
  write(key: string, value: string): void;
}

export const storageAdapter: StorageAdapter = {
  read: readBrowserStorage,
  remove: removeBrowserStorage,
  write: writeBrowserStorage,
};
