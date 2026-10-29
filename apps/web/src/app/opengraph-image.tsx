import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Shipyard - track everything, rewrite anything";

const FLARE = "#cf4626";
const PAPER = "#fdf6ef";
const INK = "#1a1210";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: `linear-gradient(145deg, ${PAPER} 0%, #f3e4d4 55%, #ead4c0 100%)`,
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: FLARE,
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: INK,
              letterSpacing: "-0.02em",
            }}
          >
            Shipyard
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
            }}
          >
            Track everything. Rewrite anything.
          </div>
          <div style={{ fontSize: 28, color: "#5c4a42", lineHeight: 1.35 }}>
            Letterboxd for every story you have loved, and the ones you wish existed.
          </div>
        </div>
        <div
          style={{
            width: 160,
            height: 8,
            borderRadius: 4,
            background: FLARE,
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
