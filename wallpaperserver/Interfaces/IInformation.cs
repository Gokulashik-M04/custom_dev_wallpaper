using System;
using System.Net.WebSockets;
namespace wallpaperserver.Interfaces
{
    public interface IInformation
    {
        string GetName();
        float GetReading();

    }
}