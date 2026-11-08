import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#087a50,#20b8a5)", color: "white", fontSize: 110, fontWeight: 800 }}>
        D
      </div>
    ),
    size,
  );
}
