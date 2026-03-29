import { scrollToSectionOrTop } from '../browser/navigationService';

export interface NavigationAdapter {
  scrollToSectionOrTop(sectionId: string): void;
}

export const navigationAdapter: NavigationAdapter = {
  scrollToSectionOrTop,
};
