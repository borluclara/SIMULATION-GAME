# Styles Documentation

## Tailwind Configuration
This project uses Tailwind CSS for styling. The configuration includes custom colors and themes specific to our blast simulation game.

### Color Scheme
- Primary: #22c55e (Vibrant green)
- Primary Dark: #16a34a
- Background Light: #1a1f1a
- Background Dark: #0f110f
- Accent Green: #4ade80
- Success: #22c55e
- Lime: #84cc16

### Important Notes for Team
1. All custom colors are defined in `tailwind.config.js`
2. Global styles are in `src/index.css`
3. Component-specific styles use Tailwind utility classes

### Required Dependencies
```json
{
  "tailwindcss": "^3.3.3",
  "autoprefixer": "^10.4.16",
  "postcss": "^8.4.31"
}
```