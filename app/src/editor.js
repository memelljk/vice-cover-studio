// Vice Cover Studio — editor state and wiring.
//
// Owns the photo library (demo photos + uploads), the per-panel photo /
// zoom / pan settings, the caption and grade controls, live preview and
// PNG export. The render engine lives in cover.js; the demo pictures in
// demo.js. Photos never leave the machine: uploads are read with
// createImageBitmap / FileReader into canvases and never sent anywhere.

import { GRADES, LAYOUTS, EXPORT_SIZES, treatPhoto, renderCover, coverGeometry } from './cover.js';
import { makeDemoPhotos } from './demo.js';

const MAX_PHOTOS = 5;

export function defaultState() {
  return {
    layout: 'grid',
    grade: 'sunset',
    title: 'NEON VICE',
    subtitle: 'A COVER STORY IN FIVE PANELS',
    captionPos: 'bottom',
    outline: true,
    halftone: true,
    grain: true,
    sizeId: '1920x1080',
    photos: [],
    panels: [],
    selectedPanel: 0,
  };
}

function panelsForLayout(layoutId, photos, prevPanels) {
  const count = LAYOUTS[layoutId].panels;
  const out = [];
  for (let i = 0; i < count; i++) {
    const prev = prevPanels && prevPanels[i];
    // Spread the photos across the panels: panel i starts on photo i.
    const photo = prev ? prev.photo : (photos.length ? i % photos.length : 0);
    out.push({
      photo: photos.length ? photo % photos.length : 0,
      zoom: prev ? prev.zoom : 1,
      ox: prev ? prev.ox : 0,
      oy: prev ? prev.oy : 0,
    });
  }
  return out;
}

export class Editor {
  constructor(canvas) {
    this.state = defaultState();
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.treatedCache = new Map();
    this.lastGeo = null; // panel rects in preview pixels, for hit-testing
    this.onchange = null; // UI refresh hook, set by main.js
    this._renderQueued = false;
  }

  photoCount() {
    return this.state.photos.length;
  }

  loadDemoPhotos() {
    this.state.photos = makeDemoPhotos();
    this.state.panels = panelsForLayout(this.state.layout, this.state.photos, null);
    this.invalidateTreatments();
    this.renderPreview();
  }

  // A treated (posterized + graded) copy of one library photo, cached
  // per photo + grade + effect switches.
  treatedFor(photoIndex) {
    const photo = this.state.photos[photoIndex];
    if (!photo) return null;
    const s = this.state;
    const key = [
      photo.id, s.grade,
      s.outline ? 'o1' : 'o0',
      s.halftone ? 'h1' : 'h0',
      s.grain ? 'g1' : 'g0',
    ].join('|');
    let treated = this.treatedCache.get(key);
    if (!treated) {
      const seed = 1000 + photoIndex * 7919;
      treated = treatPhoto(photo.source, s.grade, s, seed);
      this.treatedCache.set(key, treated);
    }
    return treated;
  }

  invalidateTreatments() {
    this.treatedCache.clear();
  }

  setLayout(layoutId) {
    if (!LAYOUTS[layoutId]) return;
    this.state.layout = layoutId;
    this.state.panels = panelsForLayout(layoutId, this.state.photos, this.state.panels);
    this.state.selectedPanel = 0;
    this.renderPreview();
    this.emitChange();
  }

  setGrade(gradeId) {
    if (!GRADES[gradeId]) return;
    this.state.grade = gradeId;
    this.invalidateTreatments();
    this.renderPreview();
    this.emitChange();
  }

  setCaption(title, subtitle) {
    this.state.title = title;
    this.state.subtitle = subtitle;
    this.renderPreview();
  }

  setCaptionPos(pos) {
    this.state.captionPos = pos === 'top' ? 'top' : 'bottom';
    this.renderPreview();
    this.emitChange();
  }

  setEffects(patch) {
    Object.assign(this.state, patch);
    this.invalidateTreatments();
    this.renderPreview();
    this.emitChange();
  }

  setExportSize(sizeId) {
    if (EXPORT_SIZES.some((s) => s.id === sizeId)) {
      this.state.sizeId = sizeId;
      this.renderPreview();
      this.emitChange();
    }
  }

  selectPanel(i) {
    if (i >= 0 && i < this.state.panels.length) {
      this.state.selectedPanel = i;
      this.renderPreview();
      this.emitChange();
    }
  }

  setPanelPhoto(panelIndex, photoIndex) {
    const p = this.state.panels[panelIndex];
    if (p && this.state.photos[photoIndex]) {
      p.photo = photoIndex;
      this.renderPreview();
      this.emitChange();
    }
  }

  fillAllPanels(photoIndex) {
    if (!this.state.photos[photoIndex]) return;
    for (const p of this.state.panels) p.photo = photoIndex;
    this.renderPreview();
    this.emitChange();
  }

  setPanelZoom(panelIndex, zoom) {
    const p = this.state.panels[panelIndex];
    if (p) {
      p.zoom = Math.min(4, Math.max(1, zoom));
      this.renderPreview();
    }
  }

  panPanel(panelIndex, dxFrac, dyFrac) {
    const p = this.state.panels[panelIndex];
    if (p) {
      p.ox = Math.min(0.6, Math.max(-0.6, (p.ox || 0) + dxFrac));
      p.oy = Math.min(0.6, Math.max(-0.6, (p.oy || 0) + dyFrac));
      this.renderPreview();
    }
  }

  resetPanel(panelIndex) {
    const p = this.state.panels[panelIndex];
    if (p) {
      p.zoom = 1;
      p.ox = 0;
      p.oy = 0;
      this.renderPreview();
      this.emitChange();
    }
  }

  async addUploads(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    let added = 0;
    for (const file of files) {
      if (added >= MAX_PHOTOS) break;
      try {
        const bmp = await createImageBitmap(file);
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        const cv = document.createElement('canvas');
        cv.width = Math.max(2, Math.round(bmp.width * scale));
        cv.height = Math.max(2, Math.round(bmp.height * scale));
        cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
        bmp.close();
        // Library holds at most 5: an upload past the cap replaces the
        // oldest uploaded photo, never a demo photo.
        if (this.state.photos.length >= MAX_PHOTOS) {
          const upIdx = this.state.photos.findIndex((p) => p.uploaded);
          if (upIdx === -1) break;
          const removed = this.state.photos.splice(upIdx, 1)[0];
          for (const p of this.state.panels) {
            if (p.photo === upIdx) p.photo = 0;
            else if (p.photo > upIdx) p.photo -= 1;
          }
          void removed;
        }
        const id = `up-${Date.now()}-${added}`;
        this.state.photos.push({ id, name: file.name || 'Uploaded photo', source: cv, uploaded: true });
        added++;
      } catch (err) {
        console.warn('Could not read image file:', file && file.name, err);
      }
    }
    if (added > 0) {
      // New photos join the panel rotation: re-spread assignments.
      this.state.panels = panelsForLayout(this.state.layout, this.state.photos, this.state.panels);
      this.invalidateTreatments();
      this.renderPreview();
      this.emitChange();
    }
    return added;
  }

  exportSize() {
    return EXPORT_SIZES.find((s) => s.id === this.state.sizeId) || EXPORT_SIZES[0];
  }

  // Draw the cover at full export resolution onto a fresh canvas.
  renderExport(size) {
    const cv = document.createElement('canvas');
    cv.width = size.w;
    cv.height = size.h;
    const ctx = cv.getContext('2d');
    renderCover(ctx, size.w, size.h, this.state, (i) => this.treatedFor(i));
    return cv;
  }

  async exportPNG(size) {
    const cv = this.renderExport(size);
    const blob = await new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
    return { blob, canvas: cv };
  }

  async exportDataURL(size) {
    const cv = this.renderExport(size);
    return cv.toDataURL('image/png');
  }

  downloadExport(size) {
    this.exportPNG(size).then(({ blob }) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    });
  }

  // Live preview, drawn at up to 960 px wide in the export aspect.
  renderPreview() {
    const size = this.exportSize();
    const scale = Math.min(1, 960 / size.w);
    const pw = Math.max(320, Math.round(size.w * scale));
    const ph = Math.round(size.h * scale);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    const geo = renderCover(this.ctx, pw, ph, this.state, (i) => this.treatedFor(i));
    this.lastGeo = geo;
    this.drawSelection();
  }

  drawSelection() {
    if (!this.lastGeo) return;
    const rect = this.lastGeo.panels[this.state.selectedPanel];
    if (!rect) return;
    this.ctx.save();
    this.ctx.strokeStyle = '#00e5ff';
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 6]);
    this.ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  // Preview-pixel point -> panel index, or -1.
  panelAt(px, py) {
    if (!this.lastGeo) return -1;
    const rect = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / rect.width;
    const sy = this.canvas.height / rect.height;
    const x = px * sx;
    const y = py * sy;
    return this.lastGeo.panels.findIndex(
      (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
    );
  }

  emitChange() {
    if (this.onchange) this.onchange(this.state);
  }
}
