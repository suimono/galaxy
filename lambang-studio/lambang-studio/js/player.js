/* ============================================================
   LAMBANG_STUDIO — HLS Video Player Init
   File: js/player.js
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const video    = document.getElementById('mux-player');
    const videoSrc = 'https://stream.mux.com/blULaJm2RMbAmsrwxLrBdgEx9yI1do2yM89vHTkdA6I.m3u8';

    if (!video) return;

    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        const hls = new Hls({ maxMaxBufferLength: 10 });
        hls.loadSource(videoSrc);
        hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari / iOS)
        video.src = videoSrc;
    }
});
