using System;
using System.Runtime.InteropServices;

class Program
{
    [StructLayout(LayoutKind.Sequential)]
    public struct POINT
    {
        public int X;
        public int Y;
    }

    [DllImport("user32.dll")]
    static extern bool GetCursorPos(out POINT lpPoint);

    static void Main()
    {
        while (true)
        {
            GetCursorPos(out POINT point);

            Console.Clear();

            Console.WriteLine($"Mouse X : {point.X}");
            Console.WriteLine($"Mouse Y : {point.Y}");

            Thread.Sleep(50);
        }
    }
}