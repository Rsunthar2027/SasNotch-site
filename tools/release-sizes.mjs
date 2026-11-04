// Keeps the storage sizes on the page in step with the latest GitHub release.
//
//   node tools/release-sizes.mjs     applies the sizes to public/index.html
//
// Numbers live between markers in the HTML:
//   <!-- size:download -->22 MB<!-- /size -->    SasNotch.dmg, from the GitHub API
//   <!-- size:installed -->85 MB<!-- /size -->   measured by hand, from data/sizes.json
//
// If the fetch fails, the numbers already committed stay as they are.

import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API_URL = "https://api.github.com/repos/Rsunthar2027/SasNotch/releases/latest";
const DOWNLOAD_ASSET = "SasNotch.dmg";
const INDEX_URL = new URL("../public/index.html", import.meta.url);
const MEASURED_URL = new URL("../data/sizes.json", import.meta.url);

// Same rounding as the page: decimal megabytes, nearest whole number.
const formatMB = (bytes) => `${Math.round(bytes / 1e6)} MB`;
const isSize = (bytes) => Number.isSafeInteger(bytes) && bytes > 0;

function readMeasured() {
  try {
    return JSON.parse(readFileSync(MEASURED_URL, "utf8"));
  } catch {
    return null;
  }
}

/** Returns {version, downloadBytes} for the latest release, or null on any failure. */
export async function latestSizes() {
  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "sasnotch-site-build" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const release = await response.json();
    const asset = release.assets?.find((a) => a.name === DOWNLOAD_ASSET);
    if (!release.tag_name || !isSize(asset?.size)) return null;
    return { version: release.tag_name.replace(/^v/, ""), downloadBytes: asset.size };
  } catch {
    return null;
  }
}

/** Rewrites only the text between size markers. Null sizes leave the HTML untouched. */
export function applySizes(html, sizes) {
  if (!sizes || !isSize(sizes.downloadBytes)) return html;

  const measured = readMeasured();
  const values = { download: sizes.downloadBytes };
  if (isSize(measured?.installedBytes)) values.installed = measured.installedBytes;

  if (measured?.version && sizes.version && measured.version !== sizes.version) {
    console.warn(
      `release-sizes: the installed size was measured on ${measured.version}, but the latest release is ` +
        `${sizes.version}. Re-measure it and update data/sizes.json.`,
    );
  }

  return html.replace(
    /(<!-- size:(download|installed) -->)[^<]*(<!-- \/size -->)/g,
    (match, open, name, close) => (values[name] ? `${open}${formatMB(values[name])}${close}` : match),
  );
}

async function main() {
  const sizes = await latestSizes();
  if (!sizes) {
    console.warn("release-sizes: could not read the latest release, so the committed sizes stay.");
    return;
  }
  const html = readFileSync(INDEX_URL, "utf8");
  const updated = applySizes(html, sizes);
  if (updated !== html) writeFileSync(INDEX_URL, updated);
  console.log(
    `release-sizes: ${sizes.version}, ${DOWNLOAD_ASSET} ${sizes.downloadBytes} bytes = ${formatMB(sizes.downloadBytes)}, ` +
      (updated === html ? "public/index.html already up to date." : "public/index.html updated."),
  );
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
