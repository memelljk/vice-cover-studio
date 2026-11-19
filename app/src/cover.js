// Vice Cover Studio — cover engine.
//
// Turns any photo into poster-style GTA cover art, entirely on canvas:
// posterize + gradient-map colour grade, comic ink outlines (Sobel),
// halftone dots, vignette and grain. Then lays the treated photos out
// in multi-panel poster layouts and letters the caption in Anton.
//
// No network, no outside assets: every pixel here is computed locally.

export const GRADES = {
  sunset: {
    name: 'Sunset',
    dark: '#160a24',
    accent: '#ff5e3a',
    accent2: '#ff2fb3',
    stops: [
      [0.0, [22, 8, 38]],
      [0.25, [96, 32, 110]],
      [0.5, [214, 62, 92]],
      [0.75, [255, 120, 58]],
      [1.0, [255, 233, 168]],
    ],
  },
  neon: {
    name: 'Neon Nights',
    dark: '#020e18',
    accent: '#00e5ff',
    accent2: '#ff2fb3',
    stops: [
      [0.0, [2, 16, 28]],
      [0.25, [10, 58, 92]],
      [0.5, [0, 150, 178]],
      [0.75, [255, 47, 179]],
      [1.0, [255, 243, 176]],
    ],
  },
  pink: {
    name: 'Vice Pink',
    dark: '#1c041c',
    accent: '#ff4da6',
    accent2: '#b06bff',
    stops: [
      [0.0, [32, 5, 32]],
      [0.25, [122, 30, 110]],
      [0.5, [255, 77, 166]],
      [0.75, [255, 138, 210]],
      [1.0, [255, 227, 242]],
    ],
  },
  noir: {
    name: 'Palm Noir',
    dark: '#04100d',
    accent: '#d4af37',
    accent2: '#2dd4bf',
    stops: [
      [0.0, [4, 16, 13]],
      [0.25, [14, 58, 52]],
      [0.5, [56, 110, 88]],
      [0.75, [212, 175, 55]],
      [1.0, [245, 230, 184]],
    ],
  },
};

export const LAYOUTS = {
  grid: { name: 'Sunset Grid', panels: 5, blurb: '1 hero + 4 panels' },
  strip: { name: 'Neon Strip', panels: 5, blurb: '5 vertical strips' },
  duo: { name: 'Vice Duo', panels: 2, blurb: '2 big panels' },
};

export const EXPORT_SIZES = [
  { id: '1920x1080', label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
  { id: '1080x1080', label: 'Square 1080 × 1080', w: 1080, h: 1080 },
];

// Deterministic pseudo-random generator so the grain is stable per photo.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gradeColorAt(stops, t) {
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [p0, c0] = stops[i - 1];
      const [p1, c1] = stops[i];
      const f = p1 === p0 ? 0 : (t - p0) / (p1 - p0);
      return [
        c0[0] + (c1[0] - c0[0]) * f,
        c0[1] + (c1[1] - c0[1]) * f,
        c0[2] + (c1[2] - c0[2]) * f,
      ];
    }
  }
  return stops[stops.length - 1][1];
}

const POSTER_LEVELS = 6;

// Treat one photo source (canvas or image) into poster art.
// Returns a fresh canvas, at most 1024 px on its long side.
export function treatPhoto(source, gradeId, opts, seed) {
  const grade = GRADES[gradeId] || GRADES.sunset;
  const sw = source.width;
  const sh = source.height;
  const scale = Math.min(1, 1024 / Math.max(sw, sh));
  const w = Math.max(2, Math.round(sw * scale));
  const h = Math.max(2, Math.round(sh * scale));

  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.drawImage(source, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;

  // Luminance, posterized to a few flat steps (the comic-poster look).
  const lum = new Float32Array(n);
  const lumQ = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    lum[i] = l;
    lumQ[i] = Math.round(l * (POSTER_LEVELS - 1)) / (POSTER_LEVELS - 1);
  }

  // Sobel edge strength on the posterized luminance: dark ink lines.
  const edge = new Float32Array(n);
  if (opts.outline) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const gx =
          -lumQ[i - w - 1] - 2 * lumQ[i - 1] - lumQ[i + w - 1] +
          lumQ[i - w + 1] + 2 * lumQ[i + 1] + lumQ[i + w + 1];
        const gy =
          -lumQ[i - w - 1] - 2 * lumQ[i - w] - lumQ[i - w + 1] +
          lumQ[i + w - 1] + 2 * lumQ[i + w] + lumQ[i + w + 1];
        edge[i] = Math.min(1, Math.sqrt(gx * gx + gy * gy) * 0.9);
      }
    }
  }

  // Gradient-map the posterized luminance, keeping a third of the
  // photo's own colour so faces and skies stay readable.
  for (let i = 0; i < n; i++) {
    const [mr, mg, mb] = gradeColorAt(grade.stops, lumQ[i]);
    let r = mr * 0.72 + d[i * 4] * 0.28;
    let g = mg * 0.72 + d[i * 4 + 1] * 0.28;
    let b = mb * 0.72 + d[i * 4 + 2] * 0.28;
    if (opts.outline && edge[i] > 0.22) {
      const ink = 1 - Math.min(0.62, (edge[i] - 0.22) * 1.6);
      r *= ink;
      g *= ink;
      b *= ink;
    }
    d[i * 4] = r;
    d[i * 4 + 1] = g;
    d[i * 4 + 2] = b;
  }
  ctx.putImageData(img, 0, 0);

  // Halftone dots in the shadows: print-poster texture.
  if (opts.halftone) {
    const dot = document.createElement('canvas');
    dot.width = w;
    dot.height = h;
    const dctx = dot.getContext('2d');
    const step = 7;
    dctx.fillStyle = 'rgba(12, 6, 24, 0.55)';
    for (let y = step / 2; y < h; y += step) {
      for (let x = step / 2; x < w; x += step) {
        const l = lumQ[Math.round(y) * w + Math.round(x)];
        if (l < 0.55) {
          const r = (0.55 - l) * step * 0.42;
          if (r > 0.4) {
            dctx.beginPath();
            dctx.arc(x, y, r, 0, Math.PI * 2);
            dctx.fill();
          }
        }
      }
    }
    ctx.drawImage(dot, 0, 0);
  }

  // Vignette: darken the corners so the panel reads as one poster.
  const vg = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.36,
    w / 2, h / 2, Math.max(w, h) * 0.72,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,4,16,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // Fine grain, seeded so a photo always grains the same way.
  if (opts.grain) {
    const rand = mulberry32(seed || 12345);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 2600; i++) {
      ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let i = 0; i < 2600; i++) {
      ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
    }
  }
  return cv;
}

// Panel rectangles for a layout, in cover pixels.
// Returns { panels: [{x,y,w,h}], band: {x,y,w,h}, accentY }.
export function coverGeometry(W, H, layoutId, captionPos) {
  const bandH = Math.round(H * 0.17);
  const band = captionPos === 'top'
    ? { x: 0, y: 0, w: W, h: bandH }
    : { x: 0, y: H - bandH, w: W, h: bandH };
  const panelTop = captionPos === 'top' ? bandH : 0;
  const panelH = H - bandH;
  const gap = Math.max(5, Math.round(W * 0.009));
  const pad = gap;
  const ax = pad;
  const ay = panelTop + pad;
  const aw = W - pad * 2;
  const ah = panelH - pad * 2;
  const panels = [];

  if (layoutId === 'grid') {
    // 1 hero left + 2x2 small panels right.
    const heroW = Math.round(aw * 0.58);
    panels.push({ x: ax, y: ay, w: heroW, h: ah });
    const rx = ax + heroW + gap;
    const rw = ax + aw - rx;
    const cw = Math.round((rw - gap) / 2);
    const ch = Math.round((ah - gap) / 2);
    panels.push({ x: rx, y: ay, w: cw, h: ch });
    panels.push({ x: rx + cw + gap, y: ay, w: rw - cw - gap, h: ch });
    panels.push({ x: rx, y: ay + ch + gap, w: cw, h: ah - ch - gap });
    panels.push({ x: rx + cw + gap, y: ay + ch + gap, w: rw - cw - gap, h: ah - ch - gap });
  } else if (layoutId === 'strip') {
    const cw = Math.round((aw - gap * 4) / 5);
    for (let i = 0; i < 5; i++) {
      const x = ax + i * (cw + gap);
      const w = i === 4 ? ax + aw - x : cw;
      panels.push({ x, y: ay, w, h: ah });
    }
  } else {
    // duo: two big panels side by side.
    const cw = Math.round((aw - gap) / 2);
    panels.push({ x: ax, y: ay, w: cw, h: ah });
    panels.push({ x: ax + cw + gap, y: ay, w: aw - cw - gap, h: ah });
  }
  const accentY = captionPos === 'top' ? bandH : H - bandH;
  return { panels, band, accentY, gap };
}

function drawPanelPhoto(ctx, treated, rect, panel) {
  const iw = treated.width;
  const ih = treated.height;
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(treated, dx, dy, dw, dh);
  ctx.restore();
  // Crisp white frame + soft drop shadow, the poster-panel look.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, rect.w * 0.004);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// Letter the caption in Anton: white fill, dark outline, accent shadow.
export function drawCaption(ctx, W, H, band, grade, title, subtitle, captionPos) {
  const g = GRADES[grade] || GRADES.sunset;
  const size = Math.round(band.h * 0.60);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch (e) { /* older canvas */ }
  const cx = W / 2;
  const cy = band.y + band.h * 0.44;
  const text = (title || 'NEON VICE').toUpperCase();
  // Accent echo behind the letters, offset down-right.
  ctx.fillStyle = g.accent2;
  ctx.fillText(text, cx + size * 0.045, cy + size * 0.05);
  ctx.fillStyle = g.accent;
  ctx.fillText(text, cx + size * 0.02, cy + size * 0.025);
  // Dark outline, then the white face.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,4,18,0.95)';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeText(text, cx, cy);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, cx, cy);
  // Sub-caption, small, letterspaced, in the grade accent.
  if (subtitle && subtitle.trim()) {
    const subSize = Math.max(10, Math.round(band.h * 0.15));
    ctx.font = `${subSize}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(subSize * 0.32)}px`; } catch (e) { /* older canvas */ }
    ctx.fillStyle = g.accent;
    ctx.fillText(subtitle.toUpperCase(), cx, band.y + band.h * 0.86);
  }
  ctx.restore();
}

// Render the whole cover onto ctx at W x H.
// treatedFor: function(photoIndex) => treated canvas for that photo.
// state: { layout, grade, title, subtitle, captionPos, outline, halftone, grain, panels }
export function renderCover(ctx, W, H, state, treatedFor) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  // Deep poster background: dark grade colour with a diagonal glow.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, grade.dark);
  bg.addColorStop(0.55, '#0b0714');
  bg.addColorStop(1, grade.dark);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const geo = coverGeometry(W, H, state.layout, state.captionPos);
  const panels = state.panels || [];
  geo.panels.forEach((rect, i) => {
    const p = panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const treated = treatedFor(p.photo);
    if (treated) {
      drawPanelPhoto(ctx, treated, rect, p);
    } else {
      ctx.fillStyle = '#241a33';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
  });

  // Accent rule between the caption band and the panels.
  ctx.fillStyle = grade.accent;
  const ruleH = Math.max(3, Math.round(H * 0.006));
  if (state.captionPos === 'top') {
    ctx.fillRect(0, geo.accentY - ruleH, W, ruleH);
  } else {
    ctx.fillRect(0, geo.accentY, W, ruleH);
  }

  drawCaption(ctx, W, H, geo.band, state.grade, state.title, state.subtitle, state.captionPos);
  return geo;
}
