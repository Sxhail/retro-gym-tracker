# Icon Guidelines for Retro Gym Tracker

## Icon Requirements

### iOS App Icon (`icon.png`)
- **Size**: 1024x1024 pixels (minimum)
- **Format**: PNG with no transparency
- **Design**: Should fill the entire square - iOS will automatically round the corners
- **Content**: Avoid putting important content near the edges as iOS may crop them
- **Path**: `./app/assets/icon.png`

### Android Adaptive Icon (`adaptive-icon.png`)
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency allowed
- **Design**: Should be the foreground layer of your icon
- **Safe Area**: Keep important content within the center 66% of the image
- **Background**: Set in app.json (currently black #000000)
- **Path**: `./app/assets/adaptive-icon.png`

### Web Favicon (`favicon.png`)
- **Size**: 192x192 pixels or larger
- **Format**: PNG
- **Purpose**: Used for web app and PWA
- **Path**: `./app/assets/favicon.png`

## Current Configuration

The app is configured with:
- Global icon: `./app/assets/icon.png`
- iOS specific icon: `./app/assets/icon.png`
- Android adaptive icon: `./app/assets/adaptive-icon.png`
- Web favicon: `./app/assets/favicon.png`

## Testing Your Icons

1. **Development Build**: Run `npx expo start` and test on iOS device
2. **Preview Build**: Use `eas build --profile preview --platform ios`
3. **Production Build**: Use `eas build --profile production --platform ios`

## Troubleshooting

If icons don't appear correctly:
1. Clear Expo cache: `npx expo start --clear`
2. Rebuild the app completely
3. Check icon file sizes and formats
4. Ensure icons are exactly 1024x1024 pixels
5. Make sure PNG files are not corrupted

## Icon Design Tips

- Use high contrast colors that work well on both light and dark backgrounds
- Keep design simple and recognizable at small sizes
- Test the icon at various sizes (29px, 40px, 60px, 76px, 83.5px, 1024px)
- Avoid text unless it's very large and readable
- Use your brand colors consistently
