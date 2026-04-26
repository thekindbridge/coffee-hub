import type { AudioHandle } from '../platform/audioAdapter';

export const createBrowserAudio = (src: string): AudioHandle | null => {
  if (typeof Audio === 'undefined') {
    return null;
  }

  const audio = new Audio(src);
  audio.preload = 'auto';
  return {
    dispose: () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    },
    play: async () => {
      audio.currentTime = 0;
      await audio.play();
    },
    reset: () => {
      audio.currentTime = 0;
    },
  };
};
