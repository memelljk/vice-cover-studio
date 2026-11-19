// Vice Cover Studio — procedural demo photos.
//
// Three sample pictures drawn by the app itself on load, so the cover is
// alive before the user uploads anything. Flat vector style, no real
// people, no outside images: a portrait, a beach sunset and a neon street.

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function palm(ctx, x, y, s, color) {
  // One palm silhouette: curved trunk + five fronds.
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(14, -70, 34, -118);
  ctx.stroke();
  ctx.lineWidth = 9;
  const top = [34, -118];
  const fronds = [
    [[-105, -30], [-70, -88]],
    [[-82, -98], [-24, -118]],
    [[-10, -124], [44, -158]],
    [[58, -108], [112, -122]],
    [[80, -52], [126, -44]],
    [[-40, -70], [-96, -110]],
  ];
  for (const [a, b] of fronds) {
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.quadraticCurveTo((a[0] + b[0]) / 2 + 16, (a[1] + b[1]) / 2 - 22, b[0], b[1]);
    ctx.stroke();
  }
  ctx.restore();
}

function sunDisc(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, '#fff3c4');
  g.addColorStop(0.6, color);
  g.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// 1 — Portrait: flat-style person with big sunglasses, open shirt and
// gold chain, against a sunset sky with palms. Drawn, not photographed.
export function makePortraitDemo() {
  const W = 900;
  const H = 1200;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.45, '#c94b7c');
  sky.addColorStop(0.75, '#ff7e3d');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  sunDisc(ctx, W * 0.68, H * 0.30, 130, '#ff9a3d');
  // Distant skyline.
  ctx.fillStyle = 'rgba(43,16,85,0.55)';
  const blocks = [[0, 640, 120, 260], [120, 700, 90, 200], [700, 660, 110, 240], [810, 720, 90, 180]];
  for (const [x, y, w, h] of blocks) ctx.fillRect(x, y, w, h);
  palm(ctx, 60, H * 0.62, 1.1, '#1c0b2e');
  palm(ctx, W - 40, H * 0.58, 0.9, '#220d33');

  // Sea band.
  ctx.fillStyle = '#7a2d6e';
  ctx.fillRect(0, H * 0.78, W, H * 0.22);
  ctx.fillStyle = 'rgba(255,183,71,0.5)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(W * 0.15 + i * 130, H * (0.80 + i * 0.035), 90 - i * 8, 5);
  }

  // The person: flat shapes, sunglasses, no photographic likeness.
  // Kept compact and low in the frame so the head survives tight crops.
  const cx = W / 2;
  // Shoulders / open shirt.
  ctx.fillStyle = '#f5efe4';
  ctx.beginPath();
  ctx.moveTo(cx - 260, H);
  ctx.quadraticCurveTo(cx - 250, H * 0.80, cx - 120, H * 0.74);
  ctx.lineTo(cx + 120, H * 0.74);
  ctx.quadraticCurveTo(cx + 250, H * 0.80, cx + 260, H);
  ctx.closePath();
  ctx.fill();
  // Dark tee under the shirt.
  ctx.fillStyle = '#1d1d26';
  ctx.beginPath();
  ctx.moveTo(cx - 95, H * 0.74);
  ctx.lineTo(cx + 95, H * 0.74);
  ctx.lineTo(cx + 70, H);
  ctx.lineTo(cx - 70, H);
  ctx.closePath();
  ctx.fill();
  // Gold chain.
  ctx.strokeStyle = '#e8b64c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, H * 0.74, 78, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  // Neck + head.
  ctx.fillStyle = '#c98a5e';
  ctx.fillRect(cx - 42, H * 0.62, 84, 110);
  ctx.beginPath();
  ctx.ellipse(cx, H * 0.50, 108, 126, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair: dark swept shape.
  ctx.fillStyle = '#17121c';
  ctx.beginPath();
  ctx.ellipse(cx, H * 0.42, 112, 68, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 108, H * 0.43);
  ctx.quadraticCurveTo(cx - 55, H * 0.335, cx + 36, H * 0.365);
  ctx.quadraticCurveTo(cx + 108, H * 0.39, cx + 108, H * 0.43);
  ctx.lineTo(cx + 88, H * 0.43);
  ctx.quadraticCurveTo(cx + 36, H * 0.39, cx - 88, H * 0.43);
  ctx.closePath();
  ctx.fill();
  // Big sunglasses.
  ctx.fillStyle = '#0d0d12';
  roundRect(ctx, cx - 96, H * 0.47, 86, 54, 20);
  ctx.fill();
  roundRect(ctx, cx + 10, H * 0.47, 86, 54, 20);
  ctx.fill();
  ctx.fillRect(cx - 12, H * 0.485, 24, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(cx - 84, H * 0.48, 24, 7);
  ctx.fillRect(cx + 22, H * 0.48, 24, 7);
  // Smile.
  ctx.strokeStyle = '#7a3b22';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, H * 0.59, 32, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 2 — Beach sunset: sun low over the sea, palms, sand, city behind.
export function makeBeachDemo() {
  const W = 1200;
  const H = 900;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  sky.addColorStop(0, '#1d0b3d');
  sky.addColorStop(0.5, '#a83a7d');
  sky.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.62);

  sunDisc(ctx, W * 0.5, H * 0.52, 95, '#ff9a3d');

  // Sea.
  const sea = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.82);
  sea.addColorStop(0, '#c94b7c');
  sea.addColorStop(1, '#3d1a5e');
  ctx.fillStyle = sea;
  ctx.fillRect(0, H * 0.62, W, H * 0.20);
  ctx.fillStyle = 'rgba(255,214,106,0.6)';
  for (let i = 0; i < 8; i++) {
    const y = H * (0.64 + i * 0.022);
    const wdt = 420 - i * 34;
    ctx.fillRect(W / 2 - wdt / 2, y, wdt, 5);
  }

  // Sand + palms.
  ctx.fillStyle = '#e8b06a';
  ctx.fillRect(0, H * 0.82, W, H * 0.18);
  ctx.fillStyle = 'rgba(122,45,110,0.35)';
  ctx.fillRect(0, H * 0.82, W, 8);
  palm(ctx, 130, H * 0.86, 1.35, '#2a1240');
  palm(ctx, W - 120, H * 0.88, 1.15, '#2a1240');
  // Beach umbrella.
  ctx.fillStyle = '#ff4da6';
  ctx.beginPath();
  ctx.arc(W * 0.66, H * 0.86, 64, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(W * 0.66, H * 0.86 - 64);
  ctx.lineTo(W * 0.66 - 32, H * 0.86);
  ctx.lineTo(W * 0.66 + 32, H * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a2a3a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(W * 0.66, H * 0.86);
  ctx.lineTo(W * 0.66, H * 0.98);
  ctx.stroke();
  return c;
}

// 3 — Neon street: night skyline, glowing signs, wet pavement.
export function makeNeonDemo() {
  const W = 1200;
  const H = 900;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#0a0618';
  ctx.fillRect(0, 0, W, H);
  // Stars.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const stars = [[80, 70], [240, 40], [420, 90], [640, 50], [820, 80], [1010, 46], [1120, 120], [330, 150], [760, 140]];
  for (const [x, y] of stars) ctx.fillRect(x, y, 3, 3);

  // Buildings with lit windows.
  const buildings = [
    [0, 300, 190, 420, '#17102e'], [190, 220, 170, 500, '#1d1238'],
    [360, 330, 150, 390, '#140d28'], [510, 180, 200, 540, '#221544'],
    [710, 290, 160, 430, '#17102e'], [870, 210, 180, 510, '#1d1238'],
    [1050, 320, 150, 400, '#140d28'],
  ];
  for (const [x, y, w, h, col] of buildings) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    for (let wy = y + 26; wy < y + h - 20; wy += 44) {
      for (let wx = x + 18; wx < x + w - 18; wx += 42) {
        if (((wx * 7 + wy * 13) % 5) < 3) {
          ctx.fillStyle = ((wx + wy) % 3 === 0) ? '#ffd76a' : 'rgba(0,229,255,0.75)';
          ctx.fillRect(wx, wy, 20, 26);
        }
      }
    }
  }

  // Neon signs.
  neonSign(ctx, 200, 250, 150, 54, '#ff2fb3', 'HOTEL');
  neonSign(ctx, 540, 210, 140, 54, '#00e5ff', 'PIER 9');
  neonSign(ctx, 890, 240, 170, 54, '#ff4da6', 'DINER');
  neonSign(ctx, 720, 330, 120, 44, '#ffe14d', 'TACOS');

  // Wet street with neon reflections.
  const street = ctx.createLinearGradient(0, H * 0.8, 0, H);
  street.addColorStop(0, '#1b1030');
  street.addColorStop(1, '#05030c');
  ctx.fillStyle = street;
  ctx.fillRect(0, H * 0.8, W, H * 0.2);
  const refl = ['#ff2fb3', '#00e5ff', '#ff4da6', '#ffe14d'];
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = refl[i % 4];
    ctx.globalAlpha = 0.12 + (i % 3) * 0.08;
    const rx = (i * 173) % W;
    ctx.fillRect(rx, H * 0.82 + (i % 5) * 26, 60 + (i % 4) * 22, 4);
  }
  ctx.globalAlpha = 1;
  // Palm silhouette against the neon.
  palm(ctx, W - 60, H * 0.82, 0.85, '#05030c');
  return c;
}

function neonSign(ctx, x, y, w, h, color, word) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 26;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(h * 0.52)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(word, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}

// All demo photos, in library order: portrait first (the hero).
export function makeDemoPhotos() {
  return [
    { id: 'demo-portrait', name: 'Demo portrait', source: makePortraitDemo() },
    { id: 'demo-beach', name: 'Demo beach sunset', source: makeBeachDemo() },
    { id: 'demo-neon', name: 'Demo neon street', source: makeNeonDemo() },
  ];
}
