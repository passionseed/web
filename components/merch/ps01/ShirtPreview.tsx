import { PRINT_FILES } from "@/lib/content/ps01-handmade";

const TEE =
  "M146,36 Q200,50 254,36 L330,62 L392,150 L350,178 L318,152 L318,430 L82,430 L82,152 L50,178 L8,150 L70,62 Z";
const GARMENT = "#172836";
const SEAM = "rgba(254,249,231,.25)";
/** The drawing is a size M: 236 px across the body = 58 cm. */
const PX_PER_CM = 236 / 58;

const print = (id: string) => PRINT_FILES.find((p) => p.id === id)!;

/** A size M tee with the real print files placed at their real size. */
export function ShirtPreview({ side }: { side: "front" | "back" }) {
  const cm = (n: number) => n * PX_PER_CM;
  return (
    <svg viewBox="0 0 400 450" role="img" aria-label={`The ${side} of the shirt with its print`}>
      <path d={TEE} fill={GARMENT} />
      {side === "front" ? (
        <>
          <path d="M156,38 Q200,53 244,38 Q200,84 156,38 Z" fill="#000" fillOpacity={0.45} />
          <path d="M146,36 Q200,98 254,36" fill="none" stroke={SEAM} strokeWidth={1.6} />
          <image href={print("front").file} x={200 + cm(9.5) - cm(print("front").widthCm) / 2} y={44 + cm(8)} width={cm(print("front").widthCm)} height={cm(print("front").heightCm)} />
        </>
      ) : (
        <>
          <path d="M146,36 Q200,60 254,36" fill="none" stroke={SEAM} strokeWidth={1.6} />
          <image href={print("back").file} x={200 - cm(print("back").widthCm) / 2} y={48 + cm(8)} width={cm(print("back").widthCm)} height={cm(print("back").heightCm)} />
        </>
      )}
      <path d={TEE} fill="none" stroke="rgba(254,249,231,.3)" strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}
