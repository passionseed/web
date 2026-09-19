import { ImageResponse } from "next/og";

export const alt = "SHIFT | The 7-Day Proof-of-Work Sandbox สำหรับ TCAS 1";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#05010d",
          backgroundImage:
            "radial-gradient(circle at 50% 25%, rgba(191, 255, 0, 0.12) 0%, transparent 60%), radial-gradient(circle at 85% 85%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
          position: "relative",
          padding: "60px 70px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
        }}
      >
        {/* Decorative Grid Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #BFFF00 0%, #F59E0B 50%, #BFFF00 100%)",
          }}
        />

        {/* Top Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 18px",
              borderRadius: "9999px",
              border: "1px solid rgba(191, 255, 0, 0.35)",
              backgroundColor: "rgba(191, 255, 0, 0.08)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#BFFF00",
            }}
          >
            PASSIONSEED R&amp;D LAB
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#94a3b8",
            }}
          >
            TCAS 1 ADMISSIONS SANDBOX · 9 SEATS
          </div>
        </div>

        {/* Middle Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginTop: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              fontSize: "96px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              background: "linear-gradient(135deg, #ffffff 30%, #BFFF00 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            SHIFT[0]
          </div>
          <div
            style={{
              fontSize: "30px",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              marginTop: "16px",
              color: "#f8fafc",
            }}
          >
            The 7-Day Proof-of-Work Crucible
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 400,
              color: "#cbd5e1",
              maxWidth: "850px",
              marginTop: "14px",
              lineHeight: 1.5,
            }}
          >
            เลิกสะสมใบเซอร์ค่ายนั่งฟัง แล้วสร้าง Live Project พร้อมคนใช้งาน 15–30 คน ใน 7 วัน
          </div>
        </div>

        {/* Bottom Three Deliverable Pillars */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            width: "100%",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "16px 20px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#BFFF00", letterSpacing: "0.15em" }}>
              01 SHIPPED ASSET
            </span>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginTop: "4px" }}>
              Functional Prototype
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "16px 20px",
              borderRadius: "16px",
              border: "1px solid rgba(191, 255, 0, 0.3)",
              backgroundColor: "rgba(191, 255, 0, 0.05)",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#BFFF00", letterSpacing: "0.15em" }}>
              02 TELEMETRY
            </span>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginTop: "4px" }}>
              15–30 Real Users &amp; Pivot Log
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "16px 20px",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#BFFF00", letterSpacing: "0.15em" }}>
              03 ADMISSIONS DEFENSE
            </span>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#ffffff", marginTop: "4px" }}>
              1-Page TCAS Case Study
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
