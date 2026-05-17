/* ============================================================
   LAMBANG_STUDIO — Ethereal Background Remover Studio
   File: js/ethereal.js
   ============================================================ */

// ── Studio State ──
let uploadedImage      = null;
let activeTool         = 'auto-ai';
let chromaTolerance    = 30;
let brushSize          = 25;
let isDrawing          = false;
let edgeBlurRadius     = 0;
let hasNeonGlow        = false;
let originalDropzoneHTML = null;
let canvasZoom         = 1;

// ── History State (Undo / Redo) ──
let historyStack = [];
let historyIndex = -1;

// ── Canvas References ──
const studioCanvas = document.getElementById('interactive-canvas');
const studioCtx    = studioCanvas ? studioCanvas.getContext('2d') : null;

// Non-destructive backup canvas for restoration brush
let backupCanvas = document.createElement('canvas');
let backupCtx    = backupCanvas.getContext('2d');

// ── Save original dropzone HTML on init ──
document.addEventListener("DOMContentLoaded", () => {
    const dropzone = document.getElementById('remover-dropzone');
    if (dropzone) originalDropzoneHTML = dropzone.innerHTML;

    // Bind file input initially
    const inputEl = document.getElementById('remover-file-input');
    if (inputEl) {
        inputEl.addEventListener('change', (e) => {
            if (e.target.files.length > 0) loadAndProcessImage(e.target.files[0]);
        });
    }

    // Download button
    const dlBtn = document.getElementById('remover-download-btn');
    if (dlBtn) {
        dlBtn.onclick = () => {
            if (!studioCanvas) return;
            const a      = document.createElement('a');
            a.href       = studioCanvas.toDataURL('image/png');
            a.download   = `LambangStudio_NoBG_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showAlert("Gambar PNG Berhasil Diunduh!");
        };
    }

    // Brush size slider
    const brushSlider = document.getElementById('brush-size');
    if (brushSlider) {
        brushSlider.addEventListener('input', (e) => {
            brushSize = parseInt(e.target.value);
            const label = document.getElementById('brush-size-val');
            if (label) label.innerText = `${brushSize}px`;
            updateCursorIndicatorSize();
        });
    }
});

// ── Modal Controllers ──
function openEtherealRemoverModal() {
    const modal   = document.getElementById('ethereal-remover-modal');
    const content = document.getElementById('remover-modal-content');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
            content.classList.add('scale-100', 'opacity-100');
        }, 10);
    }
}

function closeEtherealRemoverModal() {
    const modal   = document.getElementById('ethereal-remover-modal');
    const content = document.getElementById('remover-modal-content');
    if (modal && content) {
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');

            // Reset dropzone to original state
            const dropzone = document.getElementById('remover-dropzone');
            if (dropzone && originalDropzoneHTML) {
                dropzone.innerHTML = originalDropzoneHTML;
                const newInput = document.getElementById('remover-file-input');
                if (newInput) {
                    newInput.addEventListener('change', (e) => {
                        if (e.target.files.length > 0) loadAndProcessImage(e.target.files[0]);
                    });
                }
            }

            document.getElementById('remover-dropzone').classList.remove('hidden');
            document.getElementById('remover-studio').classList.add('hidden');
            document.getElementById('remover-loader').classList.add('hidden');
            uploadedImage = null;
        }, 300);
    }
}

// ── History System ──
function saveHistoryState() {
    if (!studioCtx) return;
    if (historyIndex < historyStack.length - 1) {
        historyStack = historyStack.slice(0, historyIndex + 1);
    }
    const imgData = studioCtx.getImageData(0, 0, studioCanvas.width, studioCanvas.height);
    historyStack.push(imgData);
    if (historyStack.length > 25) {
        historyStack.shift();
    } else {
        historyIndex++;
    }
    updateHistoryButtons();
}

function undoAction() {
    if (historyIndex > 0) {
        historyIndex--;
        studioCtx.putImageData(historyStack[historyIndex], 0, 0);
        backupCtx.clearRect(0, 0, backupCanvas.width, backupCanvas.height);
        backupCtx.drawImage(studioCanvas, 0, 0);
        applyEdgeAndGlowFilters();
        updateHistoryButtons();
        showAlert("Undo Berhasil!");
    }
}

function redoAction() {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        studioCtx.putImageData(historyStack[historyIndex], 0, 0);
        backupCtx.clearRect(0, 0, backupCanvas.width, backupCanvas.height);
        backupCtx.drawImage(studioCanvas, 0, 0);
        applyEdgeAndGlowFilters();
        updateHistoryButtons();
        showAlert("Redo Berhasil!");
    }
}

function updateHistoryButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = (historyIndex <= 0);
    if (btnRedo) btnRedo.disabled = (historyIndex >= historyStack.length - 1);
}

// ── Canvas Zoom ──
function setCanvasZoom(zoom) {
    canvasZoom = zoom;
    studioCanvas.style.transform = `scale(${zoom})`;
    showAlert(`Zoom Kanvas: ${zoom * 100}%`);
}

// ── Image Load & Setup ──
async function loadAndProcessImage(file) {
    if (!file.type.startsWith('image/')) {
        showAlert('Format file wajib berupa citra gambar!');
        return;
    }

    const dropzone  = document.getElementById('remover-dropzone');
    const loader    = document.getElementById('remover-loader');
    const studio    = document.getElementById('remover-studio');

    dropzone.classList.add('hidden');
    loader.classList.remove('hidden');

    uploadedImage     = new Image();
    uploadedImage.src = URL.createObjectURL(file);

    uploadedImage.onload = () => {
        setupStudioCanvases();
        loader.classList.add('hidden');
        studio.classList.remove('hidden');
        runAutoAIMatting();
    };
}

function setupStudioCanvases() {
    if (!uploadedImage) return;

    const maxDimension = 800;
    let width  = uploadedImage.width;
    let height = uploadedImage.height;

    if (width > maxDimension || height > maxDimension) {
        if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width  = maxDimension;
        } else {
            width  = Math.round((width * maxDimension) / height);
            height = maxDimension;
        }
    }

    studioCanvas.width  = width;
    studioCanvas.height = height;
    studioCtx.clearRect(0, 0, width, height);
    studioCtx.drawImage(uploadedImage, 0, 0, width, height);

    backupCanvas.width  = width;
    backupCanvas.height = height;
    backupCtx.clearRect(0, 0, width, height);
    backupCtx.drawImage(uploadedImage, 0, 0, width, height);

    document.getElementById('canvas-dim-label').innerText = `${width}x${height} px`;

    hasNeonGlow = false;
    document.getElementById('neon-glow-toggle').checked    = false;
    document.getElementById('edge-blur-slider').value      = 0;
    document.getElementById('edge-blur-val').innerText     = '0px';

    historyStack = [];
    historyIndex = -1;
    saveHistoryState();
    setCanvasZoom(1);
    initCanvasEvents();
}

function resetToOriginal() {
    if (!uploadedImage) return;
    studioCtx.clearRect(0, 0, studioCanvas.width, studioCanvas.height);
    studioCtx.drawImage(uploadedImage, 0, 0, studioCanvas.width, studioCanvas.height);
    backupCtx.clearRect(0, 0, backupCanvas.width, backupCanvas.height);
    backupCtx.drawImage(uploadedImage, 0, 0, backupCanvas.width, backupCanvas.height);
    saveHistoryState();
    applyEdgeAndGlowFilters();
    showAlert("Gambar Direset ke Versi Asli!");
}

// ── Tool Switcher ──
function switchTool(tool) {
    activeTool = tool;

    const btnAutoAI  = document.getElementById('tool-auto-ai');
    const btnChroma  = document.getElementById('tool-chroma');
    const btnErase   = document.getElementById('tool-erase');
    const btnRestore = document.getElementById('tool-restore');
    const ctrlChroma = document.getElementById('chroma-instructions');
    const ctrlErase  = document.getElementById('erase-controls');

    const inactiveClass = "w-full flex items-center justify-between bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase transition-all";

    [btnAutoAI, btnChroma, btnErase, btnRestore].forEach(btn => btn.className = inactiveClass);
    ctrlChroma.classList.add('hidden');
    ctrlErase.classList.add('hidden');

    if (tool === 'auto-ai') {
        btnAutoAI.className = "w-full flex items-center justify-between bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-2.5 py-2.5 text-[10px] font-bold uppercase transition-all shadow-lg shadow-purple-600/15";
    } else if (tool === 'chroma') {
        btnChroma.className = "w-full flex items-center justify-between bg-purple-500/10 border border-purple-500/30 text-white rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase transition-all";
        ctrlChroma.classList.remove('hidden');
    } else if (tool === 'erase') {
        btnErase.className  = "w-full flex items-center justify-between bg-purple-500/10 border border-purple-500/30 text-white rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase transition-all";
        ctrlErase.classList.remove('hidden');
    } else if (tool === 'restore') {
        btnRestore.className = "w-full flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-2.5 py-2 text-[10px] font-bold uppercase transition-all";
        ctrlErase.classList.remove('hidden');
    }
}

function updateToleranceLabel(val) {
    chromaTolerance = parseInt(val);
    document.getElementById('tolerance-val').innerText = `${val}%`;
}

// ── Cursor Indicator ──
const brushCursorIndicator = document.getElementById('brush-cursor-indicator');

function updateCursorIndicatorSize() {
    if (brushCursorIndicator) {
        const displaySize = brushSize * canvasZoom;
        brushCursorIndicator.style.width  = `${displaySize}px`;
        brushCursorIndicator.style.height = `${displaySize}px`;
    }
}

// ── Auto AI Matting (Local, No API) ──
function runAutoAIMatting() {
    if (!studioCtx || !studioCanvas) return;
    switchTool('auto-ai');
    showAlert("Memproses AI Edge-Matting Lokal...");

    setTimeout(() => {
        const imgData = studioCtx.getImageData(0, 0, studioCanvas.width, studioCanvas.height);
        const data    = imgData.data;
        const width   = studioCanvas.width;
        const height  = studioCanvas.height;

        // Sample corner pixel colors as background seeds
        const cornerPixels = [
            { r: data[0], g: data[1], b: data[2] },
            { r: data[(width - 1) * 4], g: data[(width - 1) * 4 + 1], b: data[(width - 1) * 4 + 2] },
            { r: data[(height - 1) * width * 4], g: data[(height - 1) * width * 4 + 1], b: data[(height - 1) * width * 4 + 2] },
            { r: data[(width * height - 1) * 4], g: data[(width * height - 1) * 4 + 1], b: data[(width * height - 1) * 4 + 2] }
        ];

        // BFS region growing from corners
        const visited = new Uint8Array(width * height);
        const queue   = [
            { x: 0, y: 0 },
            { x: width - 1, y: 0 },
            { x: 0, y: height - 1 },
            { x: width - 1, y: height - 1 }
        ];

        visited[0] = visited[width - 1] = visited[(height - 1) * width] = visited[width * height - 1] = 1;

        const tolerance = 45;

        while (queue.length > 0) {
            const curr = queue.shift();
            const idx  = (curr.y * width + curr.x) * 4;
            const r    = data[idx], g = data[idx + 1], b = data[idx + 2];

            const neighbors = [
                { x: curr.x + 1, y: curr.y }, { x: curr.x - 1, y: curr.y },
                { x: curr.x, y: curr.y + 1 }, { x: curr.x, y: curr.y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                    const nIndex = n.y * width + n.x;
                    if (visited[nIndex] === 0) {
                        const nI  = nIndex * 4;
                        const nr  = data[nI], ng = data[nI + 1], nb = data[nI + 2];
                        let match = false;
                        for (const seed of cornerPixels) {
                            const diff = Math.sqrt(
                                (nr - seed.r) ** 2 + (ng - seed.g) ** 2 + (nb - seed.b) ** 2
                            );
                            if (diff < tolerance) { match = true; break; }
                        }
                        if (match) { visited[nIndex] = 1; queue.push(n); }
                    }
                }
            }
        }

        for (let i = 0; i < visited.length; i++) {
            if (visited[i] === 1) data[i * 4 + 3] = 0;
        }

        studioCtx.putImageData(imgData, 0, 0);
        backupCtx.clearRect(0, 0, width, height);
        backupCtx.drawImage(studioCanvas, 0, 0);
        applyEdgeAndGlowFilters();
        saveHistoryState();
        showAlert("Auto AI Matting Berhasil!");
    }, 500);
}

// ── Canvas Events ──
function initCanvasEvents() {
    const container = document.getElementById('canvas-workspace-container');

    studioCanvas.onmouseenter = () => {
        if (activeTool === 'erase' || activeTool === 'restore') {
            brushCursorIndicator.style.display = 'block';
            updateCursorIndicatorSize();
        }
    };

    studioCanvas.onmouseleave = () => {
        brushCursorIndicator.style.display = 'none';
    };

    studioCanvas.onmousemove = (e) => {
        const containerRect = container.getBoundingClientRect();
        brushCursorIndicator.style.left = `${e.clientX - containerRect.left}px`;
        brushCursorIndicator.style.top  = `${e.clientY - containerRect.top}px`;
        handleDrawMove(e.clientX, e.clientY);
    };

    studioCanvas.onmousedown  = (e) => handleDrawStart(e.clientX, e.clientY);
    window.onmouseup          = () => handleDrawEnd();

    studioCanvas.ontouchstart = (e) => {
        if (e.touches.length > 0) handleDrawStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    studioCanvas.ontouchmove  = (e) => {
        if (e.touches.length > 0) handleDrawMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    studioCanvas.ontouchend   = () => handleDrawEnd();
}

function handleDrawStart(clientX, clientY) {
    const rect = studioCanvas.getBoundingClientRect();
    const x    = ((clientX - rect.left) / rect.width)  * studioCanvas.width;
    const y    = ((clientY - rect.top)  / rect.height) * studioCanvas.height;

    if (activeTool === 'chroma') {
        executeChromaKeyAt(x, y);
    } else if (activeTool === 'erase') {
        isDrawing = true;
        studioCtx.globalCompositeOperation = 'destination-out';
        setupDrawingBrush(x, y);
    } else if (activeTool === 'restore') {
        isDrawing = true;
        studioCtx.globalCompositeOperation = 'source-over';
        drawRestorePoint(x, y);
    }
}

function handleDrawMove(clientX, clientY) {
    if (!isDrawing) return;
    const rect = studioCanvas.getBoundingClientRect();
    const x    = ((clientX - rect.left) / rect.width)  * studioCanvas.width;
    const y    = ((clientY - rect.top)  / rect.height) * studioCanvas.height;

    if (activeTool === 'erase') {
        studioCtx.lineTo(x, y);
        studioCtx.stroke();
    } else if (activeTool === 'restore') {
        drawRestorePoint(x, y);
    }
}

function handleDrawEnd() {
    if (isDrawing) {
        isDrawing = false;
        backupCtx.clearRect(0, 0, backupCanvas.width, backupCanvas.height);
        backupCtx.drawImage(studioCanvas, 0, 0);
        applyEdgeAndGlowFilters();
        saveHistoryState();
    }
}

function setupDrawingBrush(startX, startY) {
    studioCtx.lineJoin   = 'round';
    studioCtx.lineCap    = 'round';
    studioCtx.strokeStyle = 'rgba(0,0,0,1)';
    studioCtx.lineWidth  = brushSize;
    studioCtx.beginPath();
    studioCtx.moveTo(startX, startY);
    studioCtx.lineTo(startX, startY);
    studioCtx.stroke();
}

function drawRestorePoint(x, y) {
    const r = brushSize / 2;
    studioCtx.save();
    studioCtx.beginPath();
    studioCtx.arc(x, y, r, 0, Math.PI * 2);
    studioCtx.clip();
    studioCtx.drawImage(uploadedImage, 0, 0, studioCanvas.width, studioCanvas.height);
    studioCtx.restore();
}

// ── Chroma Key ──
function executeChromaKeyAt(startX, startY) {
    const imgData  = studioCtx.getImageData(0, 0, studioCanvas.width, studioCanvas.height);
    const data     = imgData.data;
    const targetI  = (Math.floor(startY) * studioCanvas.width + Math.floor(startX)) * 4;
    const targetR  = data[targetI], targetG = data[targetI + 1], targetB = data[targetI + 2];
    const limit    = chromaTolerance * 2.2;

    for (let i = 0; i < data.length; i += 4) {
        const dist = Math.sqrt(
            (data[i] - targetR) ** 2 + (data[i + 1] - targetG) ** 2 + (data[i + 2] - targetB) ** 2
        );
        if (dist < limit) data[i + 3] = 0;
    }

    studioCtx.putImageData(imgData, 0, 0);
    backupCtx.clearRect(0, 0, backupCanvas.width, backupCanvas.height);
    backupCtx.drawImage(studioCanvas, 0, 0);
    applyEdgeAndGlowFilters();
    saveHistoryState();
    showAlert("Chroma Key Berhasil Dihapus!");
}

// ── Edge Blur & Neon Glow FX ──
function updateEdgeBlur(val) {
    edgeBlurRadius = parseInt(val);
    document.getElementById('edge-blur-val').innerText = `${val}px`;
    applyEdgeAndGlowFilters();
}

function toggleNeonGlow() {
    hasNeonGlow = document.getElementById('neon-glow-toggle').checked;
    applyEdgeAndGlowFilters();
}

function applyEdgeAndGlowFilters() {
    studioCtx.clearRect(0, 0, studioCanvas.width, studioCanvas.height);

    studioCtx.filter      = edgeBlurRadius > 0 ? `blur(${edgeBlurRadius * 0.15}px)` : 'none';
    studioCtx.shadowColor = hasNeonGlow ? '#8b5cf6' : 'transparent';
    studioCtx.shadowBlur  = hasNeonGlow ? 18 : 0;

    studioCtx.drawImage(backupCanvas, 0, 0);
    studioCtx.filter      = 'none';
    studioCtx.shadowBlur  = 0;
}

// ── Studio Background Pattern ──
function setStudioPattern(pattern) {
    const container = document.getElementById('canvas-workspace-container');
    if (!container) return;
    container.className = "rounded-xl border border-white/10 overflow-hidden relative flex items-center justify-center aspect-[4/3] max-h-[48vh] transition-all duration-300 shadow-inner";

    const patterns = {
        transparent: 'transparent-pattern',
        black:       'solid-black-pattern',
        neon:        'neon-glow-pattern',
        cyber:       'cyber-grid-pattern'
    };
    if (patterns[pattern]) container.classList.add(patterns[pattern]);
}
