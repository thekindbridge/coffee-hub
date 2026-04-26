import { createBrowserAudio } from '../browser/audioService';

export interface AudioHandle {
  dispose?(): void;
  play(): Promise<void>;
  reset(): void;
}

export interface AudioAdapter {
  create(src: string): AudioHandle | null;
}

export const audioAdapter: AudioAdapter = {
  create: createBrowserAudio,
};
