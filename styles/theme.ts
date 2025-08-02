const colors = {
  // Greens - Darker, Spotify-inspired
  neon: '#16913A', // Main accent (darker than Spotify)
  neonBright: '#1DB954', // Spotify green for highlights/active
  neonDim: '#11782E', // Even darker green for secondary/disabled
  neonDark: '#0D5C22', // For muted/secondary text
  neonHover: '#1ED760', // Hover state (Spotify hover)
  neonFocus: '#21E065', // Focus state
  neonDisabled: '#0A3C16', // Disabled state
  success: '#21E065', // Success/confirmation
  error: '#FF0033', // Error

  // Backgrounds
  background: '#000000', // Pure black background
  backgroundOverlay: 'rgba(0,0,0,0.95)', // Card/overlay background
  backgroundGradient: 'linear-gradient(180deg, #000000 0%, #001100 100%)', // For web/large screens
  backgroundHover: 'rgba(0,32,0,0.98)', // Card/button hover

  // Borders & outlines
  border: '#11782E', // Default border (darker green)
  borderFocus: '#16913A', // Focused border (main accent)
  borderError: '#FF0033', // Error border

  // Text
  text: '#16913A', // Default text (main accent)
  textSecondary: '#11782E', // Secondary text (darker green)
  textDisabled: '#0A3C16', // Disabled text
  textError: '#FF0033', // Error text

  // Misc
  overlay: 'rgba(0,0,0,0.8)', // Modal/overlay
};

const fonts = {
  mono: 'JetBrains Mono, monospace', // Modern monospace font
  // Retro/Cyberpunk font families (Google Fonts loaded in _layout.tsx)
  heading: 'Orbitron_700Bold', // For headers/titles
  body: 'ShareTechMono_400Regular', // For main body text, forms, workout data
  code: 'VT323_400Regular', // For terminal/badge/timer text
  display: 'PressStart2P_400Regular', // For large display/branding
  // Typography scale
  h1: { fontSize: 32, fontWeight: 'bold', lineHeight: 40 }, // Main page title
  h2: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 }, // Section title
  h3: { fontSize: 20, fontWeight: 'bold', lineHeight: 28 }, // Card/row title
  bodyText: { fontSize: 16, fontWeight: 'normal', lineHeight: 24 }, // Main body text
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