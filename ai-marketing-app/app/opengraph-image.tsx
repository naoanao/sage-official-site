import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Growl — AIが毎週マーケ施策を提案";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          padding: 80,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 100,
            height: 100,
            background: "white",
            borderRadius: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 64, fontWeight: 800, color: "#6366f1", lineHeight: 1 }}>
            G
          </span>
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            letterSpacing: "-2px",
            marginBottom: 16,
          }}
        >
          Growl
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.4,
          }}
        >
          AIが毎週マーケ施策を3つ提案。コピーして投稿するだけ。
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 56,
          }}
        >
          {[
            { num: "3分", label: "で設定完了" },
            { num: "6業種", label: "に対応" },
            { num: "毎週", label: "自動で更新" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: "20px 32px",
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 800, color: "white" }}>{s.num}</span>
              <span style={{ fontSize: 20, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
