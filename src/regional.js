/* Conecta Fazenda — mapa regional da Serra da Mantiqueira.
   A ilustração é só o fundo (sem textos pintados). Cada cidade tem uma etiqueta pequena em HTML
   com o progresso real do jogo; ela fica sempre do mesmo tamanho na tela, em qualquer zoom.
   Quando o mapa está afastado e as etiquetas não cabem, as de trás viram só o ícone.
   Arrastar com um dedo, pinça com dois, e a barra de baixo vai de cidade em cidade. */
import { REGIOES } from './data.js';

const IMG_W = 1536, IMG_H = 782;
/* ponto de cada cidade na ilustração */
const POS = {
  'sao-bento-do-sapucai': [330, 300], 'sapucai-mirim': [710, 326], 'santo-antonio-do-pinhal': [902, 162],
  'campos-do-jordao': [1250, 102], 'monte-verde': [1408, 280], 'camanducaia': [1097, 372], 'extrema': [1378, 490],
  'paraisopolis': [882, 515], 'goncalves': [603, 617], 'itajuba': [867, 717], 'brasopolis': [1327, 700],
};
const CADEADO = '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#f6eddc"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#f6eddc" stroke-width="2.4"/><circle cx="12" cy="15.5" r="1.6" fill="#123552"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#20c957" stroke="#fff" stroke-width="1.5"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ROTULO = { bloqueada: 'Bloqueada', disponivel: 'Disponível', andamento: 'Em andamento', concluida: 'Concluída', 'em-breve': 'Liberada · em breve' };

export function criaRegional({ st, G, $, aoTocarCidade }) {
  const tela = $('regiao'), cena = $('rgCena'), wrap = $('rgWrap');
  const T = { k: 1, x: 0, y: 0 }, ptr = new Map(); let pinca = null, moveu = false;

  function limites() {
    /* afastar até ver o mapa inteiro; aproximar até 2,6× o tamanho que cobre a tela */
    const W = cena.clientWidth, H = cena.clientHeight, min = Math.min(W / IMG_W, H / IMG_H), cobre = Math.max(W / IMG_W, H / IMG_H);
    return { W, H, min, cobre, max: Math.max(cobre * 2.6, 1.6) };
  }
  function aplica() {
    const L = limites(); T.k = Math.min(L.max, Math.max(L.min, T.k));
    const w = IMG_W * T.k, h = IMG_H * T.k;  // menor que a tela: fica centralizado
    T.x = w <= L.W ? (L.W - w) / 2 : Math.min(0, Math.max(L.W - w, T.x));
    T.y = h <= L.H ? (L.H - h) / 2 : Math.min(0, Math.max(L.H - h, T.y));
    wrap.style.transform = `translate(${T.x}px,${T.y}px) scale(${T.k})`;
    wrap.style.setProperty('--inv', 1 / T.k);
    $('rgIn').disabled = T.k >= L.max - 1e-6; $('rgOut').disabled = T.k <= L.min + 1e-6;
    arruma();
  }
  /* etiquetas não ficam umas sobre as outras: na ordem da campanha, a que não cabe vira só o ícone */
  function arruma() {
    const els = [...wrap.querySelectorAll('.rgCity')]; if (!els.length) return;
    const sel = st().regiaoSel, ordem = els.slice().sort((a, b) => (b.dataset.id === sel) - (a.dataset.id === sel));
    const feitos = [], W = cena.clientWidth, H = cena.clientHeight;
    const fora = r => r.l < 0 || r.t < 0 || r.r > W || r.b > H;
    for (const e of ordem) {
      const [px, py] = POS[e.dataset.id], cx = T.x + px * T.k, cy = T.y + py * T.k;
      e.classList.remove('mini');
      let r = caixa(e, cx, cy);
      if (fora(r) || feitos.some(f => bate(f, r))) { e.classList.add('mini'); r = caixa(e, cx, cy); }
      feitos.push(r);
    }
  }
  const caixa = (e, cx, cy) => { const w = e.offsetWidth, h = e.offsetHeight; return { l: cx - w / 2 - 3, r: cx + w / 2 + 3, t: cy - h / 2 - 3, b: cy + h / 2 + 3 }; };
  const bate = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

  function vaiPara(id, anima) {
    /* em pé mostra um pedaço maior da região (a cidade e as vizinhas); deitado, cobre a tela */
    const L = limites(), [px, py] = POS[id] || [IMG_W / 2, IMG_H / 2];
    T.k = Math.max(L.min, Math.min(L.max, L.W < L.H ? L.W / 700 : L.cobre)); T.x = L.W / 2 - px * T.k; T.y = L.H / 2 - py * T.k;
    if (anima && !matchMedia('(prefers-reduced-motion: reduce)').matches) { wrap.style.transition = 'transform .45s ease'; setTimeout(() => wrap.style.transition = '', 480); }
    aplica();
  }
  function zoom(f, cx, cy) { const L = limites(); cx = cx == null ? L.W / 2 : cx; cy = cy == null ? L.H / 2 : cy; const k = Math.min(L.max, Math.max(L.min, T.k * f)); const wx = (cx - T.x) / T.k, wy = (cy - T.y) / T.k; T.k = k; T.x = cx - wx * k; T.y = cy - wy * k; aplica(); }

  /* etiquetas */
  function desenha() {
    const s = st();
    wrap.querySelectorAll('.rgCity').forEach(e => e.remove());
    for (const r of REGIOES) {
      const e = G.estadoCidade(s, r.id), [x, y] = POS[r.id];
      const ic = e.tipo === 'concluida' ? CHECK : e.tipo === 'bloqueada' ? `<i class="rgLock">${CADEADO}</i>` : `<i class="rgNum">${r.ordem}</i>`;
      wrap.insertAdjacentHTML('beforeend', `<button class="rgCity rg-${e.tipo}${s.regiaoSel === r.id ? ' sel' : ''}" data-id="${r.id}" style="left:${x}px;top:${y}px" aria-label="${r.nome}: ${ROTULO[e.tipo]}, ${e.pct}%"><span class="rgIc">${ic}</span><span class="rgTx"><b>${r.nome}</b><span class="rgBar"><i><u style="width:${e.pct}%"></u></i><em>${e.pct}%</em></span></span></button>`);
    }
    barra(); arruma();
  }
  function barra() {
    const s = st(), i = Math.max(0, REGIOES.findIndex(r => r.id === s.regiaoSel)), r = REGIOES[i], e = G.estadoCidade(s, r.id);
    $('rgNome').querySelector('b').textContent = r.nome;
    $('rgNome').querySelector('small').textContent = `${i + 1} de ${REGIOES.length} · ${e.tipo === 'bloqueada' ? 'Bloqueada' : ROTULO[e.tipo] + (e.pct && e.tipo !== 'concluida' ? ` · ${e.pct}%` : '')}`;
    $('rgAnt').disabled = i === 0; $('rgProx').disabled = i === REGIOES.length - 1;
  }
  function seleciona(id, anima) { st().regiaoSel = id; wrap.querySelectorAll('.rgCity').forEach(e => e.classList.toggle('sel', e.dataset.id === id)); barra(); vaiPara(id, anima); }
  const passo = d => { const i = Math.max(0, REGIOES.findIndex(r => r.id === st().regiaoSel)) + d; if (REGIOES[i]) seleciona(REGIOES[i].id, true); };
  $('rgAnt').onclick = () => passo(-1); $('rgProx').onclick = () => passo(1);
  $('rgNome').onclick = () => aoTocarCidade(st().regiaoSel || REGIOES[0].id);
  wrap.addEventListener('click', ev => { const b = ev.target.closest('.rgCity'); if (!b || moveu) return; st().regiaoSel = b.dataset.id; wrap.querySelectorAll('.rgCity').forEach(e => e.classList.toggle('sel', e === b)); barra(); arruma(); aoTocarCidade(b.dataset.id); });

  /* gestos: um dedo arrasta, dois dedos fazem pinça em volta do ponto entre eles */
  const pos = e => { const r = cena.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const info = () => { const a = [...ptr.values()]; return a.length < 2 ? null : { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2 }; };
  cena.addEventListener('pointerdown', e => { const q = pos(e); ptr.set(e.pointerId, { x: q.x, y: q.y, x0: q.x, y0: q.y }); if (ptr.size === 1) moveu = false; if (ptr.size === 2) { pinca = info(); moveu = true; } });
  cena.addEventListener('pointermove', e => {
    const p = ptr.get(e.pointerId); if (!p) return; const q = pos(e);
    if (ptr.size >= 2 && pinca) { p.x = q.x; p.y = q.y; const n = info(); if (n.d > 0 && pinca.d > 0) { zoom(n.d / pinca.d, pinca.cx, pinca.cy); T.x += n.cx - pinca.cx; T.y += n.cy - pinca.cy; aplica(); } pinca = n; return; }
    const dx = q.x - p.x, dy = q.y - p.y; p.x = q.x; p.y = q.y;
    if (Math.hypot(q.x - p.x0, q.y - p.y0) > 8) moveu = true;
    if (moveu) { T.x += dx; T.y += dy; aplica(); }
  });
  const solta = e => { ptr.delete(e.pointerId); if (ptr.size < 2) pinca = null; };
  cena.addEventListener('pointerup', solta); cena.addEventListener('pointercancel', solta);
  cena.addEventListener('wheel', e => { e.preventDefault(); const q = pos(e); zoom(Math.exp(-Math.max(-60, Math.min(60, e.deltaY)) * .0025), q.x, q.y); }, { passive: false });
  $('rgIn').onclick = () => zoom(1.3); $('rgOut').onclick = () => zoom(1 / 1.3); $('rgCentro').onclick = () => vaiPara(st().regiaoSel || REGIOES[0].id, true);
  window.addEventListener('resize', () => { if (!tela.classList.contains('hidden')) aplica(); });

  return {
    abrir() { tela.classList.remove('hidden'); if (!st().regiaoSel) st().regiaoSel = REGIOES[0].id; desenha(); vaiPara(st().regiaoSel); },
    fechar() { tela.classList.add('hidden'); },
    atualiza() { if (!tela.classList.contains('hidden')) desenha(); },
    get T() { return T; }, POS,
  };
}
