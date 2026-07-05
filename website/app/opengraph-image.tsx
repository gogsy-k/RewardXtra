import { ImageResponse } from "next/og";

export const alt = "CardWiz — India ka smart credit & debit card reward finder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default social-share image for every route (routes can override).
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0C1018 0%, #090D15 100%)",
          color: "#E8ECF4",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 900, color: "#818CF8" }}>💳 CardWiz</div>
        <div style={{ marginTop: 24, fontSize: 44, fontWeight: 700, lineHeight: 1.2, maxWidth: 900 }}>
          India ka smart credit &amp; debit card reward finder
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: "#B7C0D4" }}>
          195+ cards · best card at checkout · privacy-first
        </div>
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 16,
            fontSize: 24,
            color: "#818CF8",
          }}
        >
          <span>cardwiz.in</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
