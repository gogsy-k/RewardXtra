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
          background: "linear-gradient(135deg, #0C1018 0%, #131A2B 60%, #1A2336 100%)",
          color: "#E8ECF4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40 }}>💳</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#818CF8" }}>CardWiz</div>
          <div style={{ fontSize: 24, color: "#8A93AC" }}>· News</div>
        </div>

        <div
          style={{
            marginTop: 30,
            alignSelf: "flex-start",
            fontSize: 22,
            fontWeight: 700,
            color: "#34D399",
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
          <div style={{ color: "#B7C0D4" }}>India-first credit card guides</div>
          <div style={{ color: "#818CF8", fontWeight: 700 }}>cardwiz.in</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
