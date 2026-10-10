/* Conecta Fazenda — salvar e carregar o progresso neste aparelho.
   Nesta fase o progresso fica só no navegador (localStorage), sem senha e sem dados pessoais.
   Ao carregar, tudo é conferido: valores estranhos ou corrompidos são corrigidos. */
import { VERSAO_SAVE, CULTURAS, PRODUTOS, ANIMAIS, RECEITAS, TERRENOS, CELEIRO, NIVEIS, MISSOES, CASAS, REGIOES, OBJETIVOS } from './data.js';
import { novoJogo, repoeEntregas, agora } from './game.js';

const CHAVE = 'conecta_fazenda_save_v1';
const BACKUP = 'conecta_fazenda_backup';

const int = (v, min, max, def) => { v = Number(v); if (!Number.isFinite(v)) return def; v = Math.floor(v); return Math.min(max, Math.max(min, v)); };
const obj = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

/* confere e corrige um estado vindo do armazenamento */
export function sanear(raw, now = agora()) {
  const base = novoJogo(now); if (!raw || typeof raw !== 'object') return base;
  const st = base;
  st.criado = int(raw.criado, 0, now, now);
  st.moedas = int(raw.moedas, 0, 1e9, base.moedas);
  st.xp = int(raw.xp, 0, 1e9, 0);
  st.nivel = 1; while (st.nivel < NIVEIS.length - 1 && st.xp >= NIVEIS[st.nivel + 1]) st.nivel++;
  st.sementes = {}; for (const [k, q] of Object.entries(obj(raw.sementes))) if (CULTURAS[k]) { const n = int(q, 0, 9999, 0); if (n) st.sementes[k] = n; }
  const cel = obj(raw.celeiro); st.celeiro.melhoria = int(cel.melhoria, 0, CELEIRO.melhorias.length, 0);
  st.celeiro.itens = {}; for (const [k, q] of Object.entries(obj(cel.itens))) if (PRODUTOS[k]) { const n = int(q, 0, 99999, 0); if (n) st.celeiro.itens[k] = n; }
  if (Array.isArray(raw.canteiros)) st.canteiros = TERRENOS.map((t, i) => {
    const c = obj(raw.canteiros[i]); const lib = t.custo === 0 || c.liberado === true;
    const cult = lib && CULTURAS[c.cultura] ? c.cultura : null;
    return { liberado: lib, cultura: cult, plantadoEm: cult ? int(c.plantadoEm, 0, now, now) : 0 };
  });
  if (Array.isArray(raw.animais)) st.animais = base.animais.map((a, k) => { const r = obj(raw.animais[k]); return { tipo: a.tipo, comeuEm: int(r.comeuEm, 0, now, 0) }; });
  const pd = obj(raw.padaria); st.padaria = { construida: pd.construida === true, fila: null };
  const f = obj(pd.fila); if (st.padaria.construida && RECEITAS[f.receita]) st.padaria.fila = { receita: f.receita, inicio: int(f.inicio, 0, now, now) };
  st.cont = {}; for (const [t, m] of Object.entries(obj(raw.cont))) { st.cont[t] = {}; for (const [k, q] of Object.entries(obj(m))) st.cont[t][k] = int(q, 0, 1e9, 0); }
  const ms = obj(raw.missao); st.missao = { idx: int(ms.idx, 0, MISSOES.length, 0), base: int(ms.base, 0, 1e9, 0) };
  st.entregas = Array.isArray(raw.entregas) ? raw.entregas.slice(0, 3).filter(e => e && Object.keys(obj(e.pede)).length && Object.keys(obj(e.pede)).every(k => PRODUTOS[k])).map(e => ({
    id: String(e.id || '').slice(0, 20), nome: String(e.nome || 'Vizinho').slice(0, 40),
    pede: Object.fromEntries(Object.entries(e.pede).map(([k, q]) => [k, int(q, 1, 99, 1)])), moedas: int(e.moedas, 1, 5000, 10), xp: int(e.xp, 1, 500, 5),
  })) : [];
  st.casas = {}; for (const c of CASAS) if (obj(raw.casas)[c.id] === true) st.casas[c.id] = true;
  st.cidades = {}; for (const r of REGIOES) { const c = obj(raw.cidades)[r.id]; if (c && c.premio === true) st.cidades[r.id] = { em: int(c.em, 0, now, now), premio: true }; }
  /* tutorial: quem já jogava antes do tutorial existir não é obrigado a ver (pode rever em Ajustes) */
  const tu = raw.tut; st.tut = tu && typeof tu === 'object' ? { passo: int(tu.passo, 0, 50, 0), fim: tu.fim === true, base: int(tu.base, 0, 1e9, 0) } : { passo: 0, fim: true };
  repoeEntregas(st);
  st.atualizado = now;
  return st;
}

export function carregar() {
  let txt = null;
  try { txt = localStorage.getItem(CHAVE); } catch (_) { return { st: novoJogo(), novo: true, aviso: 'Não foi possível acessar o armazenamento deste navegador. O progresso não será salvo.' }; }
  if (!txt) return { st: novoJogo(), novo: true };
  try {
    const pac = JSON.parse(txt);
    if (!pac || pac.v !== VERSAO_SAVE || typeof pac.d !== 'string') throw new Error('formato');
    const raw = JSON.parse(pac.d);
    const corrompido = pac.h !== hash(pac.d);
    return { st: sanear(raw), novo: false, aviso: corrompido ? 'O progresso salvo foi alterado fora do jogo e foi conferido.' : '' };
  } catch (e) {
    try { localStorage.setItem(BACKUP, txt); } catch (_) {}
    return { st: novoJogo(), novo: true, aviso: 'O progresso salvo estava danificado. Começamos uma fazenda nova (guardamos uma cópia).' };
  }
}

export function salvar(st) {
  try {
    st.atualizado = agora();
    const d = JSON.stringify(st);
    localStorage.setItem(CHAVE, JSON.stringify({ v: VERSAO_SAVE, d, h: hash(d) }));
    return true;
  } catch (_) { return false; }
}

export function apagarSave() { try { localStorage.removeItem(CHAVE); } catch (_) {} }
