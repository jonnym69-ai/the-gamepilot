# Theme Builder Roadmap — Pending Features

These items were approved by the user but not yet implemented. Add them when ready.

## Done
- **Text Color** — picker to change primary text color so light backgrounds remain readable.

## Pending

## 1. Shadow Depth
- Slider to control card/button box-shadow spread/intensity (separate from neon glow).
- CSS variable: `--card-shadow-depth`.

## 2. Border Thickness
- Slider or segmented control for card border width.
- CSS variable: `--card-border-width`.

## 3. Particle Color
- Color picker for floating particles (currently hardcoded to white).
- Update `ThemeBuilder.css` `.preview-effect-particles::before` to use var.

## 4. Particle Size
- Slider to change particle dot size.
- CSS variable: `--particle-size` (affects `background-size` ratio).

## 5. Texture Overlays
- Toggle/select for subtle background textures:
  - Noise grain
  - Dot grid
  - Fine lines / scanlines
- CSS pseudo-element overlay with `opacity` control.

## 6. Seasonal Presets
- One-click preset buttons for holiday color combos:
  - Halloween (orange/purple/black)
  - Christmas (red/green/gold)
  - Valentine's (pink/red/white)
  - Summer (yellow/orange/blue)
  - Winter (ice blue/white/silver)
- Pre-baked gradient + accent + optional particle color.

## 7. Scrollbar Color
- Toggle to sync scrollbar thumb color with accent.
- Override `::-webkit-scrollbar-thumb` background when active.
