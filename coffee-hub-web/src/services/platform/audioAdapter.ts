import { createBrowserAudio } from '../browser/audioService';

export interface AudioHandle {
  play(): Promise<void>;
  reset(): void;
}

export interface AudioAdapter {
  create(src: string): AudioHandle | null;
}

export const audioAdapter: AudioAdapter = {
  create: createBrowserAudio,
};
