# EcoAnalysis

A small tool that estimates plant stress from a leaf photo. It measures how asymmetric the leaf is and how green it is, then combines both into a stress index. Everything runs in your browser and photos are never uploaded.

Live site: https://eugggeneee.github.io/eco-analysis/

## Run it

Open `index.html` in a browser. There is nothing to install or build.

## Try it

Choose a tree species, then either upload a leaf photo or press one of the sample leaf buttons. Lay a real leaf flat on white paper for the best result.

After the analysis you can place the result on the demo map. The map is a drawn illustration of an imaginary district with sample data, so it needs no map service. Your own samples stay in your browser, and you can export them as a JSON file and import them again.

## How the numbers are made

1. The page finds the leaf by colour and keeps the largest shape.
2. It draws an axis from the leaf base to its tip.
3. It measures the distance from the axis to the edge on each side at five points and averages the difference. That is the asymmetry index.
4. It averages `(G - R) / (G + R)` over the leaf pixels, after scaling the colours so the white background reads as white. That is the chlorophyll index.
5. It combines the two into a stress index between 0 and 1.

The classic method measures veins by hand, while this demo measures the outline, so the values are rougher. Use it to compare leaves, not as a certified measurement.

## Files

- `index.html` holds the page structure.
- `style.css` holds the styles, including the dark theme.
- `script.js` holds the analysis, the map and the charts.

## Design

The interface uses the Hedgerow look: deep leaf-green paper, cream ink, Prata headings over Manrope, one chartreuse accent, square flat surfaces with pill controls. A light theme is built in, and the Method section inverts colours on purpose. The hero leaf is measured by a slow scan line, which stops under reduced motion. Fonts load from Google Fonts and fall back to system serif and sans.
