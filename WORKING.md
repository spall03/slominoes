# Working

## Current Task
Deploy Slominoes to GitHub Pages with keyboard controls for desktop play.

## Progress
- [x] Installed web deps: react-native-web, react-dom, @expo/metro-runtime
- [x] Updated app.json with metro bundler, single output, baseUrl /slominoes
- [x] Added build:web script to package.json
- [x] Created public/.nojekyll
- [x] Added keyboard controls (arrow keys, R, Enter/Space, Escape) in GestureGrid — web only
- [x] Added Confirm/Cancel buttons below grid for discoverability
- [x] Created .github/workflows/deploy.yml for GitHub Pages

## Next Steps
- Test locally with `npx expo start --web`
- Push to GitHub and enable Pages source = "GitHub Actions" in repo settings
- Verify at https://spall03.github.io/slominoes/

## Recent Decisions
- Keyboard controls only active on web (Platform.OS check)
- Confirm/Cancel buttons visible on all platforms (helpful for both web click and mobile)
- Used `document.addEventListener` directly since it's web-only code path

## Blockers/Notes
- expo-haptics has web shim (no-ops on desktop)
- useNativeDriver: true falls back to JS animation on web (console warning only)
