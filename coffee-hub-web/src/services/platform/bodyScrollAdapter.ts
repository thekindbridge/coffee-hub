import { setBodyScrollLocked } from '../browser/domService';

export interface BodyScrollAdapter {
  setLocked(isLocked: boolean): void;
}

export const bodyScrollAdapter: BodyScrollAdapter = {
  setLocked: setBodyScrollLocked,
};
