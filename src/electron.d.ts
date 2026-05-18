interface ElectronAPI {
  apiPort: number;
  downloadAudio: (songId: string, url: string) => Promise<{ songId: string; data: Uint8Array; mimeType: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
