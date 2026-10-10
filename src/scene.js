/* Conecta Fazenda — a cena de São Bento do Sapucaí: fundo com a Pedra do Baú, chão, casa, celeiro,
   canteiros, animais, árvores e enfeites. Também desenha barras de crescimento e balões. */
import { Sprite, ease } from './engine.js';
import { CULTURAS, ANIMAIS, PRODUTOS, RECEITAS } from './data.js';
import { estadoCanteiro, estadoAnimal, estadoPadaria, fmtTempo, agora } from './game.js';
import { CROPMETA } from './cropmeta.js';
import { desenhaEstradas } from './roads.js';

/* mapa mais alto para aproveitar o celular na vertical: em cima a fazenda, embaixo a mata, o pomar e a saída para a cidade */
export const WORLD = { w: 1800, h: 2340 };
const GROUND_TOP = 440;
const PLOT = { cx: 880, cy: 1040, hw: 80, hh: 46 };
export const PASTO = { x0: 1190, y0: 1030, x1: 1700, y1: 1240 };
const GALINHAS = { x0: 190, y0: 1090, x1: 560, y1: 1230 };

export function plotPos(i) { const r = Math.floor(i / 3), c = i % 3; return { x: PLOT.cx + (c - r) * PLOT.hw, y: PLOT.cy + (c + r - 2) * PLOT.hh }; }
function inDiamond(px, py, x, y) { return Math.abs(px - x) / PLOT.hw + Math.abs(py - y) / PLOT.hh <= 1; }

/* ---------- texturas geradas ---------- */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function grassCanvas(W, H, comEstradas = true) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); const r = rng(7);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#62780c'); g.addColorStop(.25, '#6f9018'); g.addColorStop(1, '#5c8420'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const cols = ['#83a52a', '#5f8012', '#8fb038', '#53740e', '#99b84a', '#6c8f1c'];
  for (let i = 0; i < 2600; i++) { c.globalAlpha = .08 + r() * .14; c.fillStyle = cols[Math.floor(r() * cols.length)]; const x = r() * W, y = r() * H, rad = 6 + r() * 30; c.beginPath(); c.ellipse(x, y, rad * 1.7, rad * .7, 0, 0, 7); c.fill(); }
  c.globalAlpha = .55; c.lineCap = 'round';
  for (let i = 0; i < 9000; i++) { const x = r() * W, y = r() * H, h = 4 + r() * 9; c.strokeStyle = r() < .5 ? '#a2c23f' : '#4b6b0e'; c.lineWidth = 1 + r() * .8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - .5) * 4, y - h); c.stroke(); }
  c.globalAlpha = 1;
  for (let i = 0; i < 260; i++) { const x = r() * W, y = 40 + r() * (H - 40); c.fillStyle = ['#fff7d6', '#ffd84a', '#f6a8c8', '#ffffff'][Math.floor(r() * 4)]; c.beginPath(); c.arc(x, y, 1.6 + r() * 1.8, 0, 7); c.fill(); }
  /* estradas: rede única desenhada em camadas (ver roads.js) */
  if (comEstradas) desenhaEstradas(c, GROUND_TOP);
  /* emenda suave com o fundo */
  const fade = c.createLinearGradient(0, 0, 0, 80); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'destination-out'; c.fillStyle = fade; c.fillRect(0, 0, W, 80); c.globalCompositeOperation = 'source-over';
  return cv;
}

function soilDiamond(c, x, y, locked, hover) {
  const hw = PLOT.hw * .88, hh = PLOT.hh * .88, th = 9;
  c.save();
  if (locked) {
    c.globalAlpha = .9; c.fillStyle = 'rgba(70,110,40,.45)';
    c.beginPath(); c.moveTo(x, y - hh); c.lineTo(x + hw, y); c.lineTo(x, y + hh); c.lineTo(x - hw, y); c.closePath(); c.fill();
    c.setLineDash([7, 6]); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,248,220,.75)'; c.stroke(); c.restore(); return;
  }
  c.fillStyle = '#331707';
  c.beginPath(); c.moveTo(x - hw, y); c.lineTo(x, y + hh); c.lineTo(x + hw, y); c.lineTo(x + hw, y + th); c.lineTo(x, y + hh + th); c.lineTo(x - hw, y + th); c.closePath(); c.fill();
  const g = c.createLinearGradient(x - hw, y - hh, x + hw, y + hh); g.addColorStop(0, '#74401f'); g.addColorStop(1, '#4a2511');
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y - hh); c.lineTo(x + hw, y); c.lineTo(x, y + hh); c.lineTo(x - hw, y); c.closePath(); c.fill();
  c.clip(); c.strokeStyle = 'rgba(40,20,8,.45)'; c.lineWidth = 4;
  for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(x - hw + k * 22, y - hh); c.lineTo(x + k * 22, y + hh); c.stroke(); }
  c.strokeStyle = 'rgba(170,105,60,.4)'; c.lineWidth = 2.5;
  for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(x - hw + k * 22 + 5, y - hh); c.lineTo(x + k * 22 + 5, y + hh); c.stroke(); }
  c.restore();
  if (hover) { c.save(); c.lineWidth = 4; c.strokeStyle = `rgba(255,236,120,${hover})`; c.beginPath(); c.moveTo(x, y - hh); c.lineTo(x + hw, y); c.lineTo(x, y + hh); c.lineTo(x - hw, y); c.closePath(); c.stroke(); c.restore(); }
  else { c.save(); c.lineWidth = 2; c.strokeStyle = 'rgba(255,230,180,.25)'; c.beginPath(); c.moveTo(x, y - hh); c.lineTo(x + hw, y); c.lineTo(x, y + hh); c.lineTo(x - hw, y); c.closePath(); c.stroke(); c.restore(); }
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function bubble(c, x, y, img, t, extra) {
  const bob = Math.sin(t * 3) * 4, R = 30; y += bob;
  c.save(); c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
  c.fillStyle = '#fffaf0'; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill();
  c.beginPath(); c.moveTo(x - 9, y + R - 6); c.lineTo(x, y + R + 12); c.lineTo(x + 9, y + R - 6); c.fill(); c.restore();
  c.lineWidth = 3; c.strokeStyle = extra === 'ok' ? '#3fbf5f' : '#e8b44c'; c.beginPath(); c.arc(x, y, R - 1.5, 0, 7); c.stroke();
  if (img) { const k = 40 / Math.max(img.width, img.height); c.drawImage(img, x - img.width * k / 2, y - img.height * k / 2, img.width * k, img.height * k); }
  if (extra === 'ok') { c.fillStyle = '#3fbf5f'; c.beginPath(); c.arc(x + 22, y - 22, 11, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 17, y - 22); c.lineTo(x + 21, y - 18); c.lineTo(x + 28, y - 26); c.stroke(); }
}
function bar(c, x, y, p, txt) {
  const w = 92, h = 14;
  c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 6; c.fillStyle = 'rgba(20,32,24,.78)'; rr(c, x - w / 2, y, w, h, 7); c.fill(); c.restore();
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#9be36b'); g.addColorStop(1, '#43a634');
  c.fillStyle = g; rr(c, x - w / 2 + 2, y + 2, Math.max(10, (w - 4) * p), h - 4, 5); c.fill();
  if (txt) { c.font = '700 15px system-ui,-apple-system,sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.55)'; c.strokeText(txt, x, y - 5); c.fillStyle = '#fff'; c.fillText(txt, x, y - 5); }
}
function lockBadge(c, x, y, custo, nivel, st) {
  const pode = st.nivel >= nivel;
  c.save(); c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 8; c.fillStyle = 'rgba(255,250,236,.95)'; rr(c, x - 50, y - 18, 100, 36, 18); c.fill(); c.restore();
  c.fillStyle = '#7a5a2a'; rr(c, x - 38, y - 6, 16, 13, 3); c.fill(); c.strokeStyle = '#7a5a2a'; c.lineWidth = 3; c.beginPath(); c.arc(x - 30, y - 7, 5.5, Math.PI, 0); c.stroke();
  c.font = '800 15px system-ui,-apple-system,sans-serif'; c.textAlign = 'left'; c.fillStyle = '#4a3512';
  c.fillText(pode ? String(custo) : `Nív. ${nivel}`, x - 16, y + 6);
  if (pode) { coin(c, x + 30, y, 9); }
}
export function coin(c, x, y, r) { const g = c.createRadialGradient(x - r * .3, y - r * .3, 1, x, y, r); g.addColorStop(0, '#fff3a3'); g.addColorStop(.6, '#f6c632'); g.addColorStop(1, '#c98a0e'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#a86f06'; c.lineWidth = 1.5; c.stroke(); }

/* ---------- montagem da cena ---------- */
export function buildScene(E, IMG, api) {
  const S = { plots: [], animals: [], fx: [], farmer: null, padaria: null, plantMode: null };
  const add = o => E.add(new Sprite(o));
  const sway = [];

  /* céu + fundo com a Pedra do Baú (leve efeito de profundidade ao mover) */
  const bg = IMG.fundo_sao_bento, bgW = WORLD.w * 1.12, bgH = bg.height * bgW / bg.width;
  E.before = c => {
    /* fora do mapa (visão geral): céu em cima e grama embaixo, para nunca aparecer vazio */
    const vx = E.cam.x - 4, vy = E.cam.y - 4, vw = E.vw / E.cam.zoom + 8, vh = E.vh / E.cam.zoom + 8;
    const sky = c.createLinearGradient(0, vy, 0, 200); sky.addColorStop(0, '#4f9be0'); sky.addColorStop(1, '#8cc4ee');
    c.fillStyle = sky; c.fillRect(vx, vy, vw, Math.max(0, 300 - vy));
    c.fillStyle = '#5c8420'; c.fillRect(vx, 300, vw, vy + vh - 300);
    const maxX = WORLD.w - E.vw / E.cam.zoom, k = maxX > 1 ? Math.min(1, Math.max(0, E.cam.x / maxX)) : .5;
    const x0 = -k * (bgW - WORLD.w);
    c.drawImage(bg, x0, 30, bgW, bgH);
    /* nas laterais (só aparece com o mapa bem afastado): a paisagem espelhada continua sem emenda */
    if (vx < x0 || vx + vw > x0 + bgW) { c.save(); c.scale(-1, 1); c.drawImage(bg, -x0, 30, bgW, bgH); c.drawImage(bg, -(x0 + 2 * bgW), 30, bgW, bgH); c.restore(); }
  };
  const ground = grassCanvas(WORLD.w, WORLD.h - GROUND_TOP);
  let grama = null; /* grama sem estradas, só para preencher fora do mapa na visão geral */
  const gramaFora = () => grama || (grama = grassCanvas(WORLD.w, WORLD.h - GROUND_TOP, false));
  add({ layer: 0, z: -1, draw: c => {
    c.drawImage(ground, 0, GROUND_TOP);
    const vx = E.cam.x, vw = E.vw / E.cam.zoom;
    if (vx < 0 || vx + vw > WORLD.w) { const g = gramaFora(); c.save(); c.scale(-1, 1); c.drawImage(g, 0, GROUND_TOP); c.drawImage(g, -2 * WORLD.w, GROUND_TOP); c.restore(); }
    if (E.cam.y + E.vh / E.cam.zoom > WORLD.h) { const g = gramaFora(); c.save(); c.translate(0, 2 * WORLD.h); c.scale(1, -1); c.drawImage(g, 0, GROUND_TOP); c.restore(); }
  } });

  /* árvores e natureza (fundo da propriedade) */
  const tree = (img, x, y, w, flip) => { const s = add({ img: IMG[img], x, y, s: w / IMG[img].width, flip: !!flip }); sway.push({ s, ph: x * .013 }); return s; };
  tree('araucaria', 70, 640, 190); tree('araucaria', 1010, 600, 170); tree('araucaria', 1760, 640, 200); tree('pinheiro', 1640, 620, 120); tree('pinheiro2', 140, 900, 110);
  tree('ipe_amarelo', 330, 700, 200); tree('ipe_rosa', 1720, 650, 170); tree('arvore_frutifera', 1110, 1236, 150); tree('pinheiro', 40, 1230, 120); tree('araucaria', 1780, 1370, 190); tree('ipe_amarelo', 130, 1375, 160);
  /* mais vegetação da Mantiqueira: araucárias, ipês e pinheiros variados (tamanhos e lados diferentes) */
  [['araucaria', 270, 560, 150, 1], ['pinheiro2', 520, 600, 96], ['ipe_rosa', 820, 575, 130, 1], ['araucaria', 1180, 560, 140], ['pinheiro', 1400, 600, 100, 1],
   ['arvore_frutifera', 1560, 575, 118], ['pinheiro', 36, 830, 104, 1], ['araucaria', 1768, 900, 170, 1], ['ipe_amarelo', 1756, 1110, 132],
   ['pinheiro2', 900, 1372, 100, 1], ['ipe_rosa', 1300, 1376, 124], ['araucaria', 430, 1372, 150]].forEach(a => tree(...a));
  /* ---- parte de baixo: mata com lago, curral, pomar com galpão e silo ---- */
  [['araucaria', 90, 1620, 170], ['pinheiro2', 330, 1600, 100, 1], ['pinheiro', 56, 1790, 110], ['araucaria', 170, 2010, 190, 1], ['ipe_rosa', 540, 1930, 140],
   ['araucaria', 420, 2000, 160], ['pinheiro', 250, 2080, 100, 1], ['ipe_amarelo', 860, 1500, 120, 1], ['pinheiro2', 880, 2060, 96],
   ['araucaria', 1770, 2060, 180], ['pinheiro', 1560, 2080, 104, 1],
   /* faixa de mata no fim do mapa (para o celular em pé poder afastar sem mostrar área vazia) */
   ['araucaria', 80, 2240, 180, 1], ['ipe_amarelo', 300, 2290, 140], ['pinheiro2', 470, 2250, 100], ['araucaria', 960, 2280, 170, 1], ['ipe_rosa', 1180, 2250, 130],
   ['pinheiro', 1360, 2300, 110, 1], ['araucaria', 1560, 2270, 180], ['arvore_frutifera', 1740, 2250, 120, 1], ['pinheiro', 820, 2180, 96]].forEach(a => tree(...a));
  add({ img: IMG.lagoinha, x: 250, y: 1860, s: 330 / IMG.lagoinha.width, flip: true });
  add({ img: IMG.pedras, x: 470, y: 1810, s: 90 / IMG.pedras.width, flip: true });
  add({ img: IMG.tronco, x: 330, y: 1960, s: 76 / IMG.tronco.width, flip: true });
  add({ img: IMG.flores, x: 560, y: 1700, s: 50 / IMG.flores.width }); add({ img: IMG.flores, x: 760, y: 1990, s: 50 / IMG.flores.width });
  add({ img: IMG.curral, x: 1450, y: 1510, s: 230 / IMG.curral.width, tag: 'curral', onTap: () => api.tap('curral') });
  add({ img: IMG.deposito, x: 1650, y: 1700, s: 220 / IMG.deposito.width, tag: 'deposito', onTap: () => api.tap('deposito') });
  add({ img: IMG.silo, x: 1730, y: 1900, s: 96 / IMG.silo.width, tag: 'silo', onTap: () => api.tap('silo') });
  add({ img: IMG.feno, x: 1560, y: 1760, s: 64 / IMG.feno.width }); add({ img: IMG.feno, x: 1596, y: 1784, s: 58 / IMG.feno.width });
  /* pomar: árvores em fileiras, com tamanhos e lados variados (não parecem coladas) */
  add({ img: IMG.portao, x: 1004, y: 1640, s: 80 / IMG.portao.width });
  for (let x = 1060; x < 1500; x += 82) { add({ img: IMG.cerca, x, y: 1640, s: 84 / IMG.cerca.width, z: 1600 }); add({ img: IMG.cerca, x: x - 30, y: 2010, s: 84 / IMG.cerca.width }); }
  [[1090, 1760], [1220, 1748], [1350, 1764], [1470, 1752], [1150, 1876], [1280, 1866], [1410, 1880], [1090, 1990], [1220, 1984], [1350, 1994]].forEach(([x, y], i) => tree('arvore_frutifera', x, y, 112 + (i * 37 % 26), i % 2));
  add({ img: IMG.lagoinha, x: 220, y: 860, s: 300 / IMG.lagoinha.width });
  add({ img: IMG.pedras, x: 1740, y: 1310, s: 110 / IMG.pedras.width });

  /* construções */
  const casa = add({ img: IMG.casa, x: 590, y: 815, s: 440 / IMG.casa.width, onTap: () => api.tap('casa'), tag: 'casa' });
  const celeiro = add({ img: IMG.celeiro, x: 1290, y: 830, s: 340 / IMG.celeiro.width, onTap: () => api.tap('celeiro'), tag: 'celeiro' });
  add({ img: IMG.poco, x: 900, y: 860, s: 115 / IMG.poco.width, onTap: () => api.tap('poco') });
  add({ img: IMG.galinheiro, x: 330, y: 1075, s: 250 / IMG.galinheiro.width, onTap: () => api.tap('galinheiro'), tag: 'galinheiro' });
  S.padaria = add({ img: IMG.padaria, x: 1630, y: 930, s: 280 / IMG.padaria.width, onTap: () => api.tap('padaria'), tag: 'padaria' });
  add({ img: IMG.feno, x: 1470, y: 860, s: 70 / IMG.feno.width }); add({ img: IMG.feno, x: 1500, y: 885, s: 64 / IMG.feno.width });
  add({ img: IMG.carroca, x: 1150, y: 985, s: 110 / IMG.carroca.width });
  add({ img: IMG.banco, x: 790, y: 852, s: 80 / IMG.banco.width }); add({ img: IMG.lampiao, x: 968, y: 860, s: 34 / IMG.lampiao.width });
  add({ img: IMG.flores, x: 420, y: 850, s: 60 / IMG.flores.width }); add({ img: IMG.flores, x: 1080, y: 862, s: 54 / IMG.flores.width }); add({ img: IMG.flores, x: 720, y: 1230, s: 52 / IMG.flores.width });
  add({ img: IMG.tronco, x: 260, y: 1310, s: 80 / IMG.tronco.width });
  add({ img: IMG.placa, x: 742, y: 2050, s: 100 / IMG.placa.width });
  add({ img: IMG.caixa, x: 1040, y: 1190, s: 46 / IMG.caixa.width }); add({ img: IMG.cesto, x: 1000, y: 1208, s: 46 / IMG.cesto.width });
  /* cerca do pasto */
  const fw = 86, cs = fw / IMG.cerca.width;
  for (let x = PASTO.x0 - 20; x < PASTO.x1 + 60; x += fw - 4) add({ img: IMG.cerca, x: x + fw / 2, y: PASTO.y0 - 10, s: cs, z: PASTO.y0 - 40 });
  for (let x = PASTO.x0 - 20; x < PASTO.x1 + 60; x += fw - 4) { const mid = Math.abs(x - (PASTO.x0 + PASTO.x1) / 2) < fw / 2; add({ img: mid ? IMG.portao : IMG.cerca, x: x + fw / 2, y: PASTO.y1 + 40, s: (mid ? fw / IMG.portao.width : cs), z: PASTO.y1 + 40 }); }

  /* canteiros */
  for (let i = 0; i < 9; i++) {
    const p = plotPos(i);
    const spr = add({ x: p.x, y: p.y, z: p.y + PLOT.hh, tag: 'plot' + i, hit: (wx, wy) => inDiamond(wx, wy, p.x, p.y) || (S.plots[i].hasPlant && inDiamond(wx, wy + 60, p.x, p.y)), onTap: () => api.tapPlot(i) });
    const P = { i, spr, x: p.x, y: p.y, e: null, pop: 0, hasPlant: false };
    spr.draw = (c) => drawPlot(c, P);
    add({ layer: 2, z: p.y, draw: c => drawPlotInfo(c, P) });
    S.plots.push(P);
  }
  function drawPlot(c, P) {
    const st = api.state(), e = P.e || estadoCanteiro(st, P.i, agora()), t = E.t;
    if (e.tipo === 'bloqueado') { soilDiamond(c, P.x, P.y, true); return; }
    const hl = S.plantMode && e.tipo === 'vazio' ? .55 + .45 * Math.sin(t * 5) : 0;
    const key = e.tipo === 'vazio' ? 'canteiro_vazio' : `${e.cultura}_${e.fase}`, img = IMG[key];
    if (!img) { soilDiamond(c, P.x, P.y, false, hl); return; }
    if (hl) { c.save(); c.globalAlpha = hl; c.fillStyle = 'rgba(255,236,120,.35)'; c.strokeStyle = 'rgba(255,240,150,.95)'; c.lineWidth = 4; const w = PLOT.hw * .98, h = PLOT.hh * .98; c.beginPath(); c.moveTo(P.x, P.y - h); c.lineTo(P.x + w, P.y); c.lineTo(P.x, P.y + h); c.lineTo(P.x - w, P.y); c.closePath(); c.fill(); c.stroke(); c.restore(); }
    /* a imagem da planta já traz o canteiro de terra: encaixa o bico de baixo dela no bico do canteiro */
    const m = CROPMETA[key], ref = CROPMETA.canteiro_vazio;
    const k = (PLOT.hw * 2 * .9) / ref.pw * (1 + P.pop * .15);
    const r = e.tipo === 'pronto' ? Math.sin(t * 2.4 + P.i) * .025 : 0;
    c.save(); c.translate(P.x, P.y + PLOT.hh * .9 + 8); c.rotate(r); c.drawImage(img, -m.vx * k, -m.vy * k, img.width * k, img.height * k); c.restore();
  }
  function drawPlotInfo(c, P) {
    const st = api.state(), e = P.e || estadoCanteiro(st, P.i, agora());
    if (e.tipo === 'bloqueado') lockBadge(c, P.x, P.y, e.custo, e.nivel, st);
    else if (e.tipo === 'crescendo') bar(c, P.x, P.y + 4, e.progresso, fmtTempo(e.falta));
    else if (e.tipo === 'pronto') bubble(c, P.x, P.y - 130, IMG['i_' + e.cultura], E.t + P.i, 'ok');
  }

  /* fazendeiro */
  S.farmer = add({ img: IMG.p_idle, x: 600, y: 975, s: 100 / IMG.p_idle.height, onTap: () => api.tap('fazendeiro') });
  S.farmerPose = (pose, ms = 900) => {
    const im = IMG[pose] || IMG.p_idle; S.farmer.img = im; S.farmer.s = 100 / im.height;
    clearTimeout(S._ft); S._ft = setTimeout(() => { S.farmer.img = IMG.p_idle; S.farmer.s = 100 / IMG.p_idle.height; }, ms);
  };

  /* animais */
  const st0 = api.state(); const rnd = rng(3);
  st0.animais.forEach((a, k) => {
    const isVaca = a.tipo === 'vaca', area = isVaca ? PASTO : GALINHAS;
    const A = { k, tipo: a.tipo, x: area.x0 + 60 + rnd() * (area.x1 - area.x0 - 120), y: area.y0 + 40 + rnd() * (area.y1 - area.y0 - 80), tx: 0, ty: 0, mode: 'idle', timer: rnd() * 3, dir: 1, area, hop: 0 };
    A.tx = A.x; A.ty = A.y;
    const img = isVaca ? IMG.vaca1 : IMG.galinha1;
    A.base = isVaca ? 128 / IMG.vaca1.width : 58 / IMG.galinha1.width;
    A.spr = add({ img, x: A.x, y: A.y, s: A.base, onTap: () => api.tapAnimal(k), tag: 'animal' + k });
    A.bub = add({ layer: 2, draw: c => drawAnimalBubble(c, A) });
    S.animals.push(A);
  });
  function drawAnimalBubble(c, A) {
    const e = estadoAnimal(api.state(), A.k, agora()), y = A.y - (A.tipo === 'vaca' ? 120 : 64);
    if (e.tipo === 'fome') { if (A.tipo === 'vaca' || A.k % 3 === 2) { c.save(); c.globalAlpha = .95; bubble(c, A.x, y - 10, IMG.i_milho, E.t + A.k); c.restore(); } }
    else if (e.tipo === 'pronto') bubble(c, A.x, y - 10, IMG['i_' + e.produz], E.t + A.k, 'ok');
    else if (e.tipo === 'produzindo' && A.tipo === 'vaca') bar(c, A.x, y + 6, e.progresso, fmtTempo(e.falta));
  }
  function stepAnimal(A, dt) {
    const isVaca = A.tipo === 'vaca';
    A.timer -= dt;
    if (A.mode === 'walk') {
      const dx = A.tx - A.x, dy = A.ty - A.y, d = Math.hypot(dx, dy), sp = (isVaca ? 22 : 48) * dt;
      if (d < 2) { A.mode = 'idle'; A.timer = 1.5 + Math.random() * (isVaca ? 5 : 2.5); }
      else { A.x += dx / d * Math.min(sp, d); A.y += dy / d * Math.min(sp, d); A.dir = dx >= 0 ? 1 : -1; if (!isVaca) A.hop += dt * 14; }
    } else if (A.timer <= 0) {
      const ar = A.area; A.tx = ar.x0 + 40 + Math.random() * (ar.x1 - ar.x0 - 80); A.ty = ar.y0 + 30 + Math.random() * (ar.y1 - ar.y0 - 60);
      A.mode = 'walk';
    }
    const grazing = A.mode === 'idle' && Math.sin(E.t * .7 + A.k * 2) > 0;
    const img = isVaca ? (grazing ? IMG.vaca2 : IMG.vaca1) : (grazing && Math.sin(E.t * 9 + A.k) > .2 ? IMG.galinha2 : IMG.galinha1);
    const faceRight = true;
    A.spr.img = img; A.spr.s = isVaca ? 128 / img.width : 58 / img.width;
    A.spr.flip = (A.dir > 0) !== faceRight;
    A.spr.x = A.x; A.spr.y = A.y - (A.mode === 'walk' && !isVaca ? Math.abs(Math.sin(A.hop)) * 5 : 0);
    A.spr.sy = 1 + (A.mode === 'idle' ? Math.sin(E.t * 2 + A.k) * .012 : 0);
    A.spr.z = A.y;
  }

  /* padaria: canteiro de obra / fumaça / balão */
  const padBub = add({ layer: 2, draw: c => {
    const st = api.state(), e = estadoPadaria(st, agora()), x = S.padaria.x, y = S.padaria.y - 230;
    if (e.tipo === 'fechada') { c.save(); c.font = '800 17px system-ui,-apple-system,sans-serif'; const tx = 'Construir padaria'; const w = c.measureText(tx).width + 28; c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 8; c.fillStyle = 'rgba(255,250,236,.96)'; rr(c, x - w / 2, y + 40, w, 34, 17); c.fill(); c.shadowBlur = 0; c.fillStyle = '#5a3f12'; c.textAlign = 'center'; c.fillText(tx, x, y + 63); c.restore(); }
    else if (e.tipo === 'produzindo') { bar(c, x, y + 50, e.progresso, fmtTempo(e.falta)); smoke(c, x + 52, y + 70); }
    else if (e.tipo === 'pronto') bubble(c, x, y + 40, IMG[PRODUTOS[e.receita].icone], E.t, 'ok');
  } });
  function smoke(c, x, y) { for (let k = 0; k < 4; k++) { const p = ((E.t * .5 + k / 4) % 1); c.fillStyle = `rgba(240,240,240,${.45 * (1 - p)})`; c.beginPath(); c.arc(x + Math.sin(p * 6 + k) * 8, y - p * 60, 8 + p * 14, 0, 7); c.fill(); } }

  /* efeitos: textos subindo (+2 milho) e brilhos */
  S.floatText = (wx, wy, txt, icon) => {
    const o = { t0: E.t, x: wx, y: wy };
    const spr = add({ layer: 3, draw: c => {
      const p = (E.t - o.t0) / 1.3; if (p >= 1) { E.remove(spr); return; }
      const y = o.y - 70 * ease.out(p); c.globalAlpha = p < .75 ? 1 : 1 - (p - .75) / .25;
      c.font = '900 24px system-ui,-apple-system,sans-serif'; c.textAlign = 'center';
      const w = c.measureText(txt).width + (icon ? 34 : 0);
      let x0 = o.x - w / 2;
      if (icon) { const k = 30 / Math.max(icon.width, icon.height); c.drawImage(icon, x0, y - 24, icon.width * k, icon.height * k); x0 += 34; }
      c.lineWidth = 5; c.strokeStyle = 'rgba(40,25,5,.75)'; c.textAlign = 'left'; c.strokeText(txt, x0, y); c.fillStyle = '#fff6c8'; c.fillText(txt, x0, y);
    } });
  };
  S.sparkle = (wx, wy) => {
    const t0 = E.t, parts = Array.from({ length: 14 }, (_, k) => ({ a: k / 14 * 6.28 + Math.random() * .4, v: 50 + Math.random() * 60 }));
    const spr = add({ layer: 3, draw: c => {
      const p = (E.t - t0) / .7; if (p >= 1) { E.remove(spr); return; }
      for (const q of parts) { const d = q.v * ease.out(p); c.globalAlpha = 1 - p; c.fillStyle = '#ffe680'; c.beginPath(); c.arc(wx + Math.cos(q.a) * d, wy + Math.sin(q.a) * d * .6, 4 * (1 - p) + 1, 0, 7); c.fill(); }
    } });
  };
  S.popPlot = i => { const P = S.plots[i]; P.pop = 1; E.tween(P, { pop: 0 }, .45, ease.out); };

  /* atualização por quadro */
  let acc = 0;
  E.onFrame = (t, dt) => {
    if (!E.calmo) for (const w of sway) w.s.rot = Math.sin(t * .8 + w.ph) * .012;
    acc += dt; const st = api.state();
    if (acc > .2) { acc = 0; const now = agora(); for (const P of S.plots) { P.e = estadoCanteiro(st, P.i, now); P.hasPlant = P.e.tipo === 'crescendo' || P.e.tipo === 'pronto'; } api.tick && api.tick(now); }
    for (const A of S.animals) stepAnimal(A, dt);
    const built = st.padaria.construida; S.padaria.alpha = built ? 1 : .55;
  };
  /* luz de fim de tarde e vinheta, por cima de tudo */
  E.after = c => {
    const g = c.createRadialGradient(0, 0, 10, 0, 0, Math.max(E.vw, E.vh) * .9); g.addColorStop(0, 'rgba(255,214,140,.22)'); g.addColorStop(1, 'rgba(255,214,140,0)');
    c.fillStyle = g; c.fillRect(0, 0, E.vw, E.vh);
    const v = c.createRadialGradient(E.vw / 2, E.vh / 2, Math.min(E.vw, E.vh) * .45, E.vw / 2, E.vh / 2, Math.max(E.vw, E.vh) * .8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,30,10,.28)');
    c.fillStyle = v; c.fillRect(0, 0, E.vw, E.vh);
  };
  S.casa = casa; S.celeiro = celeiro;
  return S;
}
