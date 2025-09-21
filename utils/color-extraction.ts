export interface ColorInfo {
  r: number;
  g: number;
  b: number;
  luminance?: number;
}

export interface VinylColorScheme {
  bg: string;
  grooveStyle: { borderColor: string };
  labelStyle: {
    background: string;
    borderColor: string;
  };
}

export const extractColorsFromImage = (coverImage: string): Promise<ColorInfo[]> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve([
        { r: 100, g: 100, b: 100, luminance: 100 },
        { r: 60, g: 60, b: 60, luminance: 60 },
        { r: 30, g: 30, b: 30, luminance: 30 }
      ]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve([
            { r: 100, g: 100, b: 100, luminance: 100 },
            { r: 60, g: 60, b: 60, luminance: 60 },
            { r: 30, g: 30, b: 30, luminance: 30 }
          ]);
          return;
        }

        canvas.width = 50;
        canvas.height = 50;
        ctx.drawImage(img, 0, 0, 50, 50);

        const imageData = ctx.getImageData(0, 0, 50, 50);
        const data = imageData.data;
        const colorMap = new Map<string, number>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const alpha = data[i + 3];

          if (alpha > 128) {
            const key = `${Math.floor(r/10)*10},${Math.floor(g/10)*10},${Math.floor(b/10)*10}`;
            colorMap.set(key, (colorMap.get(key) || 0) + 1);
          }
        }

        const sortedColors = Array.from(colorMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([colorKey]) => {
            const [r, g, b] = colorKey.split(',').map(Number);
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            return { r, g, b, luminance };
          });

        resolve(sortedColors.length > 0 ? sortedColors : [
          { r: 100, g: 100, b: 100, luminance: 100 },
          { r: 60, g: 60, b: 60, luminance: 60 },
          { r: 30, g: 30, b: 30, luminance: 30 }
        ]);
      } catch (error) {
        console.error('Color extraction error:', error);
        resolve([
          { r: 100, g: 100, b: 100, luminance: 100 },
          { r: 60, g: 60, b: 60, luminance: 60 },
          { r: 30, g: 30, b: 30, luminance: 30 }
        ]);
      }
    };

    img.onerror = () => {
      resolve([
        { r: 100, g: 100, b: 100, luminance: 100 },
        { r: 60, g: 60, b: 60, luminance: 60 },
        { r: 30, g: 30, b: 30, luminance: 30 }
      ]);
    };

    img.src = coverImage;
  });
};

export const getVinylColorsFromCover = async (coverImage: string): Promise<VinylColorScheme> => {
  try {
    const colors = await extractColorsFromImage(coverImage);

    const fallbackColors = [
      { r: 100, g: 100, b: 100 },
      { r: 60, g: 60, b: 60 },
      { r: 30, g: 30, b: 30 }
    ];

    const selectedColors = colors.length >= 3 ? colors : fallbackColors;

    const color1 = selectedColors[0];
    const color2 = selectedColors[Math.floor(selectedColors.length / 2)];
    const color3 = selectedColors[selectedColors.length - 1];

    const bg = `linear-gradient(135deg, rgba(${color1.r}, ${color1.g}, ${color1.b}, 0.9), rgba(${color2.r}, ${color2.g}, ${color2.b}, 0.8), rgba(${color3.r}, ${color3.g}, ${color3.b}, 0.9))`;

    const brightColor = selectedColors[selectedColors.length - 1];
    const grooveColor = `rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 0.6)`;

    return {
      bg,
      grooveStyle: { borderColor: grooveColor },
      labelStyle: {
        background: `linear-gradient(135deg, rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 0.8), rgba(${Math.max(0, brightColor.r-50)}, ${Math.max(0, brightColor.g-50)}, ${Math.max(0, brightColor.b-50)}, 0.9))`,
        borderColor: `rgba(${brightColor.r}, ${brightColor.g}, ${brightColor.b}, 0.7)`
      }
    };
  } catch (error) {
    console.error('Color extraction failed:', error);
    return {
      bg: 'linear-gradient(135deg, rgba(100, 100, 100, 0.8), rgba(60, 60, 60, 0.9), rgba(30, 30, 30, 1))',
      grooveStyle: { borderColor: 'rgba(156, 163, 175, 0.6)' },
      labelStyle: {
        background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
        borderColor: '#b91c1c'
      }
    };
  }
};