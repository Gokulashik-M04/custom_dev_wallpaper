const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const heartSlot = document.getElementById('heart-slot');

let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); buildGrid(); positionHeartSlot(); });

// ---- Pixel grid settings ----
const PIXEL = 6;      // size of each "pixel" cell
const GAP = 1;        // gap between pixels

// ---- Layout settings (shared by canvas text + heart slot positioning) ----
const FONT_SIZE = 170;
const FONT_FAMILY = "'Snell Roundhand', 'Brush Script MT', 'Segoe Script', 'Lucida Handwriting', cursive";
const offCanvas = document.createElement('canvas');
const offCtx = offCanvas.getContext('2d');

// Computes the shared layout: where "C" sits, where the heart gap sits, where "de" sits.
// Used both for drawing the pixel text mask and for positioning the HTML heart slot.
function computeLayout() {
    offCtx.font = `italic 700 ${FONT_SIZE}px ${FONT_FAMILY}`;
    const cy = H / 2 + FONT_SIZE * 0.32;

    const cWidth = offCtx.measureText('C').width;
    const heartSize = FONT_SIZE * 1;
    const heartGapWidth = heartSize * 0.85;
    const deWidth = offCtx.measureText('de').width;
    const spacing = FONT_SIZE * 0.10;
    const totalWidth = cWidth + spacing + heartGapWidth + spacing + deWidth;
    let startX = (W - totalWidth) / 2;

    const cStartX = startX;
    startX += cWidth + spacing;

    const heartStartX = startX;
    const heartCenterX = startX + heartGapWidth / 2;
    const heartCenterY = cy - FONT_SIZE * 0.32;
    startX += heartGapWidth + spacing;

    const deStartX = startX;

    return {
        cy, cStartX, cWidth,
        heartStartX, heartGapWidth, heartCenterX, heartCenterY, heartSize,
        deStartX, deWidth
    };
}

// ---- Draw "C" and "de" only (heart is left as empty space, filled by HTML slot) ----
function buildTextMask() {
    offCanvas.width = W;
    offCanvas.height = H;
    offCtx.clearRect(0, 0, W, H);
    offCtx.fillStyle = '#fff';
    offCtx.textBaseline = 'alphabetic';
    offCtx.textAlign = 'left';
    offCtx.font = `italic 700 ${FONT_SIZE}px ${FONT_FAMILY}`;

    const layout = computeLayout();
    offCtx.fillText('C', layout.cStartX, layout.cy);
    offCtx.fillText('de', layout.deStartX, layout.cy);
}

// ---- Position the HTML heart slot (and its outline) to match the gap left for it ----
const heartOutline = document.getElementById('heart-outline');

function positionHeartSlot() {
    const layout = computeLayout();
    const s = layout.heartSize / 2;
    // bounding box roughly matches the heart silhouette: slightly taller than wide
    const boxW = s * 2.0;
    const boxH = s * 2.05;
    const left = layout.heartCenterX - boxW / 3;
    const top = layout.heartCenterY - boxH * 0.48;

    heartSlot.style.left = `${left}px`;
    heartSlot.style.top = `${top}px`;
    heartSlot.style.width = `${boxW}px`;
    heartSlot.style.height = `${boxH}px`;

    // outline SVG sits in the exact same box so the stroke traces the fill's edge
    if (heartOutline) {
        heartOutline.style.left = `${left}px`;
        heartOutline.style.top = `${top}px`;
        heartOutline.style.width = `${boxW}px`;
        heartOutline.style.height = `${boxH}px`;
    }
}

// ---- Build the grid of pixel cells from the text mask ----
let cells = [];

function buildGrid() {
    buildTextMask();
    const textData = offCtx.getImageData(0, 0, W, H).data;

    cells = [];
    const cols = Math.floor(W / (PIXEL + GAP));
    const rows = Math.floor(H / (PIXEL + GAP));

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const px = col * (PIXEL + GAP) + PIXEL / 2;
            const py = row * (PIXEL + GAP) + PIXEL / 2;
            const idx = (Math.floor(py) * W + Math.floor(px)) * 4;
            const alpha = textData[idx + 3];

            if (alpha > 50) {
                cells.push({
                    x: col * (PIXEL + GAP),
                    y: row * (PIXEL + GAP),
                    cx: px,
                    cy: py
                });
            }
        }
    }
}

buildGrid();
positionHeartSlot();

// ---- Mouse tracking ----
let mouseX = -9999, mouseY = -9999;
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
window.addEventListener('mouseleave', () => {
    mouseX = -9999;
    mouseY = -9999;
});

// ---- Color definitions ----
const GREY_BASE = { r: 90, g: 90, b: 90 };
const GREY_BRIGHT = { r: 235, g: 235, b: 235 };
const HOVER_RADIUS = 160;

function lerp(a, b, t) {
    return a + (b - a) * t;
}
function lerpColor(c1, c2, t) {
    return {
        r: Math.round(lerp(c1.r, c2.r, t)),
        g: Math.round(lerp(c1.g, c2.g, t)),
        b: Math.round(lerp(c1.b, c2.b, t))
    };
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const dx = cell.cx - mouseX;
        const dy = cell.cy - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let t = 0;
        if (dist < HOVER_RADIUS) {
            t = 1 - dist / HOVER_RADIUS;
            t = t * t; // ease for smoother falloff
        }

        const color = lerpColor(GREY_BASE, GREY_BRIGHT, t);
        ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
        ctx.fillRect(cell.x, cell.y, PIXEL, PIXEL);
    }

    requestAnimationFrame(draw);
}

draw();


/* ======================================================================
   HEART FILL  —  fills bottom-to-top, color animates black -> red.
   value/total are meant to be supplied by your server in the future.
   ====================================================================== */

const heartFillEl = document.getElementById('heart-fill');

/**
 * Set the heart fill instantly (no animation) based on value/total.
 * @param {number} value - current amount
 * @param {number} total - max amount (100%)
 */
function setHeartProgress(value, total) {
    const safeTotal = total > 0 ? total : 1;
    const percent = Math.max(0, Math.min(100, (value / safeTotal) * 100));

    heartFillEl.style.height = percent + '%';
    heartFillEl.style.backgroundColor = colorForPercent(percent);
}

/**
 * Animate the heart fill smoothly from its current value to a new value/total.
 * Call this whenever new data arrives (e.g. a server response or websocket push).
 * @param {number} value
 * @param {number} total
 * @param {number} durationMs - how long the animation should take
 */
function animateHeartTo(value, total, durationMs = 1200) {
    const safeTotal = total > 0 ? total : 1;
    const targetPercent = Math.max(0, Math.min(100, (value / safeTotal) * 100));

    const startPercent = parseFloat(heartFillEl.style.height) || 0;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeInOutQuad(t);
        const current = startPercent + (targetPercent - startPercent) * eased;

        heartFillEl.style.height = current + '%';
        heartFillEl.style.backgroundColor = colorForPercent(current);

        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

/** Interpolates black -> red as percent goes 0 -> 100 */
function colorForPercent(percent) {
    const t = percent / 100;
    const r = Math.round(lerp(0, 200, t)); // 0 -> 200 red channel
    const g = 0;
    const b = 0;
    return `rgb(${r},${g},${b})`;
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}


/* ======================================================================
   PROGRESS BAR  —  title/value/total all passed in programmatically.
   No <input> typing — content comes from a function call (later: server data).
   ====================================================================== */

const progressTitleEl = document.getElementById('progressTitle');
const progressFillEl = document.getElementById('progressFill');
const percentLabelEl = document.getElementById('percentLabel');
const currentCountEl = document.getElementById('current-count');
const totalCountEl = document.getElementById('total-count');
const statusLabelEl = document.getElementById('statusLabel');

/**
 * Set the progress bar instantly (no animation).
 * @param {string} title - label shown above the bar, e.g. "files uploaded"
 * @param {number} value - current amount
 * @param {number} total - max amount (100%)
 */
function setProgressBar(title, value, total) {
    const safeTotal = total > 0 ? total : 1;
    const percent = Math.max(0, Math.min(100, Math.round((value / safeTotal) * 100)));

    progressTitleEl.textContent = title;
    progressFillEl.style.width = percent + '%';
    percentLabelEl.textContent = percent + '%';
    currentCountEl.textContent = value;
    totalCountEl.textContent = total;
    statusLabelEl.textContent = statusForPercent(percent);

    const brightness = 0.85 + (percent / 100) * 0.3;
    progressFillEl.style.filter = `brightness(${brightness})`;
}

/**
 * Animate the progress bar smoothly to a new value/total.
 * Call this whenever new data arrives (e.g. a server response or websocket push).
 * @param {string} title
 * @param {number} value
 * @param {number} total
 * @param {number} durationMs
 */
function animateProgressBarTo(title, value, total, durationMs = 1200) {
    const safeTotal = total > 0 ? total : 1;
    const targetPercent = Math.max(0, Math.min(100, (value / safeTotal) * 100));

    const startPercent = parseFloat(progressFillEl.style.width) || 0;
    const startTime = performance.now();

    progressTitleEl.textContent = title;
    totalCountEl.textContent = total;

    function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = easeInOutQuad(t);
        const current = startPercent + (targetPercent - startPercent) * eased;
        const roundedPercent = Math.round(current);

        progressFillEl.style.width = current + '%';
        percentLabelEl.textContent = roundedPercent + '%';
        currentCountEl.textContent = Math.round((current / 100) * total);
        statusLabelEl.textContent = statusForPercent(roundedPercent);

        const brightness = 0.85 + (current / 100) * 0.3;
        progressFillEl.style.filter = `brightness(${brightness})`;

        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function statusForPercent(percent) {
    if (percent === 0) return 'idle';
    if (percent < 50) return 'in progress';
    if (percent < 100) return 'almost there';
    return 'complete';
}


/* ======================================================================
   DEMO ONLY — remove this block once real server data is wired in.
   Shows how setProgressBar/animateHeartTo etc. get called with fresh values.
   In production, replace this setInterval with your actual data source,
   e.g. a fetch() poll or a websocket "onmessage" handler, calling:
       animateProgressBarTo(title, value, total)
       animateHeartTo(value, total)
   ====================================================================== */

let demoValue = 0;
const demoTotal = 50;

setProgressBar('chars typed', 0, demoTotal);
setHeartProgress(0, demoTotal);

setInterval(() => {
    demoValue = Math.min(demoTotal, demoValue + Math.round(Math.random() * 6));
    animateProgressBarTo('chars typed', demoValue, demoTotal, 900);
    animateHeartTo(demoValue, demoTotal, 900);

    if (demoValue >= demoTotal) demoValue = 0; // loop demo
}, 1800);