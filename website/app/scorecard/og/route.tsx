import { ImageResponse } from "next/og";

export const runtime = "edge"; // next/og ImageResponse needs the edge runtime in route handlers
export const alt = "My CardWiz savings scorecard";
export const contentType = "image/png";

const fmt = (v: string | null) => "₹" + Number(v || 0).toLocaleString("en-IN");

// Dynamic, shareable scorecard image. Params: earned, missed, eff, period, name.
// e.g. /scorecard/og?earned=620&missed=560&eff=53&period=June
export function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const earned = fmt(sp.get("earned"));
  const missed = fmt(sp.get("missed"));
  const eff = sp.get("eff") || "0";
  const period = sp.get("period") || "This month";
  const name = sp.get("name") || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "70px 80px",
          background: "linear-gradient(135deg, #0C1018 0%, #131A2B 100%)",
          color: "#E8ECF4",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#818CF8" }}>💳 CardWiz</div>
          <div style={{ fontSize: 26, color: "#8A93AC" }}>{period} · Savings Scorecard</div>
        </div>

        {name ? (
          <div style={{ marginTop: 34, fontSize: 34, color: "#B7C0D4" }}>{name}'s rewards</div>
        ) : (
          <div style={{ marginTop: 34, fontSize: 34, color: "#B7C0D4" }}>My card rewards</div>
        )}

        {/* Big earned number */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "flex-end", gap: 18 }}>
          <div style={{ fontSize: 130, fontWeight: 900, color: "#34D399", lineHeight: 1 }}>{earned}</div>
          <div style={{ fontSize: 36, color: "#8A93AC", paddingBottom: 18 }}>earned</div>
        </div>

        {/* Stat row */}
        <div style={{ marginTop: 50, display: "flex", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", background: "#1A2336", borderRadius: 18, padding: "22px 28px", flex: 1 }}>
            <div style={{ fontSize: 26, color: "#8A93AC" }}>Left on table</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#FB7185" }}>{missed}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", background: "#1A2336", borderRadius: 18, padding: "22px 28px", flex: 1 }}>
            <div style={{ fontSize: 26, color: "#8A93AC" }}>Reward efficiency</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#FBBF24" }}>{eff}%</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ color: "#B7C0D4" }}>Apna scorecard banao 👉</div>
          <div style={{ color: "#818CF8", fontWeight: 700 }}>cardwiz.in</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
