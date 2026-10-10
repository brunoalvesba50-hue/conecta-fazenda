/* Conecta Fazenda — mapa regional da Serra da Mantiqueira.
   A ilustração é só o fundo; as etiquetas das cidades (nome, %, barra, cadeado) são HTML por cima,
   com o progresso real calculado do jogo. Arrastar com um dedo e pinça com dois dedos. */
import { REGIOES } from './data.js';

const IMG_W = 1536, IMG_H = 782;
/* centro de cada etiqueta na ilustração (cobre os textos que vieram pintados na arte de referência) */
const BOX = { // caixa [x0, y0, x1, y1] de cada texto pintado na arte; a etiqueta cobre a caixa inteira
  'sao-bento-do-sapucai': [192, 200, 468, 422], 'sapucai-mirim': [572, 254, 848, 398], 'santo-antonio-do-pinhal': [732, 92, 1073, 233],
  'campos-do-jordao': [1127, 42, 1373, 163], 'monte-verde': [1297, 222, 1518, 338], 'camanducaia': [977, 312, 1218, 433], 'extrema': [1257, 432, 1498, 548],
  'paraisopolis': [757, 452, 1008, 578], 'goncalves': [477, 557, 730, 678], 'itajuba': [747, 657, 988, 778], 'brasopolis': [1207, 642, 1448, 758],
};
const POS = Object.fromEntries(Object.entries(BOX).map(([k, b]) => [k, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]]));
const CADEADO = '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="#f6eddc"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="#f6eddc" stroke-width="2.4"/><circle cx="12" cy="15.5" r="1.6" fill="#123552"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#20c957"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ROTULO = { bloqueada: 'Bloqueada', disponivel: 'Disponível', andamento: 'Em andamento', concluida: 'Concluída', 'em-breve': 'Em breve' };

export function criaRegional({ st, G, $, aoTocarCidade }) {
  const tela = $('regiao'), cena = $('rgCena'), wrap = $('rgWrap');
  const T = { k: 1, x: 0, y: 0 }, ptr = new Map(); let pinca = null, moveu = false;

  function limites() {
    const W = cena.clientWidth, H = cena.clientHeight, min = Math.max(W / IMG_W, H / IMG_H);
    return { W, H, min, max: min * 2.6 };
  }
  function aplica() {
    const L = limites(); T.k = Math.min(L.max, Math.max(L.min, T.k));
    T.x = Math.min(0, Math.max(L.W - IMG_W * T.k, T.x)); T.y = Math.min(0, Math.max(L.H - IMG_H * T.k, T.y));
    wrap.style.transform = `translate(${T.x}px,${T.y}px) scale(${T.k})`;
  }
  function centra(id) { const L = limites(), [px, py] = POS[id] || [IMG_W / 2, IMG_H / 2]; T.k = Math.max(L.min, Math.min(L.max, L.min * 1.15)); T.x = L.W / 2 - px * T.k; T.y = L.H / 2 - py * T.k; aplica(); }
  function zoom(f, cx, cy) { const L = limites(); cx = cx == null ? L.W / 2 : cx; cy = cy == null ? L.H / 2 : cy; const k = Math.min(L.max, Math.max(L.min, T.k * f)); const wx = (cx - T.x) / T.k, wy = (cy - T.y) / T.k; T.k = k; T.x = cx - wx * k; T.y = cy - wy * k; aplica(); }

  /* etiquetas */
  function desenha() {
    const s = st();
    wrap.querySelectorAll('.rgCity').forEach(e => e.remove());
    for (const r of REGIOES) {
      const e = G.estadoCidade(s, r.id), [x0, y0, x1, y1] = BOX[r.id];
      const req = e.tipo === 'bloqueada' ? `Desbloqueie após concluir ${e.requisito}` : e.tipo === 'em-breve' ? 'Área jogável em breve' : ROTULO[e.tipo];
      const ic = e.tipo === 'concluida' ? CHECK : e.tipo === 'bloqueada' ? `<i class="rgLock">${CADEADO}</i>` : `<i class="rgNum">${r.ordem}</i>`;
      wrap.insertAdjacentHTML('beforeend', `<button class="rgCity rg-${e.tipo}${s.regiaoSel === r.id ? ' sel' : ''}" data-id="${r.id}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px"><span class="rgIc">${ic}</span><span class="rgTx"><b>${r.nome}</b><span class="rgBar"><i style="width:${e.pct}%"></i><em>${e.pct}%</em></span><small>${req}</small></span></button>`);
    }
  }
  wrap.addEventListener('click', ev => { const b = ev.target.closest('.rgCity'); if (!b || moveu) return; st().regiaoSel = b.dataset.id; desenha(); aoTocarCidade(b.dataset.id); });

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
  $('rgIn').onclick = () => zoom(1.3); $('rgOut').onclick = () => zoom(1 / 1.3); $('rgCentro').onclick = () => centra(st().regiaoSel || 'sao-bento-do-sapucai');
  window.addEventListener('resize', () => { if (!tela.classList.contains('hidden')) aplica(); });

  return {
    abrir() { tela.classList.remove('hidden'); desenha(); centra('sao-bento-do-sapucai'); },
    fechar() { tela.classList.add('hidden'); },
    atualiza() { if (!tela.classList.contains('hidden')) desenha(); },
    get T() { return T; }, POS,
  };
}
