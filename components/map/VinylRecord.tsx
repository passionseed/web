import { VinylColorScheme } from "@/utils/color-extraction";

interface VinylRecordProps {
  isAnimating?: boolean;
  vinylColors?: VinylColorScheme | null;
  coverImage?: string;
  showClickToPlay?: boolean;
  size?: string;
  topOffset?: string;
  hoverTranslateY?: string;
}

export function VinylRecord({
  isAnimating = true,
  vinylColors,
  coverImage,
  showClickToPlay = false,
  size = "90%",
  topOffset = "-2rem",
  hoverTranslateY = "-8rem",
}: VinylRecordProps) {
  const hasImage = Boolean(coverImage);

  return (
    <div
      className="vinyl-container absolute left-1/2 aspect-square transition-all duration-700 group-hover:vinyl-hover"
      style={{
        zIndex: 1,
        width: size,
        top: topOffset,
        ["--hover-translate-y" as string]: hoverTranslateY,
      }}
    >
      <div className="relative w-full h-full">
        <div
          className={`vinyl-record w-full h-full rounded-full shadow-2xl border-4 relative overflow-hidden ${
            !hasImage
              ? "bg-gradient-to-br from-gray-900 via-black to-gray-800 border-gray-700"
              : "border-opacity-70"
          }`}
          style={vinylColors ? { background: vinylColors.bg } : {}}
        >
          {/* Vinyl Grooves */}
          <div
            className="absolute inset-4 rounded-full border opacity-40"
            style={
              vinylColors?.grooveStyle
                ? vinylColors.grooveStyle
                : { borderColor: "rgba(156, 163, 175, 0.5)" }
            }
          />
          <div
            className="absolute inset-8 rounded-full border opacity-25"
            style={
              vinylColors?.grooveStyle
                ? vinylColors.grooveStyle
                : { borderColor: "rgba(156, 163, 175, 0.3)" }
            }
          />
          <div
            className="absolute inset-12 rounded-full border opacity-15"
            style={
              vinylColors?.grooveStyle
                ? vinylColors.grooveStyle
                : { borderColor: "rgba(156, 163, 175, 0.2)" }
            }
          />
          <div
            className="absolute inset-16 rounded-full border opacity-10"
            style={
              vinylColors?.grooveStyle
                ? vinylColors.grooveStyle
                : { borderColor: "rgba(156, 163, 175, 0.1)" }
            }
          />

          {/* Center Label */}
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 flex items-center justify-center shadow-lg"
            style={
              vinylColors?.labelStyle
                ? vinylColors.labelStyle
                : {
                    background: "linear-gradient(135deg, #991b1b, #7f1d1d)",
                    borderColor: "#b91c1c",
                  }
            }
          >
            <div className="w-6 h-6 bg-black rounded-full shadow-inner" />
          </div>

          {/* Vinyl Reflection */}
          <div className="absolute top-4 left-4 w-16 h-16 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-sm" />

          {/* Curved "Click to Play" text that appears on hover */}
          {showClickToPlay && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <svg className="w-full h-full" viewBox="0 0 288 288">
                <defs>
                  <path
                    id="circle-path"
                    d="M 144,144 m -128,0 a 128,128 0 1,1 256,0 a 128,128 0 1,1 -256,0"
                  />
                </defs>
                <text className="text-white/60 text-sm font-thin tracking-widest uppercase fill-white/60">
                  <textPath href="#circle-path" startOffset="0%">
                    click to play • click to play • click to play • click to
                    play • click to play • click to play •
                  </textPath>
                </text>
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
