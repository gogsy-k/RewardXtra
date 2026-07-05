import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";

// Branded news cover image. Params: title, cat. e.g. /news-cover?title=RBI%20rules&cat=News
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const title = (sp.get("title") || "CardWiz News").slice(0, 120);
  const cat = (sp.get("cat") || "News").slice(0, 40);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #171717 0%, #1F1F1F 60%, #242424 100%)",
          color: "#F5F5F5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40 }}>💳</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#6366F1" }}>CardWiz</div>
          <div style={{ fontSize: 24, color: "#A0A0A0" }}>· News</div>
        </div>

        <div
          style={{
            marginTop: 30,
            alignSelf: "flex-start",
            fontSize: 22,
            fontWeight: 700,
            color: "#6366F1",
            background: "rgba(52,211,153,0.12)",
            borderRadius: 999,
            padding: "8px 20px",
          }}
        >
          {cat}
        </div>

        <div style={{ marginTop: 28, fontSize: 60, fontWeight: 900, lineHeight: 1.12, maxWidth: 1000 }}>
          {title}
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 24 }}>
          <div style={{ color: "#CFCFCF" }}>India-first credit card guides</div>
          <div style={{ color: "#6366F1", fontWeight: 700 }}>cardwiz.in</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
