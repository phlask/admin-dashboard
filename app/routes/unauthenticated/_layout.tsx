import { Outlet } from "react-router";

import phlasklogo from "~/assets/PHLASK_v2.svg";
import { ThemeToggle } from "~/components/ThemeToggle";
import { WaveDivider } from "~/components/WaveDivider";

const BUBBLES = [
  { left: "8%", size: 14, delay: 0, duration: 9 },
  { left: "18%", size: 8, delay: 2.5, duration: 7 },
  { left: "32%", size: 20, delay: 1, duration: 11 },
  { left: "62%", size: 10, delay: 3.5, duration: 8 },
  { left: "78%", size: 16, delay: 0.5, duration: 10 },
  { left: "90%", size: 9, delay: 2, duration: 7.5 },
];

export default function UnauthenticatedLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-brand-100 via-brand-300 to-brand-600 px-4 py-12 dark:from-navy-950 dark:via-navy-900 dark:to-navy-800">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {BUBBLES.map((bubble) => (
        <span
          key={bubble.left}
          aria-hidden
          className="pointer-events-none absolute bottom-0 rounded-full bg-white/40 dark:bg-brand-200/20"
          style={{
            left: bubble.left,
            width: bubble.size,
            height: bubble.size,
            animation: `bubble-rise ${bubble.duration}s ease-in infinite`,
            animationDelay: `${bubble.delay}s`,
          }}
        />
      ))}

      <WaveDivider
        color="var(--color-brand-400)"
        height={140}
        opacity={0.35}
        duration={26}
        className="bottom-0 dark:opacity-20"
      />
      <WaveDivider
        color="var(--color-brand-500)"
        height={100}
        opacity={0.45}
        duration={20}
        reverse
        className="bottom-0 dark:opacity-25"
      />
      <WaveDivider
        color="var(--color-brand-700)"
        height={60}
        opacity={0.55}
        duration={15}
        className="bottom-0 dark:opacity-30"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-2xl bg-white/80 p-3 shadow-md backdrop-blur-sm dark:bg-navy-950/60">
            <img src={phlasklogo} alt="PHLASK Logo" className="h-9" />
          </div>
        </div>
        <div className="rounded-2xl border border-white/50 bg-white/75 p-8 shadow-xl backdrop-blur-md dark:border-navy-700/60 dark:bg-navy-900/75">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
