// Two periods of the same wave back-to-back so a -50% translateX loops seamlessly.
const WAVE_PATH =
  "M0,40 C150,90 350,0 600,40 C850,80 1050,0 1200,40 C1350,80 1550,0 1800,40 C1950,80 2150,0 2400,40 L2400,120 L0,120 Z";

type WaveDividerProps = {
  color: string;
  height?: number;
  opacity?: number;
  duration?: number;
  reverse?: boolean;
  className?: string;
};

export function WaveDivider({
  color,
  height = 60,
  opacity = 1,
  duration = 18,
  reverse = false,
  className,
}: WaveDividerProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 overflow-hidden leading-none ${className ?? ""}`}
      style={{ height }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 2400 120"
        preserveAspectRatio="none"
        className="absolute inset-y-0 left-0 h-full w-[200%]"
        style={{
          animation: `wave-drift ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
          opacity,
        }}
      >
        <path d={WAVE_PATH} fill={color} />
      </svg>
    </div>
  );
}
