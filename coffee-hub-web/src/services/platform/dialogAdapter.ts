import {
  alertInBrowser,
  confirmInBrowser,
} from '../browser/dialogService';

export interface DialogAdapter {
  alert(message: string): void;
  confirm(message: string): boolean;
}

export const dialogAdapter: DialogAdapter = {
  alert: alertInBrowser,
  confirm: confirmInBrowser,
};
