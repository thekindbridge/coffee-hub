export const createBrowserAudio = (src: string) => {
  if (typeof Audio === 'undefined') {
    return null;
  }

  const audio = new Audio(src);
  audio.preload = 'auto';
  return audio;
};

export const playBrowserAudio = async (audio: HTMLAudioElement | null) => {
  if (!audio) {
    return;
  }

  audio.currentTime = 0;
  await audio.play();
};
