import { Box, type SxProps, type Theme } from "@mui/material";

// Two periods of the same wave back-to-back so a -50% translateX loops seamlessly.
const WAVE_PATH =
  "M0,40 C150,90 350,0 600,40 C850,80 1050,0 1200,40 C1350,80 1550,0 1800,40 C1950,80 2150,0 2400,40 L2400,120 L0,120 Z";

type WaveDividerProps = {
  color: string;
  height?: number;
  opacity?: number;
  duration?: number;
  reverse?: boolean;
  sx?: SxProps<Theme>;
};

export function WaveDivider({
  color,
  height = 60,
  opacity = 1,
  duration = 18,
  reverse = false,
  sx,
}: WaveDividerProps) {
  return (
    <Box
      aria-hidden
      sx={[
        {
          pointerEvents: "none",
          position: "absolute",
          insetInline: 0,
          overflow: "hidden",
          lineHeight: 0,
          height,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        component="svg"
        aria-hidden="true"
        viewBox="0 0 2400 120"
        preserveAspectRatio="none"
        sx={{
          position: "absolute",
          insetBlock: 0,
          left: 0,
          height: "100%",
          width: "200%",
          animation: `wave-drift ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
          opacity,
        }}
      >
        <path d={WAVE_PATH} fill={color} />
      </Box>
    </Box>
  );
}
