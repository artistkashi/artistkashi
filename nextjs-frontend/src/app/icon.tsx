import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#0a0a0a",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "#0F0F0F",
          border: "1px solid #2a2a2a",
          borderRadius: 10,
          boxSizing: "border-box",
          display: "flex",
          height: 28,
          justifyContent: "center",
          fontFamily: "Inter Tight, Arial, sans-serif",
          fontSize: 20,
          fontWeight: 800,
          lineHeight: 1,
          width: 28,
        }}
      >
        <span style={{ color: "#f5f5f5" }}>A</span>
        <span style={{ color: "#d4af37" }}>K</span>
      </div>
    </div>,
    size
  );
}
