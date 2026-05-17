/* ============================================================
   LAMBANG_STUDIO — Vortex TikTok Downloader
   File: js/vortex.js
   ============================================================ */

// ── Modal Controllers ──
function openVortexModal() {
    const modal   = document.getElementById('vortex-modal');
    const content = document.getElementById('modal-content');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeVortexModal() {
    const modal   = document.getElementById('vortex-modal');
    const content = document.getElementById('modal-content');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.getElementById('vortex-result').classList.add('hidden');
            document.getElementById('vortex-status').classList.add('hidden');
            document.getElementById('vortex-url').value = '';
        }, 300);
    }
}

// ── Main Download Processor ──
async function processVortexDownload() {
    const urlInput        = document.getElementById('vortex-url').value.trim();
    const btn             = document.getElementById('vortex-btn');
    const loader          = document.getElementById('vortex-loader');
    const resultBox       = document.getElementById('vortex-result');
    const statusBox       = document.getElementById('vortex-status');
    const imagesContainer = document.getElementById('vortex-images-preview-container');
    const dlVideoBtn      = document.getElementById('vortex-dl-video');

    if (!urlInput || !urlInput.includes('tiktok.com')) {
        showVortexStatus("URL HARUS LINK TIKTOK VALID", "error");
        return;
    }

    statusBox.classList.add('hidden');
    resultBox.classList.add('hidden');
    imagesContainer.classList.add('hidden');
    imagesContainer.innerHTML = '';
    dlVideoBtn.classList.remove('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;

    try {
        const res  = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(urlInput)}`);
        const json = await res.json();

        if (json.code === 0 && json.data) {
            const data = json.data;

            document.getElementById('vortex-thumb').src         = data.cover;
            document.getElementById('vortex-author').innerText  = `@${data.author.unique_id}`;
            document.getElementById('vortex-title').innerText   = data.title || "VORTEX CAPTURE";

            // Bind downloads menggunakan hdplay untuk kualitas terbaik
            document.getElementById('vortex-dl-video').onclick = () =>
                handleMobileSafeDownload(data.hdplay || data.play, `Vortex_${data.id}.mp4`);
            document.getElementById('vortex-dl-audio').onclick = () =>
                handleMobileSafeDownload(data.music_info?.play || data.music, `Vortex_Audio_${data.id}.mp3`);

            // Deteksi Slideshow Foto TikTok
            if (data.images && data.images.length > 0) {
                dlVideoBtn.classList.add('hidden');
                imagesContainer.classList.remove('hidden');

                const titleGrid = document.createElement('p');
                titleGrid.className = 'text-[9px] font-bold uppercase text-purple-400 tracking-wider mb-2.5';
                titleGrid.innerText = `Ekstraksi Slide Foto (${data.images.length} Gambar)`;
                imagesContainer.appendChild(titleGrid);

                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto pr-1';

                data.images.forEach((imgUrl, index) => {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'relative aspect-square bg-zinc-950 border border-white/10 rounded-lg overflow-hidden group cursor-pointer';

                    const img = document.createElement('img');
                    img.src       = imgUrl;
                    img.className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-105';
                    wrapper.appendChild(img);

                    const overlay = document.createElement('div');
                    overlay.className = 'absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity';
                    overlay.innerHTML = '<i data-lucide="download" class="w-4 h-4 text-white"></i>';
                    wrapper.appendChild(overlay);

                    wrapper.onclick = (e) => {
                        e.stopPropagation();
                        handleMobileSafeDownload(imgUrl, `Vortex_Slide_${data.id}_${index + 1}.jpg`);
                    };

                    grid.appendChild(wrapper);
                });

                imagesContainer.appendChild(grid);
                showVortexStatus("SLIDE GAMBAR BERHASIL DIEKSTRAKSI", "success");
            } else {
                showVortexStatus("PROTOKOL BERHASIL DIEKSTRAKSI", "success");
            }

            loader.classList.add('hidden');
            resultBox.classList.remove('hidden');
        } else {
            throw new Error("Gagal mengurai data dari server.");
        }
    } catch (err) {
        loader.classList.add('hidden');
        showVortexStatus(err.message.toUpperCase(), "error");
    } finally {
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// ── Universal Safe Download Handler ──
// FIX: Tidak pakai fetch() blob agar tidak kena CORS block di browser teman
function handleMobileSafeDownload(url, filename) {
    showVortexStatus("MEMPROSES UNDUHAN...", "success");

    const isIOS   = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInApp = /Instagram|FBAN|FBAV|Twitter|TikTok|MicroMessenger|WhatsApp/.test(navigator.userAgent);

    // iOS / In-App Browser: redirect langsung, biarkan Safari handle download
    if (isIOS || isInApp) {
        window.location.href = url;
        showVortexStatus("DIBUKA DI SAFARI (TEKAN LAMA → SIMPAN VIDEO)", "success");
        return;
    }

    // Desktop & Android Chrome: pakai <a download> — paling kompatibel, bypass CORS
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = filename;
    a.target      = '_blank';           // Fallback: buka di tab baru jika download header tidak ada
    a.rel         = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showVortexStatus("UNDUHAN DIMULAI ✓", "success");
}

// ── Status Alert Display ──
function showVortexStatus(msg, type) {
    const box = document.getElementById('vortex-status');
    if (!box) return;
    box.innerText = msg;
    box.classList.remove(
        'hidden',
        'bg-red-500/10', 'text-red-500', 'border-red-500/20',
        'bg-purple-500/10', 'text-purple-400', 'border-purple-500/20'
    );

    if (type === 'error') {
        box.classList.add('bg-red-500/10', 'text-red-500', 'border', 'border-red-500/20');
    } else {
        box.classList.add('bg-purple-500/10', 'text-purple-400', 'border', 'border-purple-500/20');
    }
    box.classList.remove('hidden');
}
