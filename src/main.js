/* Conecta Fazenda — junta tudo: carrega imagens e progresso, monta a cena e a interface. */
import { Engine, loadImages } from './engine.js';
import { buildScene, WORLD, plotPos, PASTO } from './scene.js';
import { CULTURAS, PRODUTOS, ANIMAIS, RECEITAS, TERRENOS, CELEIRO, PADARIA, MISSOES, NIVEIS, REGIAO, CASAS, REGIOES, PREMIO_CIDADE } from './data.js';
import { criaTutorial } from './tutorial.js';
import { criaRegional } from './regional.js';
import * as G from './game.js';
import { carregar, salvar, apagarSave } from './state.js';

const IMGS = ['fundo_sao_bento', 'terra', 'cerca', 'cerca_madeira', 'portao', 'araucaria', 'ipe_amarelo', 'ipe_rosa', 'arvore_frutifera', 'pinheiro', 'pinheiro2', 'lagoinha', 'pedras', 'casa', 'celeiro', 'galinheiro', 'poco', 'padaria', 'vaca1', 'vaca2', 'vaca3', 'galinha1', 'galinha2', 'p_idle', 'p_plantando', 'p_colhendo', 'p_acenando', 'canteiro_vazio', 'curral', 'deposito', 'silo', 'vila_casa1', 'vila_casa2', 'vila_casa3', 'vila_casa4', 'vila_casa5', 'cesto', 'caixa', 'saco', 'banco', 'lampiao', 'placa', 'carroca', 'feno', 'flores', 'tronco'];
for (const [k, c] of Object.entries(CULTURAS)) for (let i = 1; i <= c.stages; i++) IMGS.push(`${k}_${i}`);
for (const p of Object.values(PRODUTOS)) if (!IMGS.includes(p.icone)) IMGS.push(p.icone);
const manifest = Object.fromEntries(IMGS.map(n => [n, `assets/img/${n}.webp`]));
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const src = n => `assets/img/${n}.webp`;
const coinH = '<span class="coin"></span>';

let st, E, S, IMG;
let dirty = false;
let TUT = null, RG = null;
const mudou = () => { dirty = true; atualizaHud(); if (painel) painel.render(); if (TUT) TUT.confere(); if (RG) RG.atualiza(); checaCidade(); };
setInterval(() => { if (dirty && st) { salvar(st); dirty = false; } }, 2000);
const salvarJa = () => { if (st) { salvar(st); dirty = false; } };
window.addEventListener('pagehide', salvarJa);
document.addEventListener('visibilitychange', () => { if (document.hidden) salvarJa(); });

/* ---------- avisos ---------- */
let tT = 0;
function toast(msg, err) { const t = $('toast'); t.textContent = msg; t.className = err ? 'err' : ''; clearTimeout(tT); tT = setTimeout(() => t.className = 'hidden', 2200); }
function niveis(subiu) {
  if (!subiu || !subiu.length) return;
  const n = subiu[subiu.length - 1], b = subiu.reduce((a, x) => a + x.bonus, 0);
  const novas = Object.entries(CULTURAS).filter(([, c]) => c.nivel === n.nivel).map(([, c]) => c.nome);
  const extra = [];
  TERRENOS.forEach((t, i) => { if (t.nivel === n.nivel && t.custo) extra.push('novo canteiro'); });
  if (PADARIA.nivel === n.nivel) extra.push('Padaria da Fazenda');
  CELEIRO.melhorias.forEach(m => { if (m.nivel === n.nivel) extra.push('melhoria do celeiro'); });
  const lib = [...novas.map(x => 'semente de ' + x.toLowerCase()), ...extra];
  $('modal').innerHTML = `<div class="mBox"><div class="bigStar">${$('hNivel').parentElement.querySelector('svg').outerHTML}<b>${n.nivel}</b></div><h2>Nível ${n.nivel}!</h2><p>Você ganhou <b>${b} moedas</b> de presente.${lib.length ? `<br>Liberou: ${esc(lib.join(', '))}.` : ''}</p><button class="b" id="mOk">Continuar</button></div>`;
  $('modal').className = ''; $('mOk').onclick = () => $('modal').className = 'hidden';
}
function resultado(r, onOk) { if (!r.ok) { toast(r.msg, true); return false; } onOk && onOk(r); mudou(); niveis(r.subiu); return true; }

/* ---------- cidade concluída: prêmio uma vez só e libera a próxima ---------- */
function checaCidade() {
  if (!st || st.cidades['sao-bento-do-sapucai'] || !G.progressoCidade(st, 'sao-bento-do-sapucai').completa) return;
  const r = G.concluirCidade(st, 'sao-bento-do-sapucai'); if (!r.ok) return;
  dirty = true; salvarJa(); atualizaHud();
  $('modal').innerHTML = `<div class="mBox"><div class="bigStar">${$('hNivel').parentElement.querySelector('svg').outerHTML}<b>✓</b></div><h2>São Bento do Sapucaí concluída!</h2><p>Você completou todos os objetivos principais. Prêmio: <b>${r.moedas} moedas</b> e ${r.xp} XP.<br><b>${esc(r.proxima)}</b> foi liberada no mapa da Mantiqueira.</p><button class="b" id="mOk">Ver o mapa</button></div>`;
  $('modal').className = ''; $('mOk').onclick = () => { $('modal').className = 'hidden'; RG.abrir(); };
}

/* ---------- topo e contadores ---------- */
function atualizaHud() {
  if (!st) return;
  $('hMoedas').textContent = st.moedas.toLocaleString('pt-BR');
  $('hNivel').textContent = st.nivel;
  const x = G.xpDoNivel(st); $('hXp').textContent = x.max ? 'Máximo' : `${x.atual} / ${x.total}`; $('hXpFill').style.width = (x.atual / x.total * 100) + '%';
  $('dCeleiro').textContent = G.usoCeleiro(st);
  const m = G.missaoAtual(st);
  if (m) { $('mChip').classList.remove('hidden'); $('mTitulo').textContent = m.completa ? 'Missão concluída! Toque para receber' : m.titulo; $('mTexto').textContent = `${m.texto} (${m.feito}/${m.qtd})`; $('mFill').style.width = (m.feito / m.qtd * 100) + '%'; $('mChip').classList.toggle('done', m.completa); }
  else $('mChip').classList.add('hidden');
  $('dMissao').classList.toggle('hidden', !(m && m.completa));
  contadores();
}
function contadores() {
  const now = G.agora();
  const prontos = st.canteiros.filter((c, i) => G.estadoCanteiro(st, i, now).tipo === 'pronto').length;
  const ani = st.animais.filter((a, k) => G.estadoAnimal(st, k, now).tipo === 'pronto').length;
  const d = $('dColher'); d.textContent = prontos; d.classList.toggle('hidden', !prontos);
  const da = $('dAnimais'); da.textContent = ani; da.classList.toggle('hidden', !ani);
  $('dProduzir').classList.toggle('hidden', G.estadoPadaria(st, now).tipo !== 'pronto');
}

/* ---------- painéis ---------- */
let painel = null;
function abrir(titulo, render, nome) {
  painel = { nome, last: '', render() { const h = render(); if (h === this.last) return; this.last = h; const b = $('shBody'), y = b.scrollTop; b.innerHTML = h; b.scrollTop = y; } };
  $('shTitle').textContent = titulo; $('sheet').classList.remove('hidden'); $('sheetBg').classList.remove('hidden'); painel.render();
}
function fechar() { painel = null; $('sheet').classList.add('hidden'); $('sheetBg').classList.add('hidden'); }
$('shClose').onclick = fechar; $('sheetBg').onclick = fechar;
setInterval(() => { if (painel && painel.vivo !== false) painel.render(); if (st) contadores(); }, 1000);
/* cliques dentro do painel: data-act="acao:arg1:arg2" */
$('shBody').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const [a, ...args] = b.dataset.act.split(':'); ACOES[a] && ACOES[a](...args); });
const needHtml = req => `<div class="need">${Object.entries(req).map(([k, q]) => { const tem = st.celeiro.itens[k] || 0; return `<span class="${tem >= q ? 'ok' : 'no'}"><img src="${src(PRODUTOS[k].icone)}" alt="">${Math.min(tem, q)}/${q} ${esc(PRODUTOS[k].nome)}</span>`; }).join('')}</div>`;

let alvoCanteiro = null;
const htmlSementes = () => `<p class="sub">Escolha uma semente. Depois toque nos canteiros vazios para plantar.</p>` + Object.entries(CULTURAS).map(([k, c]) => {
    const tem = st.sementes[k] || 0, lock = st.nivel < c.nivel;
    return `<div class="row ${lock ? 'locked' : ''} ${S && S.plantMode === k ? 'sel' : ''}"><img class="ic" src="${src(k + '_' + c.stages)}" alt=""><div class="tx"><b>${c.nome}</b><small>${lock ? `Libera no nível ${c.nivel}` : `Cresce em ${G.fmtTempo(c.tempo)} · rende ${c.rende} · vende por ${c.venda}`}</small><small>Você tem <b>${tem}</b> semente${tem === 1 ? '' : 's'}</small></div><div class="btns">${lock ? '' : `<button class="b y" data-act="comprar:${k}:1" ${st.moedas < c.semente ? 'disabled' : ''}>+1 ${coinH}${c.semente}</button><button class="b y" data-act="comprar:${k}:5" ${st.moedas < c.semente * 5 ? 'disabled' : ''}>+5 ${coinH}${c.semente * 5}</button><button class="b" data-act="escolher:${k}" ${tem ? '' : 'disabled'}>Plantar</button>`}</div></div>`;
  }).join('');
function painelSementes(i) {
  alvoCanteiro = i == null ? null : i;
  abrir(i == null ? 'Sementes' : 'O que plantar aqui?', htmlSementes, 'sementes');
}
const htmlCeleiro = () => {
    const cap = G.capCeleiro(st), uso = G.usoCeleiro(st), m = CELEIRO.melhorias[st.celeiro.melhoria];
    const itens = Object.entries(st.celeiro.itens).filter(([, q]) => q > 0);
    return `<div class="cap">Guardado ${uso}/${cap}<div class="bar"><i class="${uso >= cap ? 'full' : ''}" style="width:${Math.min(100, uso / cap * 100)}%"></i></div></div>`
      + (itens.length ? `<div class="grid">${itens.map(([k, q]) => `<div class="cell"><img src="${src(PRODUTOS[k].icone)}" alt=""><b>${esc(PRODUTOS[k].nome)} ×${q}</b><small>${PRODUTOS[k].venda} moedas cada</small><div class="btns"><button class="b y" data-act="vender:${k}:1">Vender 1</button>${q > 1 ? `<button class="b g" data-act="vender:${k}:${q}">Tudo</button>` : ''}</div></div>`).join('')}</div>` : `<p class="sub">O celeiro está vazio. Colha as plantações e colete leite e ovos.</p>`)
      + `<div class="row" style="margin-top:12px"><img class="ic" src="${src('caixa')}" alt=""><div class="tx"><b>Melhorar celeiro</b><small>${m ? `Passa a guardar ${m.cap} itens${st.nivel < m.nivel ? ` · nível ${m.nivel}` : ''}` : 'Celeiro no tamanho máximo'}</small></div>${m ? `<button class="b y" data-act="melhorar" ${st.nivel < m.nivel || st.moedas < m.custo ? 'disabled' : ''}>${coinH}${m.custo}</button>` : ''}</div>`;
  };
function painelCeleiro() {
  abrir('Celeiro', htmlCeleiro, 'celeiro');
}
let abaMercado = 'comprar';
function painelMercado(aba) {
  if (aba) abaMercado = aba; alvoCanteiro = null;
  abrir('Mercado da Fazenda', () => `<div class="tabs"><button class="${abaMercado === 'comprar' ? 'on' : ''}" data-act="mercado:comprar">Comprar sementes</button><button class="${abaMercado === 'vender' ? 'on' : ''}" data-act="mercado:vender">Vender produtos</button></div>` + (abaMercado === 'vender' ? htmlCeleiro() : htmlSementes()), 'mercado');
}
function painelAnimais() {
  abrir('Animais', () => {
    const now = G.agora();
    const linhas = st.animais.map((a, k) => {
      const e = G.estadoAnimal(st, k, now), d = ANIMAIS[a.tipo], [it, q] = Object.entries(d.come)[0];
      const txt = e.tipo === 'fome' ? `Com fome · come ${q} ${PRODUTOS[it].nome.toLowerCase()}` : e.tipo === 'pronto' ? `${PRODUTOS[d.produz].nome} pronto!` : `Produzindo ${PRODUTOS[d.produz].nome.toLowerCase()} · ${G.fmtTempo(e.falta)}`;
      const bt = e.tipo === 'fome' ? `<button class="b" data-act="alimentar:${k}" ${G.temItens(st, d.come) ? '' : 'disabled'}>Alimentar</button>` : e.tipo === 'pronto' ? `<button class="b y" data-act="alimentar:${k}">Coletar</button>` : '';
      return `<div class="row"><img class="ic" src="${src(a.tipo === 'vaca' ? 'vaca1' : 'galinha1')}" alt=""><div class="tx"><b>${d.nome} ${k + 1 - (a.tipo === 'galinha' ? st.animais.filter(x => x.tipo === 'vaca').length : 0)}</b><small>${txt}</small></div>${bt}</div>`;
    }).join('');
    return `<p class="sub">Alimente com milho do celeiro. Depois de um tempo, colete leite e ovos.</p><div class="btns" style="justify-content:stretch;margin-bottom:10px"><button class="b" style="flex:1" data-act="alimentarTodos">Alimentar todos</button><button class="b y" style="flex:1" data-act="coletarTodos">Coletar tudo</button></div>${linhas}`;
  }, 'animais');
}
function painelConstruir() {
  if (TUT) TUT.evento('construir');
  abrir('Construir e melhorar', () => {
    const lock = TERRENOS.map((t, i) => ({ t, i })).filter(({ i }) => !st.canteiros[i].liberado);
    const m = CELEIRO.melhorias[st.celeiro.melhoria];
    return `<div class="row"><img class="ic" src="${src('padaria')}" alt=""><div class="tx"><b>Padaria da Fazenda</b><small>${st.padaria.construida ? 'Construída! Use o botão Produzir.' : `Transforma leite em queijo e monta cestas da roça${st.nivel < PADARIA.nivel ? ` · nível ${PADARIA.nivel}` : ''}`}</small></div>${st.padaria.construida ? '' : `<button class="b y" data-act="padaria" ${st.nivel < PADARIA.nivel || st.moedas < PADARIA.custo ? 'disabled' : ''}>${coinH}${PADARIA.custo}</button>`}</div>`
      + lock.map(({ t, i }) => `<div class="row"><img class="ic" src="${src('milho_1')}" alt=""><div class="tx"><b>Novo canteiro</b><small>Mais espaço para plantar${st.nivel < t.nivel ? ` · nível ${t.nivel}` : ''}</small></div><button class="b y" data-act="liberar:${i}" ${st.nivel < t.nivel || st.moedas < t.custo ? 'disabled' : ''}>${coinH}${t.custo}</button></div>`).join('')
      + `<p class="sub" style="margin-top:12px">Casas da vila</p>` + CASAS.map(c => st.casas[c.id] ? `<div class="row sel"><img class="ic" src="${src('vila_' + c.id)}" alt=""><div class="tx"><b>${esc(c.nome)}</b><small>Construída</small></div></div>` : `<div class="row ${st.nivel < c.nivel ? 'locked' : ''}"><img class="ic" src="${src('vila_' + c.id)}" alt=""><div class="tx"><b>${esc(c.nome)}</b><small>+${c.xp} XP · faz a cidade crescer${st.nivel < c.nivel ? ` · nível ${c.nivel}` : ''}</small></div><button class="b y" data-act="casa:${c.id}" ${st.nivel < c.nivel || st.moedas < c.custo ? 'disabled' : ''}>${coinH}${c.custo}</button></div>`).join('')
      + `<div class="row"><img class="ic" src="${src('celeiro')}" alt=""><div class="tx"><b>Celeiro maior</b><small>${m ? `De ${G.capCeleiro(st)} para ${m.cap} itens${st.nivel < m.nivel ? ` · nível ${m.nivel}` : ''}` : 'No tamanho máximo'}</small></div>${m ? `<button class="b y" data-act="melhorar" ${st.nivel < m.nivel || st.moedas < m.custo ? 'disabled' : ''}>${coinH}${m.custo}</button>` : ''}</div>`;
  }, 'construir');
}
function painelProduzir() {
  abrir('Padaria da Fazenda', () => {
    const e = G.estadoPadaria(st, G.agora());
    if (e.tipo === 'fechada') return `<p class="sub">A padaria ainda não foi construída. Ela transforma o leite das vacas em queijo da serra e monta cestas da roça para vender mais caro.</p><button class="b y" data-act="padaria" ${st.nivel < PADARIA.nivel || st.moedas < PADARIA.custo ? 'disabled' : ''}>Construir por ${coinH}${PADARIA.custo}${st.nivel < PADARIA.nivel ? ` (nível ${PADARIA.nivel})` : ''}</button>`;
    const topo = e.tipo === 'produzindo' ? `<div class="row sel"><img class="ic" src="${src(PRODUTOS[e.receita].icone)}" alt=""><div class="tx"><b>Produzindo ${esc(RECEITAS[e.receita].nome.toLowerCase())}</b><small>Falta ${G.fmtTempo(e.falta)}</small></div></div>` : e.tipo === 'pronto' ? `<div class="row sel"><img class="ic" src="${src(PRODUTOS[e.receita].icone)}" alt=""><div class="tx"><b>${esc(RECEITAS[e.receita].nome)} pronto!</b></div><button class="b y" data-act="coletarProd">Coletar</button></div>` : '';
    return topo + Object.entries(RECEITAS).map(([k, r]) => `<div class="row"><img class="ic" src="${src(PRODUTOS[k].icone)}" alt=""><div class="tx"><b>${esc(r.nome)}</b><small>${G.fmtTempo(r.tempo)} · vende por ${PRODUTOS[k].venda}</small>${needHtml(r.usa)}</div><button class="b" data-act="produzir:${k}" ${e.tipo !== 'livre' || !G.temItens(st, r.usa) ? 'disabled' : ''}>Produzir</button></div>`).join('');
  }, 'produzir');
}
let abaMissao = 'missoes';
function painelMissoes(aba) {
  if (aba) abaMissao = aba;
  abrir('Missões e entregas', () => {
    const tabs = `<div class="tabs"><button class="${abaMissao === 'missoes' ? 'on' : ''}" data-act="aba:missoes">Missões</button><button class="${abaMissao === 'entregas' ? 'on' : ''}" data-act="aba:entregas">Entregas</button><button class="${abaMissao === 'cidade' ? 'on' : ''}" data-act="aba:cidade">Cidade</button></div>`;
    if (abaMissao === 'cidade') return tabs + htmlObjetivos('sao-bento-do-sapucai');
    if (abaMissao === 'entregas') return tabs + `<p class="sub">Pedidos da vizinhança de São Bento. Pagam mais do que vender no celeiro.</p>` + st.entregas.map((e, i) => `<div class="row"><img class="ic" src="${src('caixa')}" alt=""><div class="tx"><b>${esc(e.nome)}</b>${needHtml(e.pede)}<small>Paga ${e.moedas} moedas + ${e.xp} XP</small></div><div class="btns" style="flex-direction:column"><button class="b" data-act="entregar:${i}" ${G.temItens(st, e.pede) ? '' : 'disabled'}>Entregar</button><button class="b g" data-act="trocar:${i}">Trocar</button></div></div>`).join('');
    const m = G.missaoAtual(st);
    const prox = MISSOES.slice(st.missao.idx + 1, st.missao.idx + 4);
    return tabs + (m ? `<div class="mission"><h3>${esc(m.titulo)}</h3><p>${esc(m.texto)}</p><div class="mbar"><i style="width:${m.feito / m.qtd * 100}%"></i></div><div class="rw">${m.feito}/${m.qtd} · Prêmio: ${coinH}${m.moedas} + ${m.xp} XP</div>${m.completa ? `<button class="b y" data-act="resgatar">Receber prêmio</button>` : ''}</div>` : `<div class="mission"><h3>Todas as missões concluídas!</h3><p>Continue fazendo entregas. Novas regiões chegam em breve.</p></div>`)
      + (prox.length ? `<p class="sub">Próximas missões</p>` + prox.map(x => `<div class="row locked"><div class="tx"><b>${esc(x.titulo)}</b><small>${esc(x.texto)}</small></div></div>`).join('') : '');
  }, 'missoes');
}
function painelGanhar() {
  abrir('Como ganhar moedas', () => `<p class="sub">No Conecta Fazenda as moedas são só do jogo. Não existe compra com dinheiro de verdade.</p>
    <div class="row"><img class="ic" src="${src('cesto')}" alt=""><div class="tx"><b>Colha e venda</b><small>Venda o que colher no celeiro.</small></div><button class="b" data-act="ir:celeiro">Abrir</button></div>
    <div class="row"><img class="ic" src="${src('caixa')}" alt=""><div class="tx"><b>Faça entregas</b><small>Os pedidos dos vizinhos pagam 50% a mais.</small></div><button class="b" data-act="ir:entregas">Ver</button></div>
    <div class="row"><img class="ic" src="${src('placa')}" alt=""><div class="tx"><b>Complete missões</b><small>Cada missão dá moedas e experiência.</small></div><button class="b" data-act="ir:missoes">Ver</button></div>
    <div class="row"><img class="ic" src="${src('i_queijo')}" alt=""><div class="tx"><b>Produza na padaria</b><small>Queijo e cestas valem bem mais.</small></div><button class="b" data-act="ir:produzir">Abrir</button></div>
    <div class="row"><img class="ic" src="${src('p_acenando')}" alt=""><div class="tx"><b>Suba de nível</b><small>Cada nível novo dá um presente em moedas.</small></div></div>`, 'ganhar');
}
function htmlObjetivos(id) {
  const r = REGIOES.find(x => x.id === id), e = G.estadoCidade(st, id), ob = G.objetivos(st, id), p = G.progressoCidade(st, id);
  if (!ob.length) return `<p class="sub">${esc(r.nome)}: ${e.tipo === 'bloqueada' ? `bloqueada. Conclua ${esc(e.requisito)} primeiro.` : 'a área jogável desta cidade chega numa próxima atualização.'}</p>`;
  return `<p class="sub">${esc(r.nome)} · ${p.feitos} de ${p.total} objetivos principais (${p.pct}%). Ao concluir todos: ${coinH}${PREMIO_CIDADE.moedas} e a próxima cidade é liberada.</p>`
    + ob.map(o => `<div class="obj ${o.ok ? 'ok' : ''}"><i>${o.ok ? '✓' : ''}</i><span>${esc(o.texto)}</span><small>${o.feito}/${o.qtd}</small></div>`).join('');
}
function painelCidade(id) {
  const r = REGIOES.find(x => x.id === id), e = G.estadoCidade(st, id);
  abrir(r.nome, () => {
    const e2 = G.estadoCidade(st, id);
    if (e2.tipo === 'bloqueada') return `<div class="mission"><h3>Cidade bloqueada</h3><p>Conclua todos os objetivos principais de <b>${esc(e2.requisito)}</b> para liberar ${esc(r.nome)}.</p></div>`;
    if (e2.tipo === 'em-breve') return `<div class="mission"><h3>Liberada!</h3><p>Você concluiu a cidade anterior. A área jogável de ${esc(r.nome)} chega numa próxima atualização do jogo. Seu progresso fica guardado.</p></div>`;
    return htmlObjetivos(id) + `<button class="b" style="width:100%;justify-content:center;margin-top:6px" data-act="entrar:${id}">Entrar na cidade</button>`;
  }, 'cidade');
}
function painelMapa() { RG.abrir(); }
function painelAjustes() {
  abrir('Ajustes', () => `<p class="sub">Seu progresso é salvo automaticamente neste aparelho. Se você limpar os dados do navegador ou trocar de aparelho, ele não vai junto (o salvamento na nuvem vem numa próxima versão).</p>
    <div class="row"><div class="tx"><b>Fazenda criada em</b><small>${new Date(st.criado).toLocaleString('pt-BR')}</small></div></div>
    <div class="row"><div class="tx"><b>Moedas só do jogo</b><small>Sem compras, apostas ou dinheiro real. Tudo se ganha jogando.</small></div></div>
    <div class="row"><div class="tx"><b>Tutorial</b><small>Ver de novo as dicas do fazendeiro.</small></div><button class="b y" data-act="rever">Rever</button></div>
    <div class="row"><div class="tx"><b>Começar de novo</b><small>Apaga a fazenda deste aparelho.</small></div><button class="b r" data-act="reset">Apagar</button></div>`, 'ajustes');
}

/* ---------- ações ---------- */
function plantarEm(i, k) {
  return resultado(G.plantar(st, i, k), () => { const p = plotPos(i); S.popPlot(i); S.sparkle(p.x, p.y); S.farmerPose('p_plantando'); });
}
function modoPlantio(k) {
  S.plantMode = k; fechar();
  const atualiza = () => { if (!S.plantMode) return; const n = st.sementes[S.plantMode] || 0; $('pbIcon').src = src(S.plantMode + '_' + CULTURAS[S.plantMode].stages); $('pbTxt').textContent = n ? `Toque nos canteiros vazios · ${n} semente${n > 1 ? 's' : ''} de ${CULTURAS[S.plantMode].nome.toLowerCase()}` : `Acabaram as sementes de ${CULTURAS[S.plantMode].nome.toLowerCase()}`; };
  S.atualizaBarra = atualiza; $('plantBar').classList.remove('hidden'); atualiza();
}
function sairPlantio() { S.plantMode = null; $('plantBar').classList.add('hidden'); }
$('pbOk').onclick = sairPlantio;

const ACOES = {
  comprar: (k, q) => resultado(G.comprarSemente(st, k, +q), r => toast(r.msg)),
  escolher: k => { if (alvoCanteiro != null && G.estadoCanteiro(st, alvoCanteiro).tipo === 'vazio') plantarEm(alvoCanteiro, k); alvoCanteiro = null; modoPlantio(k); },
  vender: (k, q) => resultado(G.vender(st, k, +q), r => toast(r.msg)),
  melhorar: () => resultado(G.melhorarCeleiro(st), r => toast(r.msg)),
  liberar: i => resultado(G.liberarCanteiro(st, +i), r => { toast(r.msg); const p = plotPos(+i); S.sparkle(p.x, p.y); }),
  padaria: () => resultado(G.construirPadaria(st), r => { toast(r.msg); S.sparkle(S.padaria.x, S.padaria.y - 100); }),
  produzir: k => resultado(G.produzir(st, k), r => toast(r.msg)),
  coletarProd: () => resultado(G.coletarProducao(st), r => { toast(r.msg); S.floatText(S.padaria.x, S.padaria.y - 160, `+${r.qtd}`, IMG[PRODUTOS[r.item].icone]); }),
  alimentar: k => animal(+k),
  alimentarTodos: () => { let n = 0, falta = false; st.animais.forEach((a, k) => { if (G.estadoAnimal(st, k).tipo === 'fome') { const r = G.alimentar(st, k); if (r.ok) n++; else falta = true; } }); if (n) { mudou(); toast(`${n} anima${n > 1 ? 'is' : 'l'} alimentado${n > 1 ? 's' : ''}`); } else toast(falta ? 'Falta milho no celeiro.' : 'Ninguém está com fome agora.', !n); },
  coletarTodos: () => { let n = 0, sub = []; st.animais.forEach((a, k) => { if (G.estadoAnimal(st, k).tipo === 'pronto') { const r = G.coletar(st, k); if (r.ok) { n++; sub = sub.concat(r.subiu || []); } } }); if (n) { mudou(); toast(`Coletou ${n} produto${n > 1 ? 's' : ''}`); niveis(sub); } else toast('Nada pronto para coletar.', true); },
  entregar: i => resultado(G.entregar(st, +i), r => { toast(r.msg); S.floatText(S.casa.x, S.casa.y - 200, `+${r.moedas}`, null); }),
  trocar: i => resultado(G.trocarEntrega(st, +i)),
  resgatar: () => resultado(G.resgatarMissao(st), r => toast(r.msg)),
  aba: a => painelMissoes(a),
  mercado: a => painelMercado(a),
  casa: id => resultado(G.construirCasa(st, id), r => { toast(r.msg); const L = S.lotes.find(l => l.c.id === id); if (L) S.sparkle(L.x, L.y - 60); }),
  entrar: () => { fechar(); RG.fechar(); },
  rever: () => { fechar(); TUT.rever(); },
  ir: a => ({ celeiro: painelCeleiro, entregas: () => painelMissoes('entregas'), missoes: () => painelMissoes('missoes'), produzir: painelProduzir })[a](),
  reset: () => { if (!confirm('Apagar a fazenda deste aparelho? Isso não pode ser desfeito.')) return; apagarSave(); st = null; location.reload(); },
};
function animal(k) {
  const e = G.estadoAnimal(st, k), A = S.animals[k];
  const r = G.alimentar(st, k);
  resultado(r, r => {
    if (e.tipo === 'pronto') { S.floatText(A.x, A.y - 90, `+${r.qtd}`, IMG[PRODUTOS[r.item].icone]); S.sparkle(A.x, A.y - 40); }
    else { toast(r.msg); S.sparkle(A.x, A.y - 30); }
  });
}

/* ---------- toques na cena ---------- */
const api = {
  state: () => st,
  tick: () => {},
  tapPlot(i) {
    const e = G.estadoCanteiro(st, i);
    if (e.tipo === 'bloqueado') { painelConstruir(); return; }
    if (e.tipo === 'pronto') { const r = G.colher(st, i); resultado(r, r => { const p = plotPos(i); S.floatText(p.x, p.y - 80, `+${r.qtd}`, IMG['i_' + r.item]); S.sparkle(p.x, p.y - 30); S.farmerPose('p_colhendo'); }); return; }
    if (e.tipo === 'crescendo') { toast(`${CULTURAS[e.cultura].nome}: falta ${G.fmtTempo(e.falta)}`); return; }
    if (S.plantMode) { if (!(st.sementes[S.plantMode] > 0)) { painelSementes(i); return; } plantarEm(i, S.plantMode); S.atualizaBarra && S.atualizaBarra(); return; }
    painelSementes(i);
  },
  tapAnimal: k => animal(k),
  tapCasa(id) { const c = CASAS.find(x => x.id === id); if (st.casas[id]) toast(`${c.nome} · São Bento do Sapucaí`); else painelConstruir(); },
  tap(o) {
    if (o === 'celeiro') painelCeleiro();
    else if (o === 'padaria') st.padaria.construida ? painelProduzir() : painelConstruir();
    else if (o === 'casa') painelMissoes('missoes');
    else if (o === 'galinheiro') painelAnimais();
    else if (o === 'fazendeiro') { S.farmerPose('p_acenando', 1400); toast('Bem-vindo a São Bento do Sapucaí!'); }
    else if (o === 'poco') toast('Água fresquinha da serra.');
    else if (o === 'curral') painelAnimais();
    else if (o === 'deposito') painelCeleiro();
    else if (o === 'silo') toast('Silo da fazenda: em breve guardará a ração dos animais.');
  },
};

/* ---------- botões fixos ---------- */
document.querySelector('.bottom').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const a = b.dataset.a;
  if (a === 'plantar') painelSementes();
  else if (a === 'colher') { const r = G.colherTudo(st); resultado(r, r => { r.res.forEach((x, j) => setTimeout(() => { const p = plotPos(x.i); S.floatText(p.x, p.y - 80, `+${x.qtd}`, IMG['i_' + x.item]); S.sparkle(p.x, p.y - 30); }, j * 120)); S.farmerPose('p_colhendo'); niveis(r.res.flatMap(x => x.subiu || [])); if (r.cheio) toast('O celeiro encheu. Venda ou melhore o celeiro.', true); }); }
  else if (a === 'animais') painelAnimais();
  else if (a === 'construir') painelConstruir();
  else if (a === 'produzir') painelProduzir();
  else if (a === 'mercado') painelMercado();
});
$('bMissoes').onclick = () => painelMissoes('missoes');
$('mChip').onclick = () => { const m = G.missaoAtual(st); if (m && m.completa) ACOES.resgatar(); else painelMissoes('missoes'); };
/* zoom: botões (o gesto de pinça e a roda do mouse estão no engine.js) */
const FAZENDA = { x: 900, y: 980 };
/* enquadramento inicial: na vertical mostra a largura principal da fazenda (da casa ao celeiro)
   e aproveita a altura (Pedra do Baú → fazenda → pasto → parte de baixo); na horizontal, como antes */
function visaoInicial() {
  const retrato = E.vh > E.vw * 1.1;
  if (retrato) {
    /* mostra de x≈350 (casa) a x≈1460 (celeiro) e do céu até o pasto */
    const z = Math.min(E.maxZoom, Math.max(E.minZoom, E.vw / 1000));
    return { x: 912, y: 20 + E.vh / z / 2, z };
  }
  if (E.vh <= 520) {
    /* celular de lado: casa, celeiro, canteiros e animais na tela de uma vez */
    const z = Math.min(E.maxZoom, Math.max(E.coverZoom, Math.min(E.vw / 1150, E.vh / 880))), alt = E.vh / z;
    return { x: 905, y: Math.max(20, 1185 - (E.vh - 66) / z) + alt / 2, z };
  }
  /* tela larga: canteiros sempre acima da barra de baixo; sobe o quanto der para mostrar a serra */
  const cel = E.vw < 700, z = Math.max(E.coverZoom, cel ? .68 : .74), alt = E.vh / z;
  return { x: cel ? 860 : 900, y: Math.max(20, 1200 - (E.vh - 110) / z) + alt / 2, z };
}
let mexeu = false; ['pointerdown', 'wheel'].forEach(t => $('game').addEventListener(t, () => { mexeu = true; }, { passive: true }));
$('zIn').onclick = () => E.zoomTo(E.cam.zoom * 1.35);
$('zOut').onclick = () => E.zoomTo(E.cam.zoom / 1.35);
$('zAll').onclick = () => E.flyTo(WORLD.w / 2, WORLD.h / 2, E.minZoom);
$('zHome').onclick = () => { const v = visaoInicial(); E.flyTo(v.x, v.y, v.z); };
setInterval(() => { if (!E) return; $('zIn').disabled = E.cam.zoom >= E.maxZoom - .001; $('zOut').disabled = E.cam.zoom <= E.minZoom + .001; }, 300);
$('bCeleiro').onclick = painelCeleiro; $('bMapa').onclick = painelMapa; $('bConfig').onclick = painelAjustes; $('bGanhar').onclick = painelGanhar;

/* ---------- tela ----------
   Prioridade: celular na vertical. O jogo usa a tela como ela está (em pé ou deitado), sem girar nada.
   --W/--H guardam o tamanho útil; "compacto" = pouca altura (deitado), "estreito" = tela fina. */
let girado = false;
function ajustaTela() {
  const W = window.innerWidth, H = window.innerHeight, b = document.body, r = document.documentElement.style;
  b.classList.toggle('compacto', H <= 520); b.classList.toggle('estreito', W <= 480);
  r.setProperty('--W', W + 'px'); r.setProperty('--H', H + 'px');
  const o = H > W, mudou = ajustaTela.o !== undefined && ajustaTela.o !== o; ajustaTela.o = o;
  if (E) { E.resize(); if (!mexeu || mudou) { const v = visaoInicial(); E.setZoom(v.z); E.centerOn(v.x, v.y); } }
}
ajustaTela();
['resize', 'orientationchange'].forEach(t => window.addEventListener(t, () => setTimeout(ajustaTela, 60)));
if (window.visualViewport) visualViewport.addEventListener('resize', () => setTimeout(ajustaTela, 60));
/* Safari: se a página rolar sozinha (barra de endereço, teclado), volta para o topo para a interface não sumir */
const semRolar = () => { if (window.scrollY || window.scrollX) window.scrollTo(0, 0); };
window.addEventListener('scroll', semRolar, { passive: true }); if (window.visualViewport) visualViewport.addEventListener('scroll', semRolar);
window.CF_tela = () => ({ girado: false, W: innerWidth, H: innerHeight });

/* ---------- início ---------- */
(async function () {
  IMG = await loadImages(manifest, p => { $('ldFill').style.width = Math.round(p * 100) + '%'; });
  const faltando = IMGS.filter(n => !IMG[n]);
  if (faltando.length) { $('ldTxt').textContent = 'Algumas imagens não carregaram. Verifique a internet e recarregue.'; console.warn('faltando', faltando); return; }
  const c = carregar(); st = c.st; if (c.novo) salvar(st);
  E = new Engine($('game'), WORLD);
  S = buildScene(E, IMG, api);
  { const v = visaoInicial(); E.setZoom(v.z); E.centerOn(v.x, v.y); }
  window.CF = { get st() { return st; }, E, S, G, WORLD, salvar: salvarJa, pagina: (x, y) => girado ? [innerWidth - y, x] : [x, y] };
  TUT = criaTutorial({ st: () => st, S, G, $, mudou });
  RG = criaRegional({ st: () => st, G, $, aoTocarCidade: id => painelCidade(id) });
  $('rgVoltar').onclick = () => RG.fechar();
  window.CF.tut = TUT; window.CF.rg = RG;
  $('hud').classList.remove('hidden'); atualizaHud(); checaCidade();
  $('loading').remove();
  if (c.aviso) toast(c.aviso, true);
})();
