import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 108,
            fontWeight: 800,
            fontFamily: "sans-serif",
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          G
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  );
}
