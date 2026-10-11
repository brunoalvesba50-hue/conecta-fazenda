/* Conecta Fazenda — motor leve em Canvas 2D (sem bibliotecas externas).
   Desenha os elementos em ordem de profundidade, move a câmera (arrastar / pinça / roda do mouse)
   e descobre em qual elemento a pessoa tocou (pelo desenho, não por um retângulo). */

export const ease = {
  linear: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  back: t => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

export class Sprite {
  constructor(o) {
    Object.assign(this, { img: null, x: 0, y: 0, ax: .5, ay: 1, s: 1, sx: 1, sy: 1, rot: 0, alpha: 1, flip: false, z: null, layer: 1, visible: true, onTap: null, draw: null, hit: null, tag: '' }, o);
  }
  get w() { return this.img ? this.img.width * this.s * this.sx : 0; }
  get h() { return this.img ? this.img.height * this.s * this.sy : 0; }
  get depth() { return this.z == null ? this.y : this.z; }
  bounds() { const w = this.w, h = this.h; return { x: this.x - w * this.ax, y: this.y - h * this.ay, w, h }; }
}

export class Engine {
  constructor(canvas, world) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.world = world; this.sprites = []; this.tweens = []; this.cam = { x: 0, y: 0, zoom: 1 };
    this.minZoom = .3; this.maxZoom = 1.5; this.dpr = 1; this.vw = 1; this.vh = 1;
    this.onFrame = null; this.onTapEmpty = null; this.before = null; this.after = null;
    this._masks = new Map(); this._ptr = new Map(); this._drag = null; this.t = 0; this.dt = 0;
    this.resize(); this._bind();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 150));
    const loop = t => { this.dt = Math.min(.05, (t - (this._last || t)) / 1000); this._last = t; this.t = t / 1000; this._step(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  add(o) { const s = o instanceof Sprite ? o : new Sprite(o); this.sprites.push(s); return s; }
  remove(s) { const i = this.sprites.indexOf(s); if (i >= 0) this.sprites.splice(i, 1); }

  resize() {
    /* tamanho do desenho (sem o giro da tela): clientWidth/Height não mudam quando o jogo está girado */
    this.vw = Math.max(1, this.cv.clientWidth); this.vh = Math.max(1, this.cv.clientHeight);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.round(this.vw * this.dpr); this.cv.height = Math.round(this.vh * this.dpr);
    /* menor zoom = mapa inteiro cabe na tela (visão geral); maior = detalhes das plantas e casas */
    this.coverZoom = Math.max(this.vw / this.world.w, this.vh / this.world.h);
    /* zoom mínimo = o mapa ainda cobre a tela inteira: nunca aparece nada fora do mapa (céu vazio, bordas) */
    this.minZoom = this.coverZoom;
    this.maxZoom = Math.max(1.7, this.coverZoom * 2.6);
    this.setZoom(this.cam.zoom || 1); this.clamp();
  }
  setZoom(z, cx, cy) {
    z = Math.min(this.maxZoom, Math.max(this.minZoom, z));
    cx = cx == null ? this.vw / 2 : cx; cy = cy == null ? this.vh / 2 : cy;
    const wx = this.cam.x + cx / this.cam.zoom, wy = this.cam.y + cy / this.cam.zoom;
    this.cam.zoom = z; this.cam.x = wx - cx / z; this.cam.y = wy - cy / z; this.clamp();
  }
  centerOn(wx, wy) { this.cam.x = wx - this.vw / 2 / this.cam.zoom; this.cam.y = wy - this.vh / 2 / this.cam.zoom; this.clamp(); }
  /* o mapa nunca some da tela: se a tela é maior que o mapa, ele fica centralizado */
  clamp() {
    const vw = this.vw / this.cam.zoom, vh = this.vh / this.cam.zoom;
    this.cam.x = vw >= this.world.w ? (this.world.w - vw) / 2 : Math.min(Math.max(0, this.cam.x), this.world.w - vw);
    /* tela mais alta que o mapa (visão geral no celular): o chão fica embaixo e sobra céu em cima */
    this.cam.y = vh >= this.world.h ? this.world.h - vh + Math.min(60, (vh - this.world.h) / 2) : Math.min(Math.max(0, this.cam.y), this.world.h - vh);
  }
  /* zoom suave pelos botões (mantém o centro da tela no lugar) */
  get calmo() {
    if (this._calmoMq === undefined) { try { this._calmoMq = matchMedia('(prefers-reduced-motion: reduce)'); } catch (_) { this._calmoMq = null; } }
    return !!(this._calmoMq && this._calmoMq.matches);
  }
  zoomTo(z, cx, cy, dur = .28) {
    if (this.calmo) dur = .001;
    z = Math.min(this.maxZoom, Math.max(this.minZoom, z)); const o = { z: this.cam.zoom };
    cx = cx == null ? this.vw / 2 : cx; cy = cy == null ? this.vh / 2 : cy;
    this._zt = { from: this.cam.zoom, to: z, cx, cy, t0: this.t, dur };
  }
  flyTo(wx, wy, z, dur = .45) { if (this.calmo) dur = .001; this._fly = { x0: this.cam.x + this.vw / 2 / this.cam.zoom, y0: this.cam.y + this.vh / 2 / this.cam.zoom, x1: wx, y1: wy, z0: this.cam.zoom, z1: Math.min(this.maxZoom, Math.max(this.minZoom, z)), t0: this.t, dur }; this._zt = null; }
  toWorld(sx, sy) { return { x: this.cam.x + sx / this.cam.zoom, y: this.cam.y + sy / this.cam.zoom }; }
  toScreen(wx, wy) { return { x: (wx - this.cam.x) * this.cam.zoom, y: (wy - this.cam.y) * this.cam.zoom }; }

  tween(target, to, dur = .4, fn = ease.out, onDone) {
    const from = {}; for (const k in to) from[k] = target[k];
    const tw = { target, from, to, dur, fn, t0: this.t, onDone };
    this.tweens = this.tweens.filter(o => !(o.target === target && Object.keys(to).some(k => k in o.to)));
    this.tweens.push(tw); return tw;
  }

  _step() {
    if (this._zt) { const a = this._zt, p = Math.min(1, (this.t - a.t0) / a.dur), e = ease.out(p); this.setZoom(a.from + (a.to - a.from) * e, a.cx, a.cy); if (p >= 1) this._zt = null; }
    if (this._fly) { const f = this._fly, p = Math.min(1, (this.t - f.t0) / f.dur), e = ease.inOut(p); this.cam.zoom = f.z0 + (f.z1 - f.z0) * e; this.centerOn(f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e); if (p >= 1) this._fly = null; }
    if (this.onFrame) this.onFrame(this.t, this.dt);
    const keep = [];
    for (const tw of this.tweens) {
      const p = Math.min(1, (this.t - tw.t0) / tw.dur), e = tw.fn(p);
      for (const k in tw.to) tw.target[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (p < 1) keep.push(tw); else if (tw.onDone) tw.onDone();
    }
    this.tweens = keep;
    this.render();
  }

  render() {
    const c = this.ctx, z = this.cam.zoom, d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.vw, this.vh);
    c.setTransform(d * z, 0, 0, d * z, -this.cam.x * z * d, -this.cam.y * z * d);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    if (this.before) this.before(c);
    const vx0 = this.cam.x - 200, vy0 = this.cam.y - 260, vx1 = this.cam.x + this.vw / z + 200, vy1 = this.cam.y + this.vh / z + 300;
    const list = this.sprites.filter(s => s.visible).sort((a, b) => a.layer - b.layer || a.depth - b.depth);
    for (const s of list) {
      if (s.draw) { c.save(); c.globalAlpha = s.alpha; s.draw(c, s, this); c.restore(); continue; }
      if (!s.img || s.alpha <= 0) continue;
      const b = s.bounds(); if (b.x > vx1 || b.y > vy1 || b.x + b.w < vx0 || b.y + b.h < vy0) continue;
      c.save(); c.globalAlpha = s.alpha; c.translate(s.x, s.y); if (s.rot) c.rotate(s.rot);
      c.scale((s.flip ? -1 : 1) * s.s * s.sx, s.s * s.sy);
      c.drawImage(s.img, -s.img.width * s.ax, -s.img.height * s.ay); c.restore();
    }
    if (this.after) { c.setTransform(d, 0, 0, d, 0, 0); this.after(c); }
  }

  /* ---------- toque ---------- */
  _mask(img) {
    let m = this._masks.get(img); if (m) return m;
    const k = Math.min(1, 96 / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    let data = null; try { data = x.getImageData(0, 0, w, h).data; } catch (_) {}
    m = { w, h, data }; this._masks.set(img, m); return m;
  }
  pick(wx, wy) {
    const list = this.sprites.filter(s => s.visible && s.onTap).sort((a, b) => b.layer - a.layer || b.depth - a.depth);
    for (const s of list) {
      if (s.hit) { if (s.hit(wx, wy)) return s; continue; }
      if (!s.img) continue;
      const b = s.bounds(); if (wx < b.x || wy < b.y || wx > b.x + b.w || wy > b.y + b.h) continue;
      const m = this._mask(s.img); if (!m.data) return s;
      let u = (wx - b.x) / b.w; if (s.flip) u = 1 - u; const v = (wy - b.y) / b.h;
      const px = Math.min(m.w - 1, Math.floor(u * m.w)), py = Math.min(m.h - 1, Math.floor(v * m.h));
      if (m.data[(py * m.w + px) * 4 + 3] > 50) return s;
    }
    return null;
  }
  /* ponto do dedo/mouse em coordenadas do jogo. Com o celular em pé, o jogo inteiro é girado 90°
     (fica de lado); então x do jogo = y da página e y do jogo = largura da página − x */
  _pos(e) {
    if (document.body.classList.contains('girado')) return { x: e.clientY, y: window.innerWidth - e.clientX };
    const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  _bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => { if (e.button > 0) return; const q = this._pos(e); try { cv.setPointerCapture(e.pointerId); } catch (_) {} this._zt = null; this._fly = null; if (!this._ptr.size) this._gesto = false; this._ptr.set(e.pointerId, { x: q.x, y: q.y, x0: q.x, y0: q.y, t: performance.now() }); if (this._ptr.size >= 2) { this._gesto = true; this._pinch = this._pinchInfo(); } });
    cv.addEventListener('pointermove', e => {
      const p = this._ptr.get(e.pointerId); if (!p) return;
      const q = this._pos(e), dx = q.x - p.x, dy = q.y - p.y; p.x = q.x; p.y = q.y;
      if (this._ptr.size >= 2 && this._pinch) {
        /* pinça: o ponto do mapa que estava entre os dedos continua entre os dedos */
        const n = this._pinchInfo(), o = this._pinch;
        if (n.d > 0 && o.d > 0) {
          const w = this.toWorld(o.cx, o.cy);
          this.cam.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.cam.zoom * n.d / o.d));
          this.cam.x = w.x - n.cx / this.cam.zoom; this.cam.y = w.y - n.cy / this.cam.zoom; this.clamp();
        }
        this._pinch = n; p.moved = true; return;
      }
      if (this._gesto && this._ptr.size === 1 && !p.moved) p.moved = true;
      if (Math.hypot(q.x - p.x0, q.y - p.y0) > 8) p.moved = true;
      if (p.moved) { this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; this.clamp(); }
    });
    const up = e => {
      const p = this._ptr.get(e.pointerId); this._ptr.delete(e.pointerId); if (this._ptr.size < 2) this._pinch = null;
      /* tocar só conta se foi um dedo só, sem arrastar e sem pinça antes (zoom nunca planta/colhe) */
      if (!p || p.moved || e.type === 'pointercancel' || this._ptr.size || this._gesto) { if (!this._ptr.size) this._gesto = false; return; }
      const q = this._pos(e), w = this.toWorld(q.x, q.y), s = this.pick(w.x, w.y);
      if (s) s.onTap(s, w); else if (this.onTapEmpty) this.onTapEmpty(w);
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); this._zt = null; this._fly = null; const f = Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * (e.ctrlKey ? .012 : .0025)); const q = this._pos(e); this.setZoom(this.cam.zoom * f, q.x, q.y); }, { passive: false });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    /* Safari do iPhone: impede o zoom da página inteira (gesto nativo), deixando só o zoom do mapa */
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
    document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
    /* se o navegador ainda assim ampliar a página (iOS), volta ao tamanho normal */
    const vv = window.visualViewport, meta = document.querySelector('meta[name=viewport]');
    if (vv && meta) vv.addEventListener('resize', () => { if (vv.scale > 1.01) { const c = meta.content; meta.content = c + ',minimum-scale=1'; setTimeout(() => meta.content = c, 60); } });
    let ultimo = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - ultimo < 320 && e.target === cv) e.preventDefault(); ultimo = n; }, { passive: false });
    /* computador: mãozinha em cima do que dá para tocar */
    cv.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || this._ptr.size) return;
      const n = performance.now(); if (n - (this._hov || 0) < 60) return; this._hov = n;
      const q = this._pos(e), w = this.toWorld(q.x, q.y); cv.style.cursor = this.pick(w.x, w.y) ? 'pointer' : 'grab';
    });
  }
  _pinchInfo() { const a = [...this._ptr.values()]; if (a.length < 2) return { d: 0, cx: 0, cy: 0 }; return { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2 }; }
}

export function loadImages(manifest, onProgress) {
  const out = {}; let done = 0; const names = Object.keys(manifest);
  return Promise.all(names.map(n => new Promise(res => {
    const i = new Image(); i.decoding = 'async';
    i.onload = () => { out[n] = i; done++; onProgress && onProgress(done / names.length); res(); };
    i.onerror = () => { done++; onProgress && onProgress(done / names.length); res(); };
    i.src = manifest[n];
  }))).then(() => out);
}
