# SasNotch website

The one-page site for [SasNotch](https://github.com/Rsunthar2027/SasNotch), live at https://sasnotch.vercel.app.

Plain HTML, CSS and JavaScript. No framework, no dependencies, no cookies. One small script generates the update notes. Visits are counted with [Vercel Web Analytics](https://vercel.com/docs/analytics), which is cookie-free and doesn't store personal data. The numbers are in the Vercel dashboard under the project's Analytics tab.

## Editing

Everything the site serves is in `public/`:

| File | What it holds |
|---|---|
| `index.html` | The page text and the inline SVG art |
| `css/site.css` | Colours (the tokens at the top), type and layout |
| `js/main.js` | Mac detection, Copy link, menu, video chapters and tour modal, the island demo, parallax |
| `img/` | Pine ridges, paper grain, the three help illustrations |
| `videos/` | The tour, install and getting-around videos with their posters |
| `fonts/` | Caprasimo and Nunito, self-hosted |
| `updates/index.html`, `updates.xml` | The update notes page and Atom feed. Both are generated; see below |

To preview, run this from the repo folder and open http://localhost:4173:

```sh
python3 -m http.server 4173 --directory public
```

To see what iPhone, Windows or Android visitors get, add `?device=iphone` (or `ipad`, `android`, `windows`, `linux`, `chromebook`) to the URL. `?device=mac` forces the Mac view.

The three pictures in the "can't verify the app?" box, `public/img/help-1.svg` to `help-3.svg`, are placeholders. Swap in real screenshots whenever you like. Keep the 320×200 shape, or change the `width` and `height` on their `<img>` tags.

The three videos live in `public/videos/` next to their poster images. To replace one, keep the file name and re-encode it with the helper, which needs only macOS:

```sh
swift tools/videos.swift encode ~/Downloads/new-install.mp4 public/videos/install.mp4 9.5
swift tools/videos.swift poster public/videos/install.mp4 20 public/videos/install.jpg
```

The last number of `encode` is the target size in MB. Chapter buttons are plain `<button class="chapter" data-video="install" data-t="17">` tags in `index.html`, and any link written as `#install-0:17` (or `#promo-…`, `#learn-…`) jumps to that moment and plays. If a video's length or content changes, update its "In this video" text and the `VideoObject` entries at the top of `index.html` too.

The share image (`og.png`) and the PNG icons come from `tools/og.html` and `tools/icons.html`. After changing either, run `./tools/make-images.sh` (it needs Google Chrome).

The site's address appears in `index.html` (canonical and social tags), `robots.txt`, `sitemap.xml`, `js/main.js` and `tools/build-site.mjs`. Update all five if the domain changes.

## Update notes

Edit `data/releases.json`, newest first, then run `node tools/build-site.mjs` and commit the result. It writes `public/updates/index.html`, `public/updates.xml` and the "Latest update" card between the markers in `public/index.html`, and it copies the header and footer on `/updates` from `index.html`. Vercel runs the same command on every deploy.

The script also reads the published GitHub releases. A release missing from the JSON gets added from its `### Added/Changed/Fixed/Removed` notes, and an entry with `"date": null` takes its date from GitHub once it's out. These additions aren't saved to the JSON, so add new versions there too: if GitHub can't be reached, the script builds from the JSON alone and still exits 0.

## Deploying

Pushes to `main` go live once the Vercel project is connected to this repo (Vercel → sasnotch → Settings → Git). Until then, deploy by creating a production deployment of `main` from Vercel. `vercel.json` serves `public/` as a static site and sets the security and cache headers.

## License

GPL-3.0-or-later, the same as SasNotch, whose sasquatch artwork the site reuses. The fonts are under the SIL Open Font License; their license files are in `public/fonts`.
