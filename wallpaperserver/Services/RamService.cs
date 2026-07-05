using System.Diagnostics;
using wallpaperserver.Interfaces;

namespace wallpaperserver.Services
{
    public class RamService : IInformation
    {
        private readonly PerformanceCounter _memoryCounter;

        public RamService()
        {
            _memoryCounter = new PerformanceCounter(
                "Memory",
                "% Committed Bytes In Use");

            // Prime the counter
            _memoryCounter.NextValue();
            Thread.Sleep(100);
        }

        public string GetName()
        {
            return "RAM";
        }

        public float GetReading()
        {
            return _memoryCounter.NextValue();
        }
    }
}