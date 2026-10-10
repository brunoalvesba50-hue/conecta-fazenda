/* Conecta Fazenda — tutorial com o fazendeiro.
   Cada passo só avança depois de uma ação real do jogador (colher, plantar, alimentar, vender, abrir Construir).
   O passo atual fica salvo no progresso (st.tut). Dá para pular, e rever depois em Ajustes. */

const PASSOS = [
  { fala: 'Olá! Bem-vindo à sua fazenda em São Bento do Sapucaí. Vamos construir uma cidade rural cheia de vida!', botao: 'Vamos lá!' },
  { fala: 'Este milho já está pronto! Toque nele para colher.', conta: ['colher', '*'], alvo: 'pronto' },
  { fala: 'Agora o primeiro plantio: toque num canteiro vazio e escolha a alface.', conta: ['plantar', '*'], alvo: 'vazio' },
  { fala: 'Cada cultura passa por 5 fases até ficar pronta. Enquanto cresce, toque numa vaca para dar milho a ela.', conta: ['alimentar', '*'], alvo: 'vaca' },
  { fala: 'Seus produtos valem moedas. Abra o Mercado e venda alguma coisa.', conta: ['vender', '*'], ui: '[data-a="mercado"]' },
  { fala: 'Agora vamos desenvolver a propriedade. Toque em Construir para ver canteiros, a padaria e as casas da vila.', evento: 'construir', ui: '[data-a="construir"]' },
  { fala: 'Explore o mapa com os dedos: arraste para andar e use a pinça para aproximar. A cidade é sua!', botao: 'Começar a jogar' },
];

export function criaTutorial({ st, S, G, $, mudou }) {
  const box = $('tut'), txt = $('tutTxt'), ok = $('tutOk'), passo = $('tutPasso');
  const lido = (s, t, a) => ((s.cont[t] || {})[a]) || 0;
  let uiAlvo = null;

  function inicia(n) {
    const s = st(); s.tut.passo = n; s.tut.fim = n >= PASSOS.length;
    const p = PASSOS[n]; if (p && p.conta) s.tut.base = lido(s, p.conta[0], p.conta[1]); else s.tut.base = 0;
    mudou(); mostra();
  }
  function fim() { const s = st(); s.tut.fim = true; s.tut.passo = PASSOS.length; mudou(); mostra(); }

  function alvoMapa(p) {
    const s = st();
    if (p.alvo === 'pronto' || p.alvo === 'vazio') {
      const P = S.plots.find(P => { const e = G.estadoCanteiro(s, P.i); return e.tipo === p.alvo; });
      return P ? { x: P.x, y: P.y, h: p.alvo === 'pronto' ? 150 : 60 } : null;
    }
    if (p.alvo === 'vaca') {
      const A = S.animals.find(A => A.tipo === 'vaca' && G.estadoAnimal(s, A.k).tipo === 'fome') || S.animals.find(A => A.tipo === 'vaca');
      return A ? { x: A.x, y: A.y - 20, h: 110 } : null;
    }
    return null;
  }

  function mostra() {
    const s = st(), p = !s.tut.fim && PASSOS[s.tut.passo];
    document.body.classList.toggle('emTutorial', !!p);
    if (uiAlvo) { uiAlvo.classList.remove('tutAlvo'); uiAlvo = null; }
    if (!p) { box.classList.add('hidden'); S.alvo = null; return; }
    box.classList.remove('hidden');
    txt.textContent = p.fala; passo.textContent = `${s.tut.passo + 1}/${PASSOS.length}`;
    ok.classList.toggle('hidden', !p.botao); ok.textContent = p.botao || '';
    S.alvo = p.alvo ? () => alvoMapa(p) : null;
    if (p.ui) { uiAlvo = document.querySelector(p.ui); uiAlvo && uiAlvo.classList.add('tutAlvo'); }
  }

  /* chamado sempre que o estado muda: confere se a ação do passo foi feita */
  function confere() {
    const s = st(), p = !s.tut.fim && PASSOS[s.tut.passo];
    if (!p || !p.conta) return;
    if (lido(s, p.conta[0], p.conta[1]) > (s.tut.base || 0)) inicia(s.tut.passo + 1);
  }
  function evento(nome) { const s = st(), p = !s.tut.fim && PASSOS[s.tut.passo]; if (p && p.evento === nome) inicia(s.tut.passo + 1); }

  ok.onclick = () => { const s = st(); if (s.tut.passo >= PASSOS.length - 1) fim(); else inicia(s.tut.passo + 1); };
  $('tutPular').onclick = fim;
  mostra();
  return { confere, evento, mostra, pular: fim, rever: () => inicia(0), get passo() { return st().tut.passo; }, total: PASSOS.length };
}
