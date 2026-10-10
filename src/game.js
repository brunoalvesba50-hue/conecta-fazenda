/* Conecta Fazenda — regras do jogo (sem desenho). Cada ação muda o estado e devolve {ok, msg}.
   Tudo usa o relógio real (Date.now), então as plantas crescem mesmo com o jogo fechado. */
import { CULTURAS, PRODUTOS, ANIMAIS, RECEITAS, TERRENOS, CELEIRO, PADARIA, NIVEIS, BONUS_NIVEL, MISSOES, ENTREGAS_NOMES, VERSAO_SAVE, REGIAO, CASAS, REGIOES, OBJETIVOS, PREMIO_CIDADE } from './data.js';

export const agora = () => Date.now();

export function novoJogo(now = agora()) {
  const st = {
    v: VERSAO_SAVE, criado: now, atualizado: now, regiao: REGIAO.id,
    moedas: 100, xp: 0, nivel: 1,
    sementes: { milho: 6, alface: 2 },
    celeiro: { itens: { milho: 4 }, melhoria: 0 }, // um pouco de milho guardado: dá para alimentar e vender já no tutorial
    canteiros: TERRENOS.map((t, i) => ({ liberado: t.custo === 0, cultura: null, plantadoEm: 0 })),
    animais: [
      { tipo: 'vaca', comeuEm: 0 }, { tipo: 'vaca', comeuEm: 0 },
      { tipo: 'galinha', comeuEm: 0 }, { tipo: 'galinha', comeuEm: 0 }, { tipo: 'galinha', comeuEm: 0 },
    ],
    padaria: { construida: false, fila: null },
    cont: {},
    missao: { idx: 0, base: 0 },
    entregas: [],
    casas: {},
    cidades: {},          /* cidades concluídas: { id: { em: data, premio: true } } */
    tut: { passo: 0, fim: false },
  };
  /* para começar já com algo para colher: um milho pronto e uma alface crescendo */
  st.canteiros[1].cultura = 'milho'; st.canteiros[1].plantadoEm = now - 61000;
  st.canteiros[2].cultura = 'alface'; st.canteiros[2].plantadoEm = now - 15000;
  repoeEntregas(st);
  return st;
}

/* ---------- utilidades ---------- */
const ok = (msg, extra) => Object.assign({ ok: true, msg }, extra || {});
const erro = msg => ({ ok: false, msg });
export const capCeleiro = st => st.celeiro.melhoria ? CELEIRO.melhorias[st.celeiro.melhoria - 1].cap : CELEIRO.capInicial;
export const usoCeleiro = st => Object.values(st.celeiro.itens).reduce((a, b) => a + b, 0);
export const temItens = (st, req) => Object.entries(req).every(([k, q]) => (st.celeiro.itens[k] || 0) >= q);
function tiraItens(st, req) { for (const [k, q] of Object.entries(req)) { st.celeiro.itens[k] -= q; if (!st.celeiro.itens[k]) delete st.celeiro.itens[k]; } }
function poeItem(st, k, q) { st.celeiro.itens[k] = (st.celeiro.itens[k] || 0) + q; }
function conta(st, tipo, alvo, q = 1) {
  const c = st.cont[tipo] || (st.cont[tipo] = {});
  c[alvo] = (c[alvo] || 0) + q; c['*'] = (c['*'] || 0) + q;
}
const lido = (st, tipo, alvo) => ((st.cont[tipo] || {})[alvo]) || 0;

export function ganhaXp(st, q) {
  st.xp += q; const subiu = [];
  while (st.nivel < NIVEIS.length - 1 && st.xp >= NIVEIS[st.nivel + 1]) {
    st.nivel++; const b = BONUS_NIVEL(st.nivel); st.moedas += b; subiu.push({ nivel: st.nivel, bonus: b });
  }
  return subiu;
}
export function xpDoNivel(st) {
  const a = NIVEIS[st.nivel] || 0, b = NIVEIS[st.nivel + 1];
  if (b === undefined) return { atual: 1, total: 1, max: true };
  return { atual: st.xp - a, total: b - a, max: false };
}

/* ---------- plantações ---------- */
export function estadoCanteiro(st, i, now = agora()) {
  const c = st.canteiros[i];
  if (!c) return { tipo: 'nada' };
  if (!c.liberado) return { tipo: 'bloqueado', custo: TERRENOS[i].custo, nivel: TERRENOS[i].nivel };
  if (!c.cultura) return { tipo: 'vazio' };
  const cu = CULTURAS[c.cultura], dur = cu.tempo * 1000, pass = Math.max(0, now - c.plantadoEm);
  const p = Math.min(1, pass / dur);
  const fase = p >= 1 ? cu.stages : Math.min(cu.stages - 1, 1 + Math.floor(p * (cu.stages - 1)));
  return { tipo: p >= 1 ? 'pronto' : 'crescendo', cultura: c.cultura, progresso: p, fase, falta: Math.max(0, Math.ceil((dur - pass) / 1000)) };
}

export function plantar(st, i, cultura, now = agora()) {
  const c = st.canteiros[i], cu = CULTURAS[cultura];
  if (!c || !cu) return erro('Canteiro inválido.');
  if (!c.liberado) return erro('Este canteiro ainda está fechado.');
  if (c.cultura) return erro('Este canteiro já está plantado.');
  if (st.nivel < cu.nivel) return erro(`${cu.nome} libera no nível ${cu.nivel}.`);
  if (!(st.sementes[cultura] > 0)) return erro(`Sem sementes de ${cu.nome.toLowerCase()}.`);
  st.sementes[cultura]--; if (!st.sementes[cultura]) delete st.sementes[cultura];
  c.cultura = cultura; c.plantadoEm = now;
  conta(st, 'plantar', cultura);
  return ok(`${cu.nome} plantado!`);
}

export function colher(st, i, now = agora()) {
  const e = estadoCanteiro(st, i, now);
  if (e.tipo !== 'pronto') return erro(e.tipo === 'crescendo' ? `Ainda falta ${fmtTempo(e.falta)}.` : 'Nada para colher aqui.');
  const cu = CULTURAS[e.cultura];
  if (usoCeleiro(st) + cu.rende > capCeleiro(st)) return erro('O celeiro está cheio. Venda ou melhore o celeiro.');
  poeItem(st, e.cultura, cu.rende);
  const c = st.canteiros[i]; c.cultura = null; c.plantadoEm = 0;
  conta(st, 'colher', e.cultura, cu.rende);
  const subiu = ganhaXp(st, cu.xp);
  return ok(`+${cu.rende} ${cu.nome.toLowerCase()}`, { item: e.cultura, qtd: cu.rende, xp: cu.xp, subiu });
}

export function colherTudo(st, now = agora()) {
  const res = []; let cheio = false;
  st.canteiros.forEach((c, i) => { if (estadoCanteiro(st, i, now).tipo === 'pronto') { const r = colher(st, i, now); if (r.ok) res.push(Object.assign({ i }, r)); else cheio = true; } });
  if (!res.length) return erro(cheio ? 'O celeiro está cheio. Venda ou melhore o celeiro.' : 'Nenhuma plantação pronta ainda.');
  return ok(`Colheu ${res.reduce((a, r) => a + r.qtd, 0)} itens`, { res, cheio });
}

export function comprarSemente(st, cultura, qtd = 1) {
  const cu = CULTURAS[cultura]; if (!cu) return erro('Semente inválida.');
  if (st.nivel < cu.nivel) return erro(`${cu.nome} libera no nível ${cu.nivel}.`);
  const preco = cu.semente * qtd;
  if (st.moedas < preco) return erro('Moedas insuficientes. Venda produtos ou faça entregas.');
  st.moedas -= preco; st.sementes[cultura] = (st.sementes[cultura] || 0) + qtd;
  return ok(`+${qtd} semente${qtd > 1 ? 's' : ''} de ${cu.nome.toLowerCase()}`);
}

/* ---------- celeiro ---------- */
export function vender(st, item, qtd = 1) {
  const p = PRODUTOS[item]; const tem = st.celeiro.itens[item] || 0;
  if (!p || tem <= 0) return erro('Você não tem esse produto.');
  qtd = Math.max(1, Math.min(qtd, tem));
  tiraItens(st, { [item]: qtd }); const v = p.venda * qtd; st.moedas += v;
  conta(st, 'vender', item, qtd);
  return ok(`+${v} moedas`, { moedas: v });
}

export function melhorarCeleiro(st) {
  const m = CELEIRO.melhorias[st.celeiro.melhoria];
  if (!m) return erro('O celeiro já está no máximo.');
  if (st.nivel < m.nivel) return erro(`Melhoria libera no nível ${m.nivel}.`);
  if (st.moedas < m.custo) return erro('Moedas insuficientes.');
  st.moedas -= m.custo; st.celeiro.melhoria++;
  conta(st, 'construir', 'celeiro'); const subiu = ganhaXp(st, 10);
  return ok(`Celeiro agora guarda ${m.cap} itens!`, { subiu });
}

export function liberarCanteiro(st, i) {
  const c = st.canteiros[i], t = TERRENOS[i];
  if (!c || c.liberado) return erro('Este canteiro já está liberado.');
  if (st.nivel < t.nivel) return erro(`Este canteiro libera no nível ${t.nivel}.`);
  if (st.moedas < t.custo) return erro('Moedas insuficientes.');
  st.moedas -= t.custo; c.liberado = true;
  conta(st, 'liberar', 'canteiro'); const subiu = ganhaXp(st, 8);
  return ok('Novo canteiro liberado!', { subiu });
}

/* ---------- animais ---------- */
export function estadoAnimal(st, k, now = agora()) {
  const a = st.animais[k]; if (!a) return { tipo: 'nada' };
  const d = ANIMAIS[a.tipo];
  if (!a.comeuEm) return { tipo: 'fome' };
  const pass = now - a.comeuEm, dur = d.tempo * 1000;
  if (pass >= dur) return { tipo: 'pronto', produz: d.produz };
  return { tipo: 'produzindo', progresso: pass / dur, falta: Math.ceil((dur - pass) / 1000) };
}
export function alimentar(st, k, now = agora()) {
  const a = st.animais[k]; if (!a) return erro('Animal inválido.');
  const e = estadoAnimal(st, k, now), d = ANIMAIS[a.tipo];
  if (e.tipo === 'pronto') return coletar(st, k, now);
  if (e.tipo === 'produzindo') return erro(`${d.nome} está satisfeita. Falta ${fmtTempo(e.falta)}.`);
  if (!temItens(st, d.come)) { const [it, q] = Object.entries(d.come)[0]; return erro(`Precisa de ${q} ${PRODUTOS[it].nome.toLowerCase()} no celeiro.`); }
  tiraItens(st, d.come); a.comeuEm = now; conta(st, 'alimentar', a.tipo);
  return ok(`${d.nome} alimentada!`);
}
export function coletar(st, k, now = agora()) {
  const a = st.animais[k], d = a && ANIMAIS[a.tipo];
  if (!d || estadoAnimal(st, k, now).tipo !== 'pronto') return erro('Ainda não está pronto.');
  if (usoCeleiro(st) + d.qtd > capCeleiro(st)) return erro('O celeiro está cheio.');
  poeItem(st, d.produz, d.qtd); a.comeuEm = 0; conta(st, 'coletar', d.produz, d.qtd);
  const subiu = ganhaXp(st, d.xp);
  return ok(`+${d.qtd} ${PRODUTOS[d.produz].nome.toLowerCase()}`, { item: d.produz, qtd: d.qtd, subiu });
}

/* ---------- padaria (produção) ---------- */
export function construirPadaria(st) {
  if (st.padaria.construida) return erro('A padaria já está construída.');
  if (st.nivel < PADARIA.nivel) return erro(`A padaria libera no nível ${PADARIA.nivel}.`);
  if (st.moedas < PADARIA.custo) return erro('Moedas insuficientes.');
  st.moedas -= PADARIA.custo; st.padaria.construida = true;
  conta(st, 'construir', 'padaria'); const subiu = ganhaXp(st, 15);
  return ok('Padaria da Fazenda construída!', { subiu });
}
export function estadoPadaria(st, now = agora()) {
  const f = st.padaria.fila; if (!st.padaria.construida) return { tipo: 'fechada' };
  if (!f) return { tipo: 'livre' };
  const r = RECEITAS[f.receita], dur = r.tempo * 1000, pass = now - f.inicio;
  if (pass >= dur) return { tipo: 'pronto', receita: f.receita };
  return { tipo: 'produzindo', receita: f.receita, progresso: pass / dur, falta: Math.ceil((dur - pass) / 1000) };
}
export function produzir(st, receita, now = agora()) {
  const r = RECEITAS[receita]; if (!r) return erro('Receita inválida.');
  if (!st.padaria.construida) return erro('Construa a padaria primeiro.');
  if (st.padaria.fila) return erro('A padaria já está produzindo.');
  if (!temItens(st, r.usa)) return erro('Faltam ingredientes no celeiro.');
  tiraItens(st, r.usa); st.padaria.fila = { receita, inicio: now };
  return ok(`Produzindo ${r.nome.toLowerCase()}…`);
}
export function coletarProducao(st, now = agora()) {
  const e = estadoPadaria(st, now); if (e.tipo !== 'pronto') return erro('Ainda não está pronto.');
  const r = RECEITAS[e.receita];
  if (usoCeleiro(st) + r.qtd > capCeleiro(st)) return erro('O celeiro está cheio.');
  poeItem(st, e.receita, r.qtd); st.padaria.fila = null; conta(st, 'produzir', e.receita, r.qtd);
  const subiu = ganhaXp(st, r.xp);
  return ok(`+${r.qtd} ${r.nome.toLowerCase()}`, { item: e.receita, qtd: r.qtd, subiu });
}

/* ---------- entregas ---------- */
function disponiveis(st) {
  const l = Object.keys(CULTURAS).filter(k => CULTURAS[k].nivel <= st.nivel);
  l.push('ovo', 'leite'); return l;
}
export function novaEntrega(st, rnd = Math.random) {
  const pode = disponiveis(st), pede = {};
  const n = st.nivel >= 2 && rnd() < 0.5 ? 2 : 1;
  for (let j = 0; j < n; j++) { const it = pode[Math.floor(rnd() * pode.length)]; pede[it] = (pede[it] || 0) + 2 + Math.floor(rnd() * 3); }
  const valor = Object.entries(pede).reduce((a, [k, q]) => a + PRODUTOS[k].venda * q, 0);
  return { id: 'e' + Math.floor(rnd() * 1e9).toString(36), nome: ENTREGAS_NOMES[Math.floor(rnd() * ENTREGAS_NOMES.length)], pede, moedas: Math.round(valor * 1.5), xp: 5 + Math.round(valor / 6) };
}
export function repoeEntregas(st) { while (st.entregas.length < 3) st.entregas.push(novaEntrega(st)); }
export function entregar(st, idx) {
  const e = st.entregas[idx]; if (!e) return erro('Entrega inválida.');
  if (!temItens(st, e.pede)) return erro('Faltam produtos no celeiro para esta entrega.');
  tiraItens(st, e.pede); st.moedas += e.moedas; conta(st, 'entregar', 'pedido');
  const subiu = ganhaXp(st, e.xp); st.entregas.splice(idx, 1); repoeEntregas(st);
  return ok(`Entrega feita! +${e.moedas} moedas`, { moedas: e.moedas, xp: e.xp, subiu });
}
export function trocarEntrega(st, idx) { if (!st.entregas[idx]) return erro('Entrega inválida.'); st.entregas[idx] = novaEntrega(st); return ok('Novo pedido'); }

/* ---------- missões ---------- */
export function missaoAtual(st) {
  const m = MISSOES[st.missao.idx]; if (!m) return null;
  const feito = Math.max(0, lido(st, m.tipo, m.alvo) - st.missao.base);
  return Object.assign({}, m, { feito: Math.min(m.qtd, feito), completa: feito >= m.qtd });
}
export function iniciarMissao(st) { const m = MISSOES[st.missao.idx]; st.missao.base = m ? lido(st, m.tipo, m.alvo) : 0; }
export function resgatarMissao(st) {
  const m = missaoAtual(st); if (!m) return erro('Todas as missões concluídas!');
  if (!m.completa) return erro('Missão ainda não concluída.');
  st.moedas += m.moedas; const subiu = ganhaXp(st, m.xp);
  st.missao.idx++; iniciarMissao(st);
  return ok(`Missão concluída! +${m.moedas} moedas`, { moedas: m.moedas, xp: m.xp, subiu });
}

export function fmtTempo(s) { s = Math.max(0, Math.ceil(s)); if (s < 60) return s + 's'; const m = Math.floor(s / 60), r = s % 60; if (m < 60) return r ? `${m}min ${r}s` : `${m}min`; const h = Math.floor(m / 60); return `${h}h ${m % 60}min`; }

/* ---------- casas da vila ---------- */
export function construirCasa(st, id) {
  const c = CASAS.find(x => x.id === id); if (!c) return erro('Casa inválida.');
  if (st.casas[id]) return erro('Essa casa já foi construída.');
  if (st.nivel < c.nivel) return erro(`${c.nome} libera no nível ${c.nivel}.`);
  if (st.moedas < c.custo) return erro('Moedas insuficientes.');
  st.moedas -= c.custo; st.casas[id] = true; conta(st, 'construir', 'casa');
  const subiu = ganhaXp(st, c.xp);
  return ok(`${c.nome} construída!`, { subiu });
}
export const casasFeitas = st => CASAS.filter(c => st.casas[c.id]).length;

/* ---------- campanha das cidades ---------- */
export function objetivos(st, regiao) {
  return (OBJETIVOS[regiao] || []).map(o => {
    let v = 0;
    if (o.tipo === 'cont') v = lido(st, o.chave[0], o.chave[1]);
    else if (o.tipo === 'padaria') v = st.padaria.construida ? 1 : 0;
    else if (o.tipo === 'casas') v = casasFeitas(st);
    else if (o.tipo === 'nivel') v = st.nivel;
    return Object.assign({}, o, { feito: Math.min(o.qtd, v), ok: v >= o.qtd });
  });
}
export function progressoCidade(st, regiao) {
  const ob = objetivos(st, regiao); if (!ob.length) return { pct: 0, feitos: 0, total: 0, completa: false };
  const f = ob.filter(o => o.ok).length; return { pct: Math.round(f / ob.length * 100), feitos: f, total: ob.length, completa: f === ob.length };
}
/* liberada = a cidade anterior está 100% (pelos objetivos calculados), não por um número salvo */
export function estadoCidade(st, id) {
  const r = REGIOES.find(x => x.id === id); if (!r) return { tipo: 'nada' };
  const anterior = r.depois && REGIOES.find(x => x.id === r.depois);
  const liberada = !anterior || (OBJETIVOS[anterior.id] ? progressoCidade(st, anterior.id).completa && !!st.cidades[anterior.id] : false);
  const temArea = !!OBJETIVOS[id];
  if (!liberada) return { tipo: 'bloqueada', requisito: anterior.nome, pct: 0 };
  const p = progressoCidade(st, id);
  if (!temArea) return { tipo: 'em-breve', pct: 0 };
  if (p.completa) return { tipo: 'concluida', pct: 100 };
  return { tipo: p.feitos ? 'andamento' : 'disponivel', pct: p.pct };
}
/* entrega o prêmio de cidade concluída uma única vez */
export function concluirCidade(st, id, now = agora()) {
  if (!progressoCidade(st, id).completa) return erro('Ainda faltam objetivos nesta cidade.');
  if (st.cidades[id] && st.cidades[id].premio) return erro('Prêmio já recebido.');
  st.cidades[id] = { em: now, premio: true }; st.moedas += PREMIO_CIDADE.moedas;
  const subiu = ganhaXp(st, PREMIO_CIDADE.xp);
  const prox = REGIOES.find(r => r.depois === id);
  return ok('Cidade concluída!', { moedas: PREMIO_CIDADE.moedas, xp: PREMIO_CIDADE.xp, proxima: prox && prox.nome, subiu });
}
