# LAMBANG_STUDIO — Project Structure

```
lambang-studio/
├── index.html          ← Halaman utama (HTML + semua modal)
├── css/
│   └── style.css       ← Semua styling custom (variables, animations, canvas, etc.)
├── js/
│   ├── ui.js           ← Navbar, menu, alert toast, scroll behavior, hero FX
│   ├── vortex.js       ← TikTok downloader (Vortex) — modal + download logic
│   ├── ethereal.js     ← Background remover (Ethereal) — AI matting, canvas tools
│   └── player.js       ← HLS video player init (Mux stream bento background)
└── assets/             ← Folder untuk gambar / aset lokal jika diperlukan
```

## Cara Menjalankan
Cukup buka `index.html` di browser. Tidak butuh server atau build tool.

## Urutan Load Script
1. Tailwind CSS (CDN)
2. Lucide Icons (CDN)
3. HLS.js (CDN)
4. `css/style.css`
5. `js/ui.js`
6. `js/vortex.js`
7. `js/ethereal.js`
8. `js/player.js`

## Fix Download TikTok
Fungsi `handleMobileSafeDownload()` di `js/vortex.js` sudah diperbaiki:
- Tidak lagi menggunakan `fetch()` blob (penyebab CORS block)
- Menggunakan `<a download>` langsung — kompatibel semua browser
- Fallback `target="_blank"` jika download header tidak tersedia
- iOS/In-App browser langsung redirect ke URL media
