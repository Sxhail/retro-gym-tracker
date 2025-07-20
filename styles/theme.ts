const colors = {
  // Greens - Updated palette for better contrast
  neon: '#00FF41', // Bright green (main accent)
  neonBright: '#00FF41', // Bright green for highlights/active
  neonDim: '#00CC33', // Darker green for secondary/disabled
  neonDark: '#008800', // For muted/secondary text
  neonHover: '#00FF55', // Hover state
  neonFocus: '#00FFAA', // Focus state
  neonDisabled: '#005500', // Disabled state
  success: '#00FF88', // Success/confirmation
  error: '#FF0033', // Error

  // Backgrounds
  background: '#000000', // Pure black background
  backgroundOverlay: 'rgba(0,0,0,0.95)', // Card/overlay background
  backgroundGradient: 'linear-gradient(180deg, #000000 0%, #001100 100%)', // For web/large screens
  backgroundHover: 'rgba(0,32,0,0.98)', // Card/button hover

  // Borders & outlines
  border: '#00CC33', // Default border (darker green)
  borderFocus: '#00FF41', // Focused border (bright green)
  borderError: '#FF0033', // Error border

  // Text
  text: '#00FF41', // Default text (bright green)
  textSecondary: '#00CC33', // Secondary text (darker green)
  textDisabled: '#005500', // Disabled text
  textError: '#FF0033', // Error text

  // Misc
  overlay: 'rgba(0,0,0,0.8)', // Modal/overlay
};

const fonts = {
  mono: 'JetBrains Mono, monospace', // Modern monospace font
  // Typography scale
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 }, // Main page title
  h2: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 }, // Section title
  h3: { fontSize: 20, fontWeight: 'bold', lineHeight: 28 }, // Card/row title
  body: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 }, // Main body text
  caption: { fontSize: 14, fontWeight: 'normal', lineHeight: 20 }, // Small/secondary text
};

// Spacing scale (in px)
const spacing = {
  xs: 4,   // Extra small
  sm: 8,   // Small
  md: 16,  // Medium
  lg: 24,  // Large
  xl: 32,  // Extra large
  xxl: 48, // 2x extra large
};

// Shadows and effects
const shadows = {
  glow: {
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    shadowColor: '#00CC33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    shadowColor: '#00FF41',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
};

// Animation durations
const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};

const theme = {
  colors,
  fonts,
  spacing,
  shadows,
  animations,
  borderRadius: 8, // Increased for modern look
  borderWidth: 1,
};

export default theme; 