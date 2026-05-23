import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Growl — AI generates 3 marketing ideas every week";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)",
          padding: "40px 56px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header: Logo + Name + Tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 36,
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 52,
              height: 52,
              background: "linear-gradient(135deg, #818cf8, #a78bfa)",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, color: "white", lineHeight: 1 }}>
              G
            </span>
          </div>
          <span style={{ fontSize: 36, fontWeight: 800, color: "white", letterSpacing: "-1px" }}>
            Growl
          </span>
          <div
            style={{
              marginLeft: 12,
              background: "rgba(129,140,248,0.25)",
              border: "1px solid rgba(129,140,248,0.5)",
              borderRadius: 20,
              padding: "4px 14px",
              fontSize: 14,
              color: "#a5b4fc",
              fontWeight: 600,
            }}
          >
            AI Marketing
          </div>
        </div>

        {/* Main headline */}
        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.2,
            marginBottom: 40,
            letterSpacing: "-0.5px",
          }}
        >
          From zero ideas to weekly posts —{" "}
          <span style={{ color: "#a78bfa" }}>fully automated.</span>
        </div>

        {/* Timeline: Before → Using Growl → Results */}
        <div style={{ display: "flex", gap: 16, flex: 1 }}>

          {/* BEFORE */}
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#f87171",
                letterSpacing: "2px",
                marginBottom: 10,
              }}
            >
              BEFORE
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 16 }}>
              Stuck every week
            </div>
            {[
              "😓  No marketing ideas",
              "⏰  Hours wasted brainstorming",
              "📉  Inconsistent posting",
              "💸  Hiring copywriters",
            ].map((item) => (
              <div
                key={item}
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.55)",
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "#818cf8",
            }}
          >
            →
          </div>

          {/* USING GROWL */}
          <div
            style={{
              flex: 1,
              background: "linear-gradient(135deg, rgba(99,102,241,0.4), rgba(139,92,246,0.4))",
              border: "1px solid rgba(129,140,248,0.5)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#a5b4fc",
                letterSpacing: "2px",
                marginBottom: 10,
              }}
            >
              WITH GROWL
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 16 }}>
              Set up in 3 minutes
            </div>
            {[
              "🤖  AI generates 3 tactics weekly",
              "📋  Copy the post, done",
              "🎯  Tailored to your industry",
              "🔄  Refreshes every week automatically",
            ].map((item) => (
              <div
                key={item}
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {item}
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "#818cf8",
            }}
          >
            →
          </div>

          {/* RESULTS */}
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(167,243,208,0.3)",
              borderRadius: 20,
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#6ee7b7",
                letterSpacing: "2px",
                marginBottom: 10,
              }}
            >
              RESULTS
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 16 }}>
              Consistent growth
            </div>
            {[
              "📈  More engagement every month",
              "⚡  10x faster content creation",
              "🧘  Zero marketing stress",
              "💰  Save on agency costs",
            ].map((item) => (
              <div
                key={item}
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 24,
          }}
        >
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            growl.app
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            Works for 6 industries · Free to start
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
