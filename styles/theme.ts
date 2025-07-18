const colors = {
  // Greens
  neon: '#00FF00', // Classic terminal green (main accent)
  neonBright: '#39FF14', // Brighter neon for highlights/active
  neonDim: '#00CC00', // Dimmer green for secondary/disabled
  neonDark: '#008800', // For muted/secondary text
  neonHover: '#00FF55', // Hover state
  neonFocus: '#00FFAA', // Focus state
  neonDisabled: '#005500', // Disabled state
  success: '#00FF88', // Success/confirmation
  error: '#390000', // Error

  // Backgrounds
  background: 'rgb(0,16,0)', // Main background
  backgroundOverlay: 'rgba(0,16,0,0.95)', // Card/overlay background
  backgroundGradient: 'linear-gradient(180deg, #001000 0%, #002800 100%)', // For web/large screens
  backgroundHover: 'rgba(0,32,0,0.98)', // Card/button hover

  // Borders & outlines
  border: '#00FF00', // Default border
  borderFocus: '#00FFAA', // Focused border
  borderError: '#FF0033', // Error border

  // Text
  text: '#00FF00', // Default text
  textSecondary: '#00CC00', // Secondary text
  textDisabled: '#005500', // Disabled text
  textError: '#FF0033', // Error text

  // Misc
  overlay: 'rgba(0,0,0,0.7)', // Modal/overlay
};

const fonts = {
  mono: 'monospace',
  // Typography scale
  h1: { fontSize: 28, fontWeight: 'bold', lineHeight: 36 }, // Main page title
  h2: { fontSize: 22, fontWeight: 'bold', lineHeight: 30 }, // Section title
  h3: { fontSize: 18, fontWeight: 'bold', lineHeight: 24 }, // Card/row title
  body: { fontSize: 16, fontWeight: 'normal', lineHeight: 22 }, // Main body text
  caption: { fontSize: 12, fontWeight: 'normal', lineHeight: 16 }, // Small/secondary text
};

// Spacing scale (in px)
const spacing = {
  xs: 4,   // Extra small
  sm: 8,   // Small
  md: 12,  // Medium
  lg: 18,  // Large
  xl: 24,  // Extra large
  xxl: 32, // 2x extra large
};

const theme = {
  colors,
  fonts,
  spacing,
  borderRadius: 2,
  borderWidth: 1,
};

export default theme; 