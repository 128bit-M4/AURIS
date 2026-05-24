const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron:      true,
  platform:        process.platform,
  fetchWorklet:    () => ipcRenderer.invoke('fetch-worklet'),
  fetchLyrics:     (artist, title) => ipcRenderer.invoke('fetch-lyrics',     artist, title),
  fetchLyricsAll:  (artist, title) => ipcRenderer.invoke('fetch-lyrics-all', artist, title),
  writeLyrics:     (name, content) => ipcRenderer.invoke('write-lyrics',     name, content),
  fetchArtwork:    (artist, title) => ipcRenderer.invoke('fetch-artwork',    artist, title),
  ytdlp:           (url)           => ipcRenderer.invoke('ytdlp',            url),
  ytdlpCheck:      ()              => ipcRenderer.invoke('ytdlp-check'),
  readFile:        (p)             => ipcRenderer.invoke('read-file',        p),
  saveDialog:      (name)          => ipcRenderer.invoke('save-dialog',      name),
});
