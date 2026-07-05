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
          background: "linear-gradient(135deg, #171717 0%, #1F1F1F 100%)",
          color: "#F5F5F5",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 40, fontWeight: 900, color: "#6366F1" }}>💳 CardWiz</div>
          <div style={{ fontSize: 26, color: "#A0A0A0" }}>{period} · Savings Scorecard</div>
        </div>

        {name ? (
          <div style={{ marginTop: 34, fontSize: 34, color: "#CFCFCF" }}>{name}'s rewards</div>
        ) : (
          <div style={{ marginTop: 34, fontSize: 34, color: "#CFCFCF" }}>My card rewards</div>
        )}

        {/* Big earned number */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "flex-end", gap: 18 }}>
          <div style={{ fontSize: 130, fontWeight: 900, color: "#21F1A8", lineHeight: 1 }}>{earned}</div>
          <div style={{ fontSize: 36, color: "#A0A0A0", paddingBottom: 18 }}>earned</div>
        </div>

        {/* Stat row */}
        <div style={{ marginTop: 50, display: "flex", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", background: "#242424", borderRadius: 18, padding: "22px 28px", flex: 1 }}>
            <div style={{ fontSize: 26, color: "#A0A0A0" }}>Left on table</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#FB7185" }}>{missed}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", background: "#242424", borderRadius: 18, padding: "22px 28px", flex: 1 }}>
            <div style={{ fontSize: 26, color: "#A0A0A0" }}>Reward efficiency</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#FBBF24" }}>{eff}%</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 26 }}>
          <div style={{ color: "#CFCFCF" }}>Apna scorecard banao 👉</div>
          <div style={{ color: "#6366F1", fontWeight: 700 }}>cardwiz.in</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
