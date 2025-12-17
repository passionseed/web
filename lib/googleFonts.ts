import fullFontList from './googleFontsList.json';

// Use the full list from the JSON file
export const POPULAR_GOOGLE_FONTS = fullFontList;

/**
 * Dynamically loads a Google Font by injecting a link tag
 * @param fontName The name of the font (e.g. "Great Vibes")
 */
export const loadGoogleFont = (fontName: string) => {
    if (!fontName) return;

    // Replace spaces with + for URL
    const fontUrlName = fontName.replace(/\s+/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${fontUrlName}:wght@400;700&display=swap`;

    // Check if already loaded
    if (document.querySelector(`link[href="${href}"]`)) {
        return;
    }

    const link = document.createElement('link');
    link.href = href;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
};
