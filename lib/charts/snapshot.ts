/**
 * Snapshot (plan §3.2): a 1200×630 PNG drawn in the browser from what the
 * chart drew (its SVG, or its canvas), with the title, the UTC time, the
 * source, the series names when the chart's legend is HTML, and a watermark
 * naming the page it came from and the licence. Browser only.
 */
export const SNAPSHOT_W = 1200;
export const SNAPSHOT_H = 630;
const PAD = 36;
const TOP = 104;
const BOTTOM = 56;

export interface SnapshotText {
  title: string;
  source: string;
  /** The page, e.g. "hlcharts.com/perps/btc/". */
  watermark: string;
  legend?: { label: string; colour: string }[];
}

function svgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!copy.getAttribute('style')?.includes('font-family')) {
    copy.setAttribute(
      'style',
      `${copy.getAttribute('style') ?? ''};font-family:system-ui,sans-serif`
    );
  }
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('the chart could not be drawn as an image'));
    img.src = src;
  });
}

/** The chart's drawing inside `container`: its first SVG or canvas; null for an HTML-only chart. */
export function findDrawing(container: HTMLElement): SVGSVGElement | HTMLCanvasElement | null {
  return container.querySelector('svg') ?? container.querySelector('canvas');
}

export async function snapshotPng(
  drawing: SVGSVGElement | HTMLCanvasElement,
  text: SnapshotText,
  at: Date
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SNAPSHOT_W;
  canvas.height = SNAPSHOT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('this browser cannot draw a snapshot');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SNAPSHOT_W, SNAPSHOT_H);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(text.title, PAD, 52, SNAPSHOT_W - 2 * PAD);
  ctx.fillStyle = '#555';
  ctx.font = '18px system-ui, sans-serif';
  const when = `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC · Source: Hyperliquid ${text.source}`;
  ctx.fillText(when, PAD, 82, SNAPSHOT_W - 2 * PAD);

  const image = drawing instanceof HTMLCanvasElement ? drawing : await svgImage(drawing);
  const srcW =
    drawing instanceof HTMLCanvasElement ? drawing.width : drawing.clientWidth || image.width;
  const srcH =
    drawing instanceof HTMLCanvasElement ? drawing.height : drawing.clientHeight || image.height;
  const boxW = SNAPSHOT_W - 2 * PAD;
  const boxH = SNAPSHOT_H - TOP - BOTTOM;
  const scale = Math.min(boxW / srcW, boxH / srcH);
  ctx.drawImage(image, PAD + (boxW - srcW * scale) / 2, TOP, srcW * scale, srcH * scale);

  let x = PAD;
  ctx.font = '16px system-ui, sans-serif';
  for (const l of text.legend ?? []) {
    ctx.fillStyle = l.colour;
    ctx.fillRect(x, SNAPSHOT_H - 34, 14, 14);
    ctx.fillStyle = '#333';
    ctx.fillText(l.label, x + 20, SNAPSHOT_H - 22);
    x += 30 + ctx.measureText(l.label).width;
  }
  ctx.fillStyle = '#888';
  ctx.textAlign = 'right';
  ctx.fillText(`${text.watermark} · CC BY`, SNAPSHOT_W - PAD, SNAPSHOT_H - 22);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('the snapshot could not be encoded'))),
      'image/png'
    )
  );
}

/** Save a Blob under a file name (an object URL and a click on a temporary link). */
export function saveBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
