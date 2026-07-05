const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const heartSlot = document.getElementById('heart-slot');
// ---- Typewriter: loops forever over an array of phrases ----
const typewriterEl = document.getElementById('typewriter');
const typewriterTextEl = document.getElementById('typewriter-text');

let W, H;
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => { resize(); buildGrid(); positionHeartSlot();positionTypewriter();  });

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
positionTypewriter()

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
   PROGRESS BAR CONTROLLER  —  a small factory so CPU and RAM widgets
   (or any future metric) can share the same rendering/animation logic
   instead of duplicating it per-widget.
   ====================================================================== */

/**
 * @typedef {Object} ProgressBarElements
 * @property {HTMLElement} titleEl
 * @property {HTMLElement} fillEl
 * @property {HTMLElement} percentEl
 * @property {HTMLElement} currentEl
 * @property {HTMLElement} totalEl
 * @property {HTMLElement} statusEl
 */

/**
 * Creates a controller for a single progress-bar widget.
 * @param {ProgressBarElements} els
 */
function createProgressBarController(els) {
    let currentPercent = 0;

    function clampPercent(p) {
        return Math.max(0, Math.min(100, p));
    }

    function statusForPercent(percent) {
        if (percent === 0) return 'idle';
        if (percent < 50) return 'nominal';
        if (percent < 85) return 'elevated';
        return 'high load';
    }

    function render(percent, value, total) {
        const rounded = Math.round(percent);
        els.fillEl.style.width = percent + '%';
        els.percentEl.textContent = rounded + '%';
        els.currentEl.textContent = Math.round(value);
        els.totalEl.textContent = total;
        els.statusEl.textContent = statusForPercent(rounded);

        const brightness = 0.85 + (percent / 100) * 0.3;
        els.fillEl.style.filter = `brightness(${brightness})`;
    }

    return {
        setTitle(title) {
            els.titleEl.textContent = title;
        },

        /**
         * Set the bar instantly (no animation).
         * @param {number} value
         * @param {number} total
         */
        set(value, total) {
            const safeTotal = total > 0 ? total : 1;
            currentPercent = clampPercent((value / safeTotal) * 100);
            render(currentPercent, value, total);
        },

        /**
         * Animate the bar smoothly to a new value/total.
         * @param {number} value
         * @param {number} total
         * @param {number} durationMs
         */
        animateTo(value, total, durationMs = 900) {
            const safeTotal = total > 0 ? total : 1;
            const targetPercent = clampPercent((value / safeTotal) * 100);
            const startPercent = currentPercent;
            const startTime = performance.now();
            els.totalEl.textContent = total;

            function step(now) {
                const t = Math.min(1, (now - startTime) / durationMs);
                const eased = easeInOutQuad(t);
                const percent = startPercent + (targetPercent - startPercent) * eased;
                render(percent, (percent / 100) * total, total);
                currentPercent = percent;
                if (t < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        }
    };
}

const cpuBar = createProgressBarController({
    titleEl: document.getElementById('cpuTitle'),
    fillEl: document.getElementById('cpuFill'),
    percentEl: document.getElementById('cpuPercent'),
    currentEl: document.getElementById('cpuCurrent'),
    totalEl: document.getElementById('cpuTotal'),
    statusEl: document.getElementById('cpuStatus')
});

const ramBar = createProgressBarController({
    titleEl: document.getElementById('ramTitle'),
    fillEl: document.getElementById('ramFill'),
    percentEl: document.getElementById('ramPercent'),
    currentEl: document.getElementById('ramCurrent'),
    totalEl: document.getElementById('ramTotal'),
    statusEl: document.getElementById('ramStatus')
});

cpuBar.setTitle('cpu usage');
ramBar.setTitle('ram usage');
cpuBar.set(0, 100);
ramBar.set(0, 100);
setHeartProgress(0, 100);


/* ======================================================================
   SYSTEM INFO TYPE  —  mirrors the C# `SystemInfo` model sent by the
   WallpaperServer over the /monitor WebSocket.
   ====================================================================== */

/**
 * @typedef {Object} SystemInfo
 * @property {number} Cpu - CPU utilization, expected as a 0-100 percentage.
 * @property {number} Ram - RAM utilization, expected as a 0-100 percentage.
 */


/* ======================================================================
   MONITOR SOCKET  —  connects to the WallpaperServer's /monitor endpoint,
   parses each SystemInfo push, and auto-reconnects on drop.
   ====================================================================== */

class MonitorSocket {
    /**
     * @param {string} url - e.g. "ws://localhost:5000/monitor"
     * @param {(info: SystemInfo) => void} onMessage
     */
    constructor(url, onMessage) {
        this.url = url;
        this.onMessage = onMessage;
        this.reconnectDelayMs = 2000;
        this.socket = null;
        this._connect();
    }

    _connect() {
        this.socket = new WebSocket(this.url);

        this.socket.addEventListener('open', () => {
            console.log(`MonitorSocket: connected to ${this.url}`);
        });

        this.socket.addEventListener('message', (event) => {
            try {
                /** @type {SystemInfo} */
                const info = JSON.parse(event.data);
                this.onMessage(info);
            } catch (err) {
                console.error('MonitorSocket: failed to parse message', err);
            }
        });

        this.socket.addEventListener('close', () => {
            console.warn('MonitorSocket: connection closed, retrying...');
            setTimeout(() => this._connect(), this.reconnectDelayMs);
        });

        this.socket.addEventListener('error', () => {
            this.socket.close();
        });
    }
}

// Update to match wherever WallpaperServer is actually listening (see its
// launch settings / Kestrel binding for the real host and port).
const MONITOR_SOCKET_URL = 'ws://localhost:5229/monitor';

new MonitorSocket(MONITOR_SOCKET_URL, (info) => {
    cpuBar.animateTo(info.Cpu, 100, 500);
    ramBar.animateTo(info.Ram, 100, 500);

    // Heart now reflects overall system load instead of the old demo data.
    const avgLoad = (info.Cpu + info.Ram) / 2;
    animateHeartTo(avgLoad, 100, 500);
});



// Edit this array with whatever phrases you want cycling.
const typewriterPhrases = [
    // Dev
    "building things one commit at a time",
    "git commit -m \"it works... hopefully\"",
    "git fetch > git pull",
    "merge conflicts build character",
    "debugging is my cardio",
    "works on my machine™",
    "sudo make me better",
    "npm install && pray",
    "docker compose up",
    "dockerized my problems",
    "terraform apply",
    "aws | dotnet | react | docker |",
    "cloud native in progress ☁️",
    "CI/CD > copy & paste deployment",
    "automate the boring stuff",
    "console.log(saved_my_life)",
    "404: excuses not found",
    "500: motivation server error",
    "throw new Exception(\"Skill Issue\")",
    "System.out.println(\"Keep Going\");",
    "while(true) { learn(); }",
    "if(failed) tryAgain();",
    "return betterThanYesterday;",
    "refactor > rewrite",
    "build > consume",
    "ship. learn. repeat.",
    "custom_dev_wallpaper",

    // DSA
    "O(log n) feels good",
    "accepted ✅",
    "time limit exceeded... again",
    "one more LeetCode",
    "graphs > trees > dp > sleep",
    "binary search fixes everything",
    "optimize later? no. optimize now.",

    // Gym
    "eat • code • gym • repeat",
    "discipline > motivation",
    "progressive overload",
    "strong body. stronger mind.",
    "one more rep. one more bug.",

    // Mindset
    "consistency compounds",
    "be better than yesterday",
    "focus. execute. improve.",
    "dream big. start small.",
    "small wins every day",
    "discipline creates freedom",
    "future me is watching",
    "the compound effect",
    "trust the process",
    "stay curious.",
    "keep showing up.",
    "learning never exits",
    "one percent better",
    "always shipping, always learning",
    "don't count the hours",
    "be undeniable.",

    // Fun
    "coffee.exe has stopped responding ☕",
    "loading confidence...",
    "sleep is deprecated",
    "feature complete (probably)",
    "99 bugs in the code...",
    "CTRL + S every 10 seconds",
    "keyboard > mouse",
    "I void warranties",
    "developer mode: enabled",
    "RGB increases performance",
    "no AI, only Stack Overflow 😄",
    "brain compiling...",
    "/* TODO: Become Legendary */",
    "Achievement Unlocked: Fixed One Bug",
    "Segmentation fault (life dumped core)",
    "Hello, Future Me."
];
//await fetch('phrases.json').then(res=>res.json()).then(data=>data.phrases);
// async function loadTypewriterPhrases() {
//     typewriterPhrases = await fetch('phrases.json').then(res => res.json()).then(data => data.phrases);
//     startTypewriterLoop(typewriterPhrases);
// }
// loadTypewriterPhrases();

const TYPE_SPEED_MS = 70;
const DELETE_SPEED_MS = 40;
const PAUSE_AFTER_TYPE_MS = 1400;
const PAUSE_AFTER_DELETE_MS = 400;

async function startTypewriterLoop(phrases) {
    let phraseIndex = 0;
    let charIndex = 0;

    function typeStep() {
        const phrase = phrases[phraseIndex];
        charIndex++;
        typewriterTextEl.textContent = phrase.slice(0, charIndex);

        if (charIndex < phrase.length) {
            setTimeout(typeStep, TYPE_SPEED_MS);
        } else {
            setTimeout(deleteStep, PAUSE_AFTER_TYPE_MS);
        }
    }

    function deleteStep() {
        charIndex--;
        typewriterTextEl.textContent = typewriterTextEl.textContent.slice(0, charIndex);

        if (charIndex > 0) {
            setTimeout(deleteStep, DELETE_SPEED_MS);
        } else {
            phraseIndex = (phraseIndex + 1) % phrases.length; // loop forever
            setTimeout(typeStep, PAUSE_AFTER_DELETE_MS);
        }
    }

    typeStep();
}

if (typewriterPhrases.length > 0) {
    startTypewriterLoop(typewriterPhrases);
}
// ---- Position the typewriter below the "C {heart} de" text ----
function positionTypewriter() {
    const layout = computeLayout();
    const centerX = (layout.cStartX + layout.deStartX + layout.deWidth) / 2;
    const topY = layout.cy + FONT_SIZE * 0.22; // just under the baseline of the main text

    typewriterEl.style.left = `${centerX}px`;
    typewriterEl.style.top = `${topY}px`;
}
