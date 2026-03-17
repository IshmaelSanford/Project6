# CSS Clock Layout

A single-page interactive clock with:
- timezone selector on a scrolling world map
- theme mode toggle (`auto`, `light`, `dark`)
- tab-title time format toggle (`AM/PM`, `24H`)
- switchable clock face styles

## Project Structure

```text
.
├── index.html                # Markup only
├── assets
│   ├── css
│   │   └── style.css         # All styles, grouped by section
│   ├── js
│   │   └── app.js            # App logic, grouped by feature
│   ├── img
│   │   └── BlankMap-World_grey.svg
│   ├── audio
│   │   └── tick.mp3
│   └── unused                # Legacy/unused assets kept for reference
│       ├── BlankMap-World_gray.svg
│       ├── clockimg.png
│       └── hand.png
└── README.md
```

## Run Locally

Open `index.html` in a browser.

## Deployment

This project is ready for GitHub Pages from the repository root (`main` branch, `/` folder).
