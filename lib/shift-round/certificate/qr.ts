import QRCode from "qrcode";

/** QR module matrix for the verify URL (package `qrcode`, error level M). */
export function qrMatrix(text: string): { size: number; isDark: (row: number, col: number) => boolean } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const { size, data } = qr.modules;
  return { size, isDark: (row, col) => Boolean(data[row * size + col]) };
}

/** Same QR as an SVG string (used where a vector QR is wanted, e.g. the web page). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#14112A", light: "#FFFFFF" },
  });
}
