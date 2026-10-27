# SasNotch website

The one-page site for [SasNotch](https://github.com/Rsunthar2027/SasNotch), live at https://sasnotch.vercel.app.

Plain HTML, CSS and JavaScript. No framework, no build step, no tracking, no cookies.

## Editing

Everything the site serves is in `public/`:

| File | What it holds |
|---|---|
| `index.html` | All the page text and the inline SVG art |
| `css/site.css` | Colours (the tokens at the top), type and layout |
| `js/main.js` | Mac detection, Copy link, the island demo, parallax |
| `img/` | Pine ridges, paper grain, the three help illustrations |
| `fonts/` | Caprasimo and Nunito, self-hosted |

To preview, run this from the repo folder and open http://localhost:4173:

```sh
python3 -m http.server 4173 --directory public
```

To see what iPhone, Windows or Android visitors get, add `?device=iphone` (or `ipad`, `android`, `windows`, `linux`, `chromebook`) to the URL. `?device=mac` forces the Mac view.

The three pictures in the "can't verify the app?" box, `public/img/help-1.svg` to `help-3.svg`, are placeholders. Swap in real screenshots whenever you like. Keep the 320×200 shape, or change the `width` and `height` on their `<img>` tags.

The share image (`og.png`) and the PNG icons come from `tools/og.html` and `tools/icons.html`. After changing either, run `./tools/make-images.sh` (it needs Google Chrome).

The site's address appears in `index.html` (canonical and social tags), `robots.txt`, `sitemap.xml` and `js/main.js`. Update all four if the domain changes.

## Deploying

Vercel watches this repo. Every push to `main` goes live in about a minute. `vercel.json` serves `public/` as a static site and sets the security and cache headers.

## License

GPL-3.0-or-later, the same as SasNotch, whose sasquatch artwork the site reuses. The fonts are under the SIL Open Font License; their license files are in `public/fonts`.
