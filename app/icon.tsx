import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#087a50,#20b8a5)", color: "white", fontSize: 300, fontWeight: 800, borderRadius: 112 }}>
        D
      </div>
    ),
    size,
  );
}
