using System.Diagnostics;
using wallpaperserver.Interfaces;

namespace wallpaperserver.Services
{
    public class CpuService : IInformation
    {
        private readonly PerformanceCounter _cpuCounter;

        public CpuService()
        {
            _cpuCounter = new PerformanceCounter(
                "Processor",
                "% Processor Time",
                "_Total");

            // Prime the counter (first reading is usually 0)
            _cpuCounter.NextValue();
            Thread.Sleep(100);
        }

        public string GetName()
        {
            return "CPU";
        }

        public float GetReading()
        {
            return _cpuCounter.NextValue();
        }
    }
}