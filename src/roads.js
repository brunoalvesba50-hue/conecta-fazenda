/* Conecta Fazenda — rede de estradas de terra.
   As estradas são uma rede: PONTOS (portas, cruzamentos, saídas) ligados por TRECHOS.
   Cada trecho começa e termina num ponto, então não há pontas soltas nem trechos duplicados.
   O desenho é feito em camadas para a rede inteira (primeiro todas as bordas, depois todo o
   preenchimento), assim um trecho nunca risca o outro e os cruzamentos ficam limpos. */

export const LARGURA = 44;

/* pontos da rede (coordenadas do mundo) */
export const PONTOS = {
  casa:      { x: 640,  y: 846, tipo: 'porta' },      // varanda da casa
  cruzCasa:  { x: 722,  y: 906, tipo: 'cruzamento' },
  cruzPoco:  { x: 1000, y: 888, tipo: 'cruzamento' },
  cruzCel:   { x: 1262, y: 892, tipo: 'cruzamento' },
  celeiro:   { x: 1262, y: 846, tipo: 'porta' },      // portão do celeiro
  cruzLeste: { x: 1420, y: 902, tipo: 'cruzamento' },
  padaria:   { x: 1598, y: 946, tipo: 'porta' },
  cruzGal:   { x: 604,  y: 1132, tipo: 'cruzamento' },
  galinheiro:{ x: 424,  y: 1104, tipo: 'porta' },
  cruzSul:   { x: 598,  y: 1262, tipo: 'cruzamento' },
  cruzBaixo: { x: 628,  y: 1540, tipo: 'cruzamento' },
  pomar:     { x: 1000, y: 1628, tipo: 'porta' },      // porteira do pomar
  lago:      { x: 470,  y: 1716, tipo: 'porta' },      // mirante do lago na mata
  saida:     { x: 640,  y: 2400, tipo: 'saida' },      // segue para a cidade (fora do mapa)
  pasto:     { x: 1446, y: 1300, tipo: 'porta' },      // porteira do pasto
};

/* trechos: de → até, com pontos intermediários para a curva (sem repetir trechos) */
export const TRECHOS = [
  { de: 'casa',      ate: 'cruzCasa',  via: [[680, 880]] },
  { de: 'cruzCasa',  ate: 'cruzPoco',  via: [[860, 896]] },
  { de: 'cruzPoco',  ate: 'cruzCel',   via: [[1130, 886]] },
  { de: 'cruzCel',   ate: 'celeiro',   via: [] },
  { de: 'cruzCel',   ate: 'cruzLeste', via: [[1342, 896]] },
  { de: 'cruzLeste', ate: 'padaria',   via: [[1510, 918]] },
  { de: 'cruzCasa',  ate: 'cruzGal',   via: [[668, 990], [622, 1066]] },
  { de: 'cruzGal',   ate: 'galinheiro',via: [[520, 1124]] },
  { de: 'cruzGal',   ate: 'cruzSul',   via: [[592, 1198]] },
  { de: 'cruzSul',   ate: 'cruzBaixo', via: [[612, 1340], [620, 1440]] },
  { de: 'cruzBaixo', ate: 'pomar',     via: [[760, 1588], [890, 1612]] },
  { de: 'cruzBaixo', ate: 'lago',      via: [[560, 1612]] },
  { de: 'cruzBaixo', ate: 'saida',     via: [[664, 1720], [668, 1900], [646, 2060], [626, 2230]] },
  { de: 'cruzSul',   ate: 'pasto',     via: [[760, 1292], [1000, 1312], [1240, 1306]] },
];

/* Catmull-Rom: curva suave passando por todos os pontos */
function suaviza(pts, passo = 6) {
  if (pts.length < 3) {
    const [a, b] = pts, n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / passo)), out = [];
    for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    return out;
  }
  const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / passo));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => .5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* geometria pronta de cada trecho (lista de pontos ao longo da curva) */
export function geometria() {
  return TRECHOS.map(t => {
    const a = PONTOS[t.de], b = PONTOS[t.ate];
    return { de: t.de, ate: t.ate, pts: suaviza([[a.x, a.y], ...t.via, [b.x, b.y]]) };
  });
}

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* desenha a rede inteira num contexto (o do chão); oy = deslocamento vertical do chão */
export function desenhaEstradas(c, oy = 0) {
  const G = geometria(), W = LARGURA, r = rng(11);
  const traço = (larg, cor, alfa = 1, blur = 0) => {
    c.save(); c.globalAlpha = alfa; c.strokeStyle = cor; c.lineWidth = larg; c.lineCap = 'round'; c.lineJoin = 'round';
    if (blur) c.filter = `blur(${blur}px)`;
    c.beginPath();
    for (const g of G) { c.moveTo(g.pts[0][0], g.pts[0][1] - oy); for (const p of g.pts) c.lineTo(p[0], p[1] - oy); }
    c.stroke(); c.restore();
  };
  /* 1) sombra suave na grama  2) acostamento  3) terra  4) faixa central mais clara (sol) */
  traço(W + 18, 'rgba(48,40,8,1)', .22, 5);
  traço(W + 6, '#7d5a2e', 1);
  traço(W, '#b98953', 1);
  traço(W * .56, '#cfa169', .55);
  /* 5) marcas de roda: duas trilhas paralelas em cada trecho (somam bem nos cruzamentos) */
  c.save(); c.strokeStyle = 'rgba(120,82,40,.35)'; c.lineWidth = 3; c.lineCap = 'round';
  for (const g of G) for (const off of [-9, 9]) {
    c.beginPath(); let started = false;
    for (let i = 1; i < g.pts.length - 1; i++) {
      const [x0, y0] = g.pts[i - 1], [x1, y1] = g.pts[i + 1], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      const x = g.pts[i][0] - dy / L * off, y = g.pts[i][1] + dx / L * off - oy;
      /* some perto das pontas, para não riscar cruzamentos e portas */
      const ini = Math.hypot(g.pts[i][0] - g.pts[0][0], g.pts[i][1] - g.pts[0][1]), fim = Math.hypot(g.pts[i][0] - g.pts[g.pts.length - 1][0], g.pts[i][1] - g.pts[g.pts.length - 1][1]);
      if (ini < W * .8 || fim < W * .8) { started = false; continue; }
      if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.restore();
  /* 6) pedrinhas e torrões espalhados (sempre dentro da estrada) */
  for (const g of G) for (let i = 0; i < g.pts.length; i += 2) {
    const [x, y] = g.pts[i];
    for (let k = 0; k < 2; k++) {
      const a = r() * 6.28, d = r() * W * .42, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * .8 - oy;
      c.fillStyle = r() < .5 ? 'rgba(235,205,160,.55)' : 'rgba(110,75,35,.4)';
      c.beginPath(); c.ellipse(px, py, 1.5 + r() * 2.2, 1 + r() * 1.5, 0, 0, 7); c.fill();
    }
  }
  /* 7) tufos de grama na borda, para a estrada "entrar" no chão (não flutuar); nada perto dos cruzamentos */
  const nos = Object.values(PONTOS);
  const pertoDeNo = (x, y) => nos.some(n => Math.hypot(n.x - x, n.y - y) < W * 1.3);
  c.save(); c.lineCap = 'round';
  for (const g of G) for (let i = 1; i < g.pts.length - 1; i += 3) {
    const [x0, y0] = g.pts[i - 1], [x1, y1] = g.pts[i + 1], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    for (const lado of [-1, 1]) {
      if (r() < .35) continue;
      if (pertoDeNo(g.pts[i][0], g.pts[i][1])) continue;
      const bx = g.pts[i][0] - dy / L * (W / 2 + 1) * lado, by = g.pts[i][1] + dx / L * (W / 2 + 1) * lado - oy;
      for (let k = 0; k < 3; k++) { c.strokeStyle = r() < .5 ? '#5f7f12' : '#86a52a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(bx + (r() - .5) * 6, by); c.lineTo(bx + (r() - .5) * 8, by - 4 - r() * 6); c.stroke(); }
    }
  }
  c.restore();
}
