# Promo assets

Source for the social/README images.

- `linkedin-card.html` — 1200x1200 source. Edit this, not the PNG.
- `linkedin-card.png` — rendered at 2x (2400x2400), ready to upload.

## Re-render after editing the HTML

```bash
python -m http.server 8777 --directory promo
```

```bash
chrome --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=1200,1200 --screenshot=promo/linkedin-card.png http://127.0.0.1:8777/linkedin-card.html
```

The HTML pulls Inter and JetBrains Mono from Google Fonts, so render with
network access or the fallback system fonts will be used.
