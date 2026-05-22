import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          borderRadius: 110,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 300,
            fontWeight: 800,
            fontFamily: "sans-serif",
            lineHeight: 1,
            marginTop: 20,
          }}
        >
          G
        </span>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
