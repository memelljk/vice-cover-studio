// Vice Cover Studio — bootstrap and UI wiring.
//
// Builds the control panel (photos, layouts, grades, caption, effects,
// export), wires preview drag-to-pan, and exposes a small automation
// handle (window.ViceCover) used only to take the entry's screenshots:
// exportPNG(w, h) returns a data URL of the cover the app itself drew.

import { GRADES, LAYOUTS, EXPORT_SIZES, coverGeometry } from './cover.js';
import { Editor } from './editor.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function swatchColor(gradeId) {
  const stops = GRADES[gradeId].stops;
  const mid = stops[Math.floor(stops.length / 2)][1];
  const end = stops[stops.length - 1][1];
  return `linear-gradient(135deg, rgb(${mid.join(',')}), rgb(${end.join(',')}))`;
}

async function boot() {
  const canvas = $('preview');
  const editor = new Editor(canvas);

  // Wait for the display font so the first preview already letters right.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch (err) {
    console.warn('Display font took a moment to load:', err);
  }

  editor.loadDemoPhotos();

  // ---- Photos -------------------------------------------------------
  const thumbs = $('photo-thumbs');
  const fileInput = $('file-input');
  const dropzone = $('dropzone');

  function refreshPhotos() {
    thumbs.innerHTML = '';
    editor.state.photos.forEach((photo, i) => {
      const b = el('button', 'thumb');
      b.type = 'button';
      b.title = photo.name;
      const img = document.createElement('img');
      img.src = photo.source.toDataURL('image/jpeg', 0.82);
      img.alt = photo.name;
      b.appendChild(img);
      const tag = el('span', 'thumb-tag', photo.uploaded ? 'YOURS' : 'DEMO');
      b.appendChild(tag);
      b.addEventListener('click', () => {
        editor.setPanelPhoto(editor.state.selectedPanel, i);
      });
      thumbs.appendChild(b);
    });
    $('photo-count').textContent =
      `${editor.state.photos.length} / 5 photos — click one to put it in the selected panel`;
  }

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    if (fileInput.files.length) {
      await editor.addUploads(fileInput.files);
      refreshPhotos();
      fileInput.value = '';
    }
  });
  ['dragover', 'dragenter'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) =>
    dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('drag'); }));
  dropzone.addEventListener('drop', async (e) => {
    if (e.dataTransfer.files.length) {
      await editor.addUploads(e.dataTransfer.files);
      refreshPhotos();
    }
  });

  // ---- Layouts ------------------------------------------------------
  const layoutBox = $('layout-buttons');
  Object.entries(LAYOUTS).forEach(([id, def]) => {
    const b = el('button', 'choice', `${def.name}`);
    b.type = 'button';
    b.dataset.layout = id;
    const small = el('span', 'choice-sub', def.blurb);
    b.appendChild(small);
    b.addEventListener('click', () => editor.setLayout(id));
    layoutBox.appendChild(b);
  });

  // ---- Grades -------------------------------------------------------
  const gradeBox = $('grade-buttons');
  Object.entries(GRADES).forEach(([id, def]) => {
    const b = el('button', 'choice grade-choice', def.name);
    b.type = 'button';
    b.dataset.grade = id;
    const dot = el('span', 'grade-dot');
    dot.style.background = swatchColor(id);
    b.prepend(dot);
    b.addEventListener('click', () => editor.setGrade(id));
    gradeBox.appendChild(b);
  });

  // ---- Caption ------------------------------------------------------
  const titleInput = $('title-input');
  const subInput = $('subtitle-input');
  titleInput.value = editor.state.title;
  subInput.value = editor.state.subtitle;
  const captionChanged = () => editor.setCaption(titleInput.value, subInput.value);
  titleInput.addEventListener('input', captionChanged);
  subInput.addEventListener('input', captionChanged);
  $('caption-top').addEventListener('click', () => editor.setCaptionPos('top'));
  $('caption-bottom').addEventListener('click', () => editor.setCaptionPos('bottom'));

  // ---- Effects ------------------------------------------------------
  const effectIds = ['outline', 'halftone', 'grain'];
  effectIds.forEach((id) => {
    $(`fx-${id}`).addEventListener('change', (e) => {
      editor.setEffects({ [id]: e.target.checked });
    });
  });

  // ---- Selected panel ----------------------------------------------
  const zoomSlider = $('zoom-slider');
  zoomSlider.addEventListener('input', () => {
    editor.setPanelZoom(editor.state.selectedPanel, parseFloat(zoomSlider.value));
  });
  $('fill-all').addEventListener('click', () => {
    const p = editor.state.panels[editor.state.selectedPanel];
    if (p) editor.fillAllPanels(p.photo);
  });
  $('reset-panel').addEventListener('click', () => {
    editor.resetPanel(editor.state.selectedPanel);
  });

  // ---- Export -------------------------------------------------------
  const exportBox = $('export-buttons');
  EXPORT_SIZES.forEach((size) => {
    const b = el('button', 'export-btn', `PNG ${size.label}`);
    b.type = 'button';
    b.dataset.size = size.id;
    b.addEventListener('click', () => editor.downloadExport(size));
    exportBox.appendChild(b);
  });
  $('export-all').addEventListener('click', () => {
    EXPORT_SIZES.forEach((size, i) => {
      setTimeout(() => editor.downloadExport(size), i * 350);
    });
  });

  // Size picker changes the preview aspect to match the export.
  const sizeBox = $('size-buttons');
  EXPORT_SIZES.forEach((size) => {
    const b = el('button', 'choice', size.id);
    b.type = 'button';
    b.dataset.size = size.id;
    b.addEventListener('click', () => editor.setExportSize(size.id));
    sizeBox.appendChild(b);
  });

  // ---- Preview interaction: click selects a panel, drag pans it ----
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const i = editor.panelAt(e.clientX - rect.left, e.clientY - rect.top);
    if (i >= 0) {
      editor.selectPanel(i);
      drag = { x: e.clientX, y: e.clientY, panel: i, moved: false };
      canvas.setPointerCapture(e.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const geo = editor.lastGeo;
    if (!geo) return;
    const pr = geo.panels[drag.panel];
    if (!pr) return;
    const dx = (e.clientX - drag.x) / rect.width * (canvas.width / pr.w);
    const dy = (e.clientY - drag.y) / rect.height * (canvas.height / pr.h);
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
    editor.panPanel(drag.panel, dx, dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = editor.state.panels[editor.state.selectedPanel];
    if (p) editor.setPanelZoom(editor.state.selectedPanel, p.zoom * (1 - e.deltaY * 0.001));
  }, { passive: false });

  // ---- UI refresh ---------------------------------------------------
  function refreshUI(state) {
    document.querySelectorAll('[data-layout]').forEach((b) =>
      b.classList.toggle('active', b.dataset.layout === state.layout));
    document.querySelectorAll('[data-grade]').forEach((b) =>
      b.classList.toggle('active', b.dataset.grade === state.grade));
    document.querySelectorAll('[data-size]').forEach((b) =>
      b.classList.toggle('active', b.dataset.size === state.sizeId));
    $('caption-top').classList.toggle('active', state.captionPos === 'top');
    $('caption-bottom').classList.toggle('active', state.captionPos === 'bottom');
    const p = state.panels[state.selectedPanel];
    $('panel-label').textContent = p
      ? `Panel ${state.selectedPanel + 1} of ${state.panels.length} — ${state.photos[p.photo] ? state.photos[p.photo].name : ''}`
      : 'No panel selected';
    if (p) zoomSlider.value = String(p.zoom);
    $('zoom-value').textContent = p ? `${p.zoom.toFixed(1)}×` : '1.0×';
    refreshPhotos();
  }
  editor.onchange = refreshUI;
  refreshUI(editor.state);

  // ---- Automation handle (screenshots only) ------------------------
  window.ViceCover = {
    editor,
    ready: true,
    exportPNG: (w, h) => editor.exportDataURL({ w, h }),
    state: () => editor.state,
  };

  // Screenshot helper: ?shot=cover&size=1920x1080&layout=grid&grade=sunset
  // renders that cover and leaves its data URL on window for the maker.
  const params = new URLSearchParams(location.search);
  if (params.get('shot') === 'cover') {
    const size = params.get('size') || '1920x1080';
    const [w, h] = size.split('x').map((n) => parseInt(n, 10));
    if (params.get('layout')) editor.setLayout(params.get('layout'));
    if (params.get('grade')) editor.setGrade(params.get('grade'));
    if (params.get('title')) editor.setCaption(params.get('title'), editor.state.subtitle);
    window.__shotDataURL = await editor.exportDataURL({ w: w || 1920, h: h || 1080 });
    window.__shotReady = true;
  }
}

document.addEventListener('DOMContentLoaded', boot);
