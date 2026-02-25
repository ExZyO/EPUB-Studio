# EPUB Studio v4

A powerful, offline-capable Progressive Web App for splitting and merging EPUB ebooks — entirely in your browser.

## ✨ Features

### Split EPUB
- **Extract Range** — Download a specific chapter range (e.g. chapters 10–50)
- **Split by Chapter Count** — Automatically chunk a book into parts with N chapters each
- **Split by File Size** — Target a specific MB per chunk (e.g. 25MB for Discord uploads)
- **Custom Chapter Selection** — Check/uncheck individual chapters to export
- **Chapter Renaming** — Double-click any chapter name to rename it before export
- **Batch Rename** — Apply a pattern like `Chapter {n}` to all chapters at once
- **Chapter Search** — Filter through thousands of chapters instantly
- **Chapter Preview** — Click a chapter name to view its text content in a modal
- **Word Count + File Size** — See word count and KB size next to each chapter
- **Estimated Output Size** — See the projected file size before exporting
- **Custom Cover** — Upload a replacement cover image for exported splits
- **Keep Only Text** — Strip images, fonts, and CSS for ultra-lightweight output
- **CSS Theme Injection** — Apply Dark, Sepia, or Large Text reading themes to exports
- **Export Presets** — Save and load named setting presets (e.g. "Discord 25MB")
- **Export as Plain ZIP** — Download chapters as a `.zip` of standalone HTML files
- **Share Button** — Share exports via the Web Share API (mobile)
- **Post-Export Validation** — Automatic health check on the exported EPUB

### Merge EPUBs
- **Smart TOC Merging** — Combines NCX and Nav tables of contents correctly
- **Drag-and-Drop Reordering** — Reorder books before merging
- **Custom Book Labels** — Name each sub-book (e.g. "Volume 1", "Part 2")
- **Advanced Metadata Editor** — Set Author, Publisher, and Language
- **Custom Cover** — Upload a cover image for the merged output
- **Compression Toggle** — Choose between Fast (STORE, default) or Small (DEFLATE)
- **Duplicate Detection** — Warns when adding the same file twice

### General
- 🌙 **Dark Mode** with automatic OS theme syncing
- ⌨️ **Keyboard Shortcuts** — `Ctrl+1/2` tabs, `Ctrl+A/D` select, `Ctrl+S` export, `Ctrl+Z/Y` undo/redo, `?` help
- 📦 **Export History** — Track all your recent splits and merges
- 📊 **Metadata Viewer** — See book metadata (author, publisher, language, description) on load
- ⚠️ **Memory Pressure Warning** — Alerts for files >500MB
- ↩️ **Undo/Redo** — Ctrl+Z / Ctrl+Y for chapter selection changes
- 🧠 **Smart Front Matter Detection** — Intelligent identification of front matter vs. story chapters
- 📱 **PWA / Offline Support** — Install as a standalone app, works without internet
- 🔒 **100% Client-Side** — No uploads, no servers. Your files never leave your device.

## 🚀 Getting Started

1. Visit the hosted version or open `index.html` directly
2. Choose **Split** or **Merge** from the tabs
3. Upload your `.epub` file(s)
4. Configure your options and export!

## 🛠 Tech Stack

- Vanilla HTML / CSS / JavaScript
- [JSZip](https://stuk.github.io/jszip/) for in-browser ZIP manipulation
- [Tailwind CSS](https://tailwindcss.com/) for styling
- Web Workers for off-thread compression
- Service Worker for offline PWA support

## License

MIT