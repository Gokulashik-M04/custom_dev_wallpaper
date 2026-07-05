# custom_dev_wallpaper

A live desktop wallpaper that visualizes your machine's CPU/RAM usage in real time, with a "C❤️de" pixel-text scene as the centerpiece. The client renders everything in HTML/CSS/JS (designed to run inside a wallpaper engine like **Lively Wallpaper**), while a lightweight C# background service polls system stats and streams them to the client over a WebSocket.

The heart in the middle fills bottom-to-top based on overall system load (average of CPU + RAM usage), and a typewriter widget cycles through a list of phrases below the text.

---

## How it works

```
┌─────────────────────┐        WebSocket        ┌──────────────────────┐
│   WallpaperServer     │ ───────────────────────▶│   WallpaperClient      │
│   (ASP.NET Core,      │      /monitor           │   (HTML/CSS/JS,        │
│    runs as a          │   { Cpu, Ram }           │    loaded by Lively)   │
│    Windows Service)   │                          │                       │
└─────────────────────┘                          └──────────────────────┘
        │                                                    │
        ▼                                                    ▼
  Polls OS every 500ms:                             Renders:
  - CPU usage (%)                                    - "C❤️de" pixel-grid text
  - RAM usage (%)                                     - CPU / RAM progress-bar widgets
                                                       - Heart fill (avg CPU+RAM load)
                                                       - Looping typewriter text
```

The server is the source of truth for system data. The client never polls anything itself — it opens one WebSocket connection and reacts to whatever the server pushes.

---

## Project structure

```
custom_dev_wallpaper/
├── WallpaperClient/
│   ├── index.html        # Markup + styles: canvas text, heart, progress widgets, typewriter
│   └── script.js         # Canvas text rendering, heart fill, progress bars,
│                          # MonitorSocket (WS client), typewriter loop
│
├── WallpaperServer/
│   ├── Program.cs                    # Entry point, Kestrel URL binding, /monitor endpoint,
│   │                                  # UseWindowsService() for service hosting
│   ├── Interfaces/
│   │   └── IInformation.cs           # Shared contract for stat readers
│   ├── Services/
│   │   ├── CpuService.cs             # Implements IInformation, reads CPU usage
│   │   └── RamService.cs             # Implements IInformation, reads RAM usage
│   ├── Model/
│   │   └── SystemInfo.cs             # { Cpu, Ram } — the payload sent over the socket
│   └── WallpaperServer.csproj
│
└── README.md
```

---

## WallpaperClient

A self-contained HTML/CSS/JS scene, designed to be loaded as a wallpaper by Lively Wallpaper (or any wallpaper engine / browser host that can load local HTML).

### What it renders

- **"C❤️de" pixel-grid text** — built from a `<canvas>`, rasterized into a grid of small squares that brighten near the mouse cursor.
- **Heart fill widget** — the heart-shaped gap between "C" and "de" fills bottom-to-top and shifts color from black → red as load increases, with a white outline traced around the heart shape.
- **CPU / RAM progress-bar widgets** — two widgets stacked bottom-left, built off a shared `createProgressBarController()` factory so both widgets reuse the same render/animate logic.
- **Typewriter widget** — centered below the main text, loops forever through an array of phrases (type out → pause → delete → next).

### Core reusable functions (`script.js`)

| Function | Purpose |
|---|---|
| `setHeartProgress(value, total)` | Set heart fill instantly, no animation |
| `animateHeartTo(value, total, durationMs)` | Smoothly tween heart fill to a new value |
| `createProgressBarController(elements)` | Factory returning `{ setTitle, set, animateTo }` for one progress-bar widget |
| `positionHeartSlot()` / `positionTypewriter()` | Re-layout the heart and typewriter under the canvas text; called on load and on window resize |
| `startTypewriterLoop(phrases)` | Kicks off the forever type/delete cycle over an array of strings |

### Connecting to the server

The client opens a single WebSocket via the `MonitorSocket` class, which auto-reconnects (2s delay) if the connection drops:

```js
const MONITOR_SOCKET_URL = 'ws://localhost:5229/monitor';

new MonitorSocket(MONITOR_SOCKET_URL, (info) => {
    cpuBar.animateTo(info.Cpu, 100, 500);
    ramBar.animateTo(info.Ram, 100, 500);

    const avgLoad = (info.Cpu + info.Ram) / 2;
    animateHeartTo(avgLoad, 100, 500);
});
```

`MONITOR_SOCKET_URL` must match wherever the server is actually bound (see [Choosing the port](#choosing-the-port) below).

### Running it standalone (without the server)

Open `index.html` directly in a browser. With no server running, `MonitorSocket` will just keep retrying quietly in the background — the pixel text, heart (at 0%), progress bars (at 0%), and typewriter will all still render and animate normally.

---

## WallpaperServer

An ASP.NET Core app that polls CPU/RAM usage and pushes readings to any connected client over a WebSocket at `/monitor`, every 500ms.

### Message format

```json
{ "Cpu": 42.3, "Ram": 61.8 }
```

Both fields are percentages (0–100). The client treats `total` as a fixed 100 for both, so no `total` field is sent.

### Choosing the port

Set it explicitly in `Program.cs` so it doesn't depend on `launchSettings.json` (which is dev-only and is ignored when running as a Windows Service):

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5229"); // must match MONITOR_SOCKET_URL in script.js
builder.Host.UseWindowsService();
var app = builder.Build();
```

Binding to `localhost` (not `0.0.0.0`) keeps the socket reachable only from your own machine.

### Running it during development

```bash
cd WallpaperServer
dotnet run
```

---

## Building and running it as a Windows Service

This makes the server start automatically at boot, with no console window, and restart itself if it crashes — so you never have to manually `dotnet run` it again.

### 1. Add the Windows Service hosting package

```bash
dotnet add package Microsoft.Extensions.Hosting.WindowsServices
```

### 2. Wire it up in `Program.cs`

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5229");
builder.Host.UseWindowsService();
var app = builder.Build();
```

`UseWindowsService()` detects the hosting context automatically — the same build still runs fine with `dotnet run` during development.

### 3. Publish

```powershell
dotnet publish -c Release -r win-x64 --self-contained false -o "D:\path\to\publish"
```

Use a dedicated `publish` folder, separate from your normal `bin\Debug`/`bin\Release` output, so a locked running service `.exe` never blocks your everyday `dotnet build`.

> If the path contains spaces, always wrap it in quotes — an unquoted path with a space gets split into multiple arguments and `dotnet` will misread it.

### 4. Register the service

Run PowerShell **as Administrator**. Note: use `sc.exe` explicitly — plain `sc` is a PowerShell alias for `Set-Content` and will not work.

```powershell
sc.exe create WallpaperServer binPath= "D:\path\to\publish\WallpaperServer.exe" start= auto
```

If the path has spaces, wrap it in escaped inner quotes as well:

```powershell
sc.exe create WallpaperServer binPath= "\"D:\path with spaces\publish\WallpaperServer.exe\"" start= auto
```

### 5. Configure restart-on-failure

```powershell
sc.exe failure WallpaperServer reset= 86400 actions= restart/5000/restart/5000/restart/5000
```

Restarts up to 3 times, 5 seconds apart, resetting the failure count after 24 hours of stability.

### 6. Start it

```powershell
sc.exe start WallpaperServer
```

### 7. Verify

```powershell
sc.exe query WallpaperServer
```

Look for `STATE : 4 RUNNING`. If it's not running, check Event Viewer → Windows Logs → Application for the failure reason (common causes: port already in use, missing .NET runtime on the machine if published as framework-dependent).

Once confirmed, reboot once to make sure it comes up on its own with zero manual steps — that's the whole point.

### Useful service commands going forward

| Command | Effect |
|---|---|
| `sc.exe query WallpaperServer` | Check current status |
| `sc.exe stop WallpaperServer` | Stop it |
| `sc.exe start WallpaperServer` | Start it |
| `sc.exe qc WallpaperServer` | Show how it's registered (binary path, start type) |
| `sc.exe delete WallpaperServer` | Unregister it entirely (stop it first) |

---

## Roadmap / ideas

- [x] Reconnect/retry logic in the client if the WebSocket drops (`MonitorSocket`)
- [x] Package the server as a Windows Service so it runs automatically
- [ ] Persist historical CPU/RAM readings (not just the live instantaneous value)
- [ ] Config file (`appsettings.json`) for polling interval and bound port, instead of hardcoding
- [ ] Configurable color themes (currently monochrome + red heart fill)
- [ ] Terminal/command widget on the client, with a matching command-execution endpoint on the server
- [ ] Additional stats: disk usage, network throughput, per-core CPU breakdown

---

## License

Add your license of choice here.
