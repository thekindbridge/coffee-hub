import type { AudioHandle } from '../platform/audioAdapter';

export const createBrowserAudio = (src: string): AudioHandle | null => {
  if (typeof Audio === 'undefined') {
    return null;
  }

  const audio = new Audio(src);
  audio.preload = 'auto';
  return {
    play: async () => {
      audio.currentTime = 0;
      await audio.play();
    },
    reset: () => {
      audio.currentTime = 0;
    },
  };
};
