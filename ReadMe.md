# custom_dev_wallpaper

A live desktop wallpaper that visualizes your dev environment in real time. The client renders an animated **"C❤️de"** pixel-text scene in the browser/wallpaper engine, while a lightweight C# background service tracks system stats and app usage, streaming them to the client over WebSockets.

The heart in the middle isn't just decoration — it fills up based on how much of your time is spent in dev tools (VS Code, Docker, terminals, etc.) versus everything else.

---

## How it works

```
┌─────────────────────┐        WebSocket        ┌──────────────────────┐
│   WallpaperServer    │ ───────────────────────▶│   WallpaperClient     │
│   (C# background     │   { cpu, ram, process }  │   (HTML/CSS/JS)       │
│    service)           │                          │                       │
└─────────────────────┘                          └──────────────────────┘
        │                                                    │
        ▼                                                    ▼
  Polls OS for:                                    Renders:
  - CPU usage                                       - "C❤️de" pixel-grid text
  - RAM usage                                       - CPU / RAM usage widgets
  - Active/foreground process                        - Heart fill (dev-tool time %)
  - Dev-tool focus time
```

The server is the source of truth for system data. The client is a dumb renderer — it never polls anything itself, it just reacts to whatever the server pushes over the socket.

---

## Project structure

```
custom_dev_wallpaper/
├── WallpaperClient/
│   ├── index.html        # Markup + styles for the scene and widgets
│   └── script.js         # Canvas text rendering, heart fill, widget logic, WS client
│
├── WallpaperServer/
│   ├── Program.cs        # Entry point, WebSocket server bootstrap
│   ├── ProcessTracker.cs # Watches running processes, tracks dev-tool focus time
│   ├── SystemStats.cs    # Polls CPU / RAM usage
│   └── WallpaperServer.csproj
│
└── README.md
```

---

## WallpaperClient

A self-contained HTML/CSS/JS scene, designed to be run inside a wallpaper engine (e.g. Wallpaper Engine, Lively Wallpaper) or any browser-based wallpaper host that can load local HTML.

### What it renders

- **"C❤️de" pixel-grid text** — built from a `<canvas>`, with each letter rasterized into a grid of small squares that brighten near the mouse cursor (cosmetic only — wallpaper engines that don't track mouse position will just show the static base color).
- **Heart fill widget** — the heart-shaped gap between "C" and "de" fills bottom-to-top and shifts color from black → red as `value/total` increases. Driven by `value`/`total` numbers sent from the server (currently mapped to dev-tool focus time), with a white outline traced around the heart shape itself so it stays readable at every fill level.
- **Reusable progress-bar widget** — a flat rectangular bar with a title, current/total counts, and a live `%` shown beside the bar. Used for CPU and RAM usage, but built generically so any `{ title, value, total }` triple can drive it.

### Core reusable functions (`script.js`)

| Function | Purpose |
|---|---|
| `setHeartProgress(value, total)` | Set heart fill instantly, no animation |
| `animateHeartTo(value, total, durationMs)` | Smoothly tween heart fill to a new value |
| `setProgressBar(title, value, total)` | Set a progress bar instantly, no animation |
| `animateProgressBarTo(title, value, total, durationMs)` | Smoothly tween a progress bar to a new value |

These are intentionally decoupled from *where* the data comes from. Right now a demo loop calls them with random values; in production they're called from the WebSocket `onmessage` handler whenever the server pushes a new reading.

### Connecting to the server

The client opens a single WebSocket connection on load and listens for JSON messages:

```js
const socket = new WebSocket('ws://localhost:5000/ws');

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'cpu':
            animateProgressBarTo('cpu usage', data.value, 100);
            break;
        case 'ram':
            animateProgressBarTo('ram usage', data.value, data.total);
            break;
        case 'devToolTime':
            animateHeartTo(data.value, data.total);
            break;
    }
};
```

The exact message shape is up to you and the server — see [Message format](#message-format) below for the suggested contract.

### Running it standalone (without the server)

Open `index.html` directly in a browser. A demo block at the bottom of `script.js` calls the widget functions on a timer with fake values, so you can preview the visuals before the server is wired up. Delete or comment out that block once real data is flowing.

---

## WallpaperServer

A C# background service that watches the OS for running processes and resource usage, then pushes updates to any connected WallpaperClient over a WebSocket.

### Responsibilities

- **System stats polling** — periodically reads current CPU and RAM usage.
- **Process tracking** — watches the active/foreground process and a configurable list of "dev tools" (VS Code, Docker Desktop, terminal apps, IDEs, etc.), accumulating time spent in each.
- **WebSocket broadcasting** — pushes updates to connected clients as they happen, rather than waiting on the client to ask.

### Suggested message format

A simple `type` + `value` + `total` envelope keeps the client generic — every widget function takes exactly this shape:

```json
{ "type": "cpu", "value": 42, "total": 100 }
{ "type": "ram", "value": 6.4, "total": 16 }
{ "type": "devToolTime", "value": 130, "total": 480 }
```

| Field | Meaning |
|---|---|
| `type` | Which widget this update targets (`cpu`, `ram`, `devToolTime`, or any future widget type) |
| `value` | Current reading |
| `total` | The denominator for computing % (e.g. total RAM in GB, or total tracked minutes in the session) |

Keeping `total` in every message (rather than hardcoding it client-side) means the client never needs a config change if, say, total RAM differs across machines.

### Configuring tracked dev tools

The list of process names counted as "dev tools" for the heart-fill metric should live in server-side config (e.g. `appsettings.json`) rather than hardcoded, so it's easy to add new tools without recompiling:

```json
{
  "TrackedDevTools": [
    "Code.exe",
    "docker.exe",
    "Docker Desktop.exe",
    "WindowsTerminal.exe",
    "devenv.exe"
  ]
}
```

### Running the server

```bash
cd WallpaperServer
dotnet run
```

By default it should bind to a local WebSocket endpoint (e.g. `ws://localhost:5000/ws`) that the client connects to on load.

---

## Roadmap / ideas

- [ ] Persist dev-tool time across sessions (daily/weekly totals, not just "since wallpaper started")
- [ ] Per-app breakdown widget (not just an aggregate heart fill)
- [ ] Configurable color themes (currently monochrome + red heart fill)
- [ ] Reconnect/retry logic in the client if the WebSocket drops
- [ ] Package the server as a Windows service / startup task so it runs automatically

---

## License

Add your license of choice here.