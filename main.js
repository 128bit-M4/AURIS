// main.js — AURIS 最終安定版
const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win;

function cleanIndexedDBLock() {
  try {
    const userData = app.getPath('userData');
    const lockPath = path.join(userData, 'IndexedDB', 'file__0.indexeddb.leveldb', 'LOCK');
    if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  } catch(e) {}
}

function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: 'AURIS', backgroundColor: '#09080a',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });
  const candidates = ['AURIS 2.html','index.html'];
  const htmlFile = candidates.find(f => fs.existsSync(path.join(__dirname, f)));
  if (htmlFile) win.loadFile(path.join(__dirname, htmlFile));
}

function setupMediaKeys() {
  const sendMedia = (action) => {
    if (win && !win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        if (typeof togglePlay === 'function' && '${action}'==='playpause') togglePlay();
        if (typeof next==='function' && '${action}'==='next') next();
        if (typeof prev==='function' && '${action}'==='prev') prev();
      `).catch(()=>{});
    }
  };
  try { globalShortcut.register('MediaPlayPause', () => sendMedia('playpause')); } catch(e) {}
  try { globalShortcut.register('MediaNextTrack', () => sendMedia('next')); } catch(e) {}
  try { globalShortcut.register('MediaPreviousTrack', () => sendMedia('prev')); } catch(e) {}
}

// ── yt-dlp 実行処理 (FFmpeg同梱対応版) ──
ipcMain.handle('ytdlp', async (event, url) => {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const binName = isWin ? 'yt-dlp.exe' : 'yt-dlp';

    // 開発時とビルド後でパスを切り替える
    let binDir = path.join(__dirname, 'bin');
    if (app.isPackaged) {
      binDir = path.join(process.resourcesPath, 'bin');
    }
    const binPath = path.join(binDir, binName);

    if (!fs.existsSync(binPath)) {
      return reject(new Error(`yt-dlpが配置されていません: ${binPath}`));
    }

    // Mac/Linuxの場合は実行権限を確認・付与
    if (!isWin) {
      ['yt-dlp', 'ffmpeg', 'ffprobe'].forEach(f => {
        const p = path.join(binDir, f);
        if (fs.existsSync(p)) {
          try { fs.chmodSync(p, 0o755); } catch(e){}
        }
      });
    }

    const out = path.join(os.tmpdir(), `auris_${Date.now()}.mp3`);
    
    // 環境変数PATHに同梱のbinフォルダを追加
    const env = {
      ...process.env,
      PATH: binDir + (isWin ? ';' : ':') + (process.env.PATH || '')
    };

    // コマンド構築
    const cmd = [
      `"${binPath}"`,
      `"${url}"`,
      `--extract-audio`,
      `--audio-format mp3`,
      `--ffmpeg-location "${binDir}"`,
      `--output "${out}"`,
      `--no-playlist`,
      `--quiet`,
      `--no-warnings`,
      `--print after_move:filepath`
    ].join(' ');

    exec(cmd, { timeout: 120000, env }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      const filePath = stdout.trim();
      if (!filePath || !fs.existsSync(filePath)) return reject(new Error('ファイルが見つかりません'));
      resolve({
        filePath,
        title: path.basename(filePath, path.extname(filePath))
      });
    });
  });
});

ipcMain.handle('read-file', async (e,p)=>{try{return fs.readFileSync(p).toString('base64');}catch(e){throw new Error(e.message);}});
ipcMain.handle('write-lyrics', async (e,filename,content)=>{
  const {canceled,filePath}=await dialog.showSaveDialog(win,{
    defaultPath:path.join(os.homedir(),'Music',filename),
    filters:[{name:'LRC',extensions:['lrc']},{name:'Text',extensions:['txt']}],
  });
  if(canceled||!filePath) return null;
  fs.writeFileSync(filePath,content,'utf8');
  return filePath;
});

app.whenReady().then(()=>{
  cleanIndexedDBLock();
  createWindow();
  setupMediaKeys();
  app.on('activate', () => { if(BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
// ── HTTP fetch helper ─────────────────────────────────────
const https = require('https');
const http  = require('http');
function nodeFetch(url, ms) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept': 'application/json,*/*',
        'Accept-Language': 'ja,en-US;q=0.9',
        'Accept-Encoding': 'identity',
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return nodeFetch(res.headers.location, ms).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        try { resolve(JSON.parse(text)); } catch(e) { resolve(text); }
      });
    });
    req.setTimeout(ms || 8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// ── fetch-artwork ─────────────────────────────────────────
ipcMain.handle('fetch-artwork', async (e, artist, title) => {
  const q = (artist ? artist + ' ' + title : title).replace(/[\(\[].*/, '').trim();
  try {
    const data = await nodeFetch('https://itunes.apple.com/search?term=' + encodeURIComponent(q) + '&limit=5&media=music', 6000);
    if (data.results && data.results.length) {
      const r = data.results[0];
      return { ok: true, artUrl: (r.artworkUrl100||'').replace('100x100','600x600'), artistName: r.artistName||'', albumName: r.collectionName||'' };
    }
  } catch(e) {}
  return { ok: false };
});

// ── fetch-lyrics ──────────────────────────────────────────
async function fetchLrclib(artist, title) {
  const urls = [
    'https://lrclib.net/api/get?artist_name=' + encodeURIComponent(artist) + '&track_name=' + encodeURIComponent(title),
    'https://lrclib.net/api/search?track_name=' + encodeURIComponent(title) + (artist ? '&artist_name=' + encodeURIComponent(artist) : ''),
  ];
  for (const url of urls) {
    try {
      const res = await nodeFetch(url, 6000);
      const items = Array.isArray(res) ? res : (res && res.id ? [res] : []);
      if (!items.length) continue;
      const best = items.find(r => (r.trackName||'').toLowerCase() === title.toLowerCase()) || items[0];
      const lyr = best.syncedLyrics || best.plainLyrics || '';
      if (lyr.trim().length > 20) return { lyrics: lyr, source: 'lrclib' };
    } catch(e) {}
  }
  return null;
}

ipcMain.handle('fetch-lyrics', async (e, artist, title) => {
  const a = (artist||'').replace(/[\(\[].*/, '').replace(/feat\..*/gi,'').trim();
  const t = (title||'').replace(/[\(\[].*/, '').trim();
  if (!t) return { ok: false, lyrics: '' };
  const res = await fetchLrclib(a, t);
  if (res) return { ok: true, lyrics: res.lyrics, source: res.source };
  return { ok: false, lyrics: '' };
});

ipcMain.handle('fetch-lyrics-all', async (e, artist, title) => {
  const a = (artist||'').replace(/[\(\[].*/, '').replace(/feat\..*/gi,'').trim();
  const t = (title||'').replace(/[\(\[].*/, '').trim();
  if (!t) return [];
  const res = await fetchLrclib(a, t);
  return res ? [res] : [];
});

// ── ytdlp-check ───────────────────────────────────────────
ipcMain.handle('ytdlp-check', async () => {
  return new Promise(resolve => {
    const isWin = process.platform === 'win32';
    let binDir = path.join(__dirname, 'bin');
    if (app.isPackaged) binDir = path.join(process.resourcesPath, 'bin');
    const binPath = path.join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');
    resolve(fs.existsSync(binPath) ? 'ok' : null);
  });
});

// ── save-dialog ───────────────────────────────────────────
ipcMain.handle('save-dialog', async (e, name) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: path.join(os.homedir(), name || 'AURIS.mp3'),
    filters: [{ name: 'Audio', extensions: ['mp3','wav','webm','ogg'] }],
  });
  return r.canceled ? null : r.filePath;
});
