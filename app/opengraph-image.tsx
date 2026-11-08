import { ImageResponse } from "next/og";

export const alt = "DiagnoSearch — compare diagnostic test prices from labs near you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#f4fbf7 0%,#d9f3e6 55%,#bfeee6 100%)", color: "#0b2e22" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg,#087a50,#20b8a5)", color: "white", fontSize: 46, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>D</div>
          <div style={{ fontSize: 42, fontWeight: 800, color: "#087a50" }}>DiagnoSearch</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Upload your prescription. Get the best price from labs near you.</div>
        <div style={{ marginTop: 36, fontSize: 32, color: "#35604f" }}>Free for patients · Labs within 20 km reply with offers</div>
      </div>
    ),
    size,
  );
}
