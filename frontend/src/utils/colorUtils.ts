/**
 * Determines if a color is light or dark
 * @param color The color in hex format (e.g., '#FFFFFF')
 * @returns True if the color is light, false if it's dark
 */
export const isLightColor = (color: string): boolean => {
  // Default to dark if no color
  if (!color) return false;
  
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate brightness using perceived brightness formula
  // (https://www.w3.org/TR/AERT/#color-contrast)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true for light colors (>155), false for dark
  return brightness > 155;
};

/**
 * Generates a contrasting text color (black or white) based on background color
 * @param backgroundColor The background color in hex format
 * @returns '#000000' for light backgrounds, '#FFFFFF' for dark backgrounds
 */
export const getContrastTextColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
};

/**
 * Generates a random color in hex format
 * @returns A random color in hex format (e.g., '#FF5733')
 */
export const getRandomColor = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}; 