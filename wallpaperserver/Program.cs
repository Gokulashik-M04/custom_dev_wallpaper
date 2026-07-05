using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using wallpaperserver.Interfaces;
using wallpaperserver.Model;
using wallpaperserver.Services;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5229");
builder.Host.UseWindowsService();
var app = builder.Build();
app.UseWebSockets();

app.Map("/monitor", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    SystemInfo systemInfo = new SystemInfo();
    IInformation cpuService = new CpuService();
    IInformation ramService = new RamService();
    while (socket.State == WebSocketState.Open)
    {
        systemInfo.Cpu = cpuService.GetReading();
        systemInfo.Ram = ramService.GetReading();
        string json = JsonSerializer.Serialize(systemInfo);

        byte[] bytes = Encoding.UTF8.GetBytes(json);

        await socket.SendAsync(
            bytes,
            WebSocketMessageType.Text,
            true,
            CancellationToken.None);

        await Task.Delay(500);
    }
});

app.Run();
