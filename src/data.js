/* Conecta Fazenda — dados do jogo (fácil de ajustar: preços, tempos, missões).
   Tempos em segundos. Tudo é virtual: não existe dinheiro real no jogo. */

export const VERSAO_SAVE = 1;

export const REGIAO = { id: 'sao-bento', nome: 'São Bento do Sapucaí' };

/* Plantações: stages = imagens de cada fase (a última é "pronta para colher") */
export const CULTURAS = {
  milho:   { nome: 'Milho',   semente: 2,  tempo: 60,  rende: 2, venda: 6,  xp: 3, nivel: 1, stages: 5 },
  alface:  { nome: 'Alface',  semente: 3,  tempo: 45,  rende: 2, venda: 7,  xp: 3, nivel: 1, stages: 5 },
  tomate:  { nome: 'Tomate',  semente: 5,  tempo: 120, rende: 2, venda: 14, xp: 6, nivel: 2, stages: 5 },
  cenoura: { nome: 'Cenoura', semente: 4,  tempo: 90,  rende: 2, venda: 11, xp: 5, nivel: 3, stages: 5 },
  morango: { nome: 'Morango', semente: 8,  tempo: 180, rende: 2, venda: 22, xp: 9, nivel: 4, stages: 5 },
  feijao:  { nome: 'Feijão',  semente: 6,  tempo: 150, rende: 3, venda: 12, xp: 8, nivel: 5, stages: 5 },
};

/* Produtos que ficam no celeiro (venda = moedas por unidade) */
export const PRODUTOS = {
  milho:   { nome: 'Milho',   icone: 'i_milho',   venda: 6 },
  alface:  { nome: 'Alface',  icone: 'i_alface',  venda: 7 },
  tomate:  { nome: 'Tomate',  icone: 'i_tomate',  venda: 14 },
  cenoura: { nome: 'Cenoura', icone: 'i_cenoura', venda: 11 },
  morango: { nome: 'Morango', icone: 'i_morango', venda: 22 },
  feijao:  { nome: 'Feijão',  icone: 'i_feijao',  venda: 12 },
  leite:   { nome: 'Leite',   icone: 'i_leite',   venda: 18 },
  ovo:     { nome: 'Ovo',     icone: 'i_ovo',     venda: 9 },
  queijo:  { nome: 'Queijo da serra', icone: 'i_queijo', venda: 70 },
  cesta:   { nome: 'Cesta da roça',   icone: 'cesto',    venda: 75 },
};

/* Animais: comem do celeiro e produzem depois de um tempo */
export const ANIMAIS = {
  vaca:    { nome: 'Vaca',    come: { milho: 2 }, tempo: 90, produz: 'leite', qtd: 1, xp: 5 },
  galinha: { nome: 'Galinha', come: { milho: 1 }, tempo: 45, produz: 'ovo',   qtd: 1, xp: 2 },
};

/* Produção na Padaria da Fazenda */
export const RECEITAS = {
  queijo: { nome: 'Queijo da serra', usa: { leite: 3 }, tempo: 90, qtd: 1, xp: 12 },
  cesta:  { nome: 'Cesta da roça', usa: { milho: 2, tomate: 2, alface: 2 }, tempo: 60, qtd: 1, xp: 10 },
};

/* Terrenos: os 6 primeiros já vêm liberados */
export const TERRENOS = [
  { custo: 0, nivel: 1 }, { custo: 0, nivel: 1 }, { custo: 0, nivel: 1 },
  { custo: 0, nivel: 1 }, { custo: 0, nivel: 1 }, { custo: 0, nivel: 1 },
  { custo: 60, nivel: 1 }, { custo: 120, nivel: 2 }, { custo: 200, nivel: 3 },
];

export const CELEIRO = { capInicial: 40, melhorias: [
  { cap: 60,  custo: 120, nivel: 2 },
  { cap: 90,  custo: 250, nivel: 3 },
  { cap: 130, custo: 450, nivel: 4 },
] };

export const PADARIA = { custo: 150, nivel: 2 };

/* XP total para chegar a cada nível (índice = nível) */
export const NIVEIS = [0, 0, 40, 110, 220, 380, 600, 900, 1300, 1800, 2500];
export const BONUS_NIVEL = n => 20 * n; // moedas ganhas ao subir de nível

/* Missões iniciais, em sequência (o progresso conta a partir do início de cada missão) */
export const MISSOES = [
  { id: 'm1', titulo: 'Primeiro plantio',       texto: 'Plante 3 milhos',            tipo: 'plantar', alvo: 'milho', qtd: 3,  moedas: 20, xp: 10 },
  { id: 'm2', titulo: 'Colheita de São Bento',  texto: 'Colha 6 milhos',             tipo: 'colher',  alvo: 'milho', qtd: 6,  moedas: 30, xp: 12 },
  { id: 'm3', titulo: 'Hora do trato',          texto: 'Alimente 2 animais',         tipo: 'alimentar', alvo: '*',   qtd: 2,  moedas: 25, xp: 10 },
  { id: 'm4', titulo: 'Feira da cidade',        texto: 'Venda 8 produtos no celeiro', tipo: 'vender', alvo: '*',     qtd: 8,  moedas: 30, xp: 12 },
  { id: 'm5', titulo: 'Entrega para o vizinho', texto: 'Complete 1 entrega',         tipo: 'entregar', alvo: '*',    qtd: 1,  moedas: 40, xp: 15 },
  { id: 'm6', titulo: 'Mais espaço',            texto: 'Libere um novo canteiro',    tipo: 'liberar', alvo: '*',     qtd: 1,  moedas: 40, xp: 15 },
  { id: 'm7', titulo: 'Padaria da Fazenda',     texto: 'Construa a padaria',         tipo: 'construir', alvo: 'padaria', qtd: 1, moedas: 60, xp: 20 },
  { id: 'm8', titulo: 'Sabor da Mantiqueira',   texto: 'Produza 1 queijo da serra',  tipo: 'produzir', alvo: 'queijo', qtd: 1, moedas: 80, xp: 25 },
  { id: 'm9', titulo: 'Primeiros vizinhos',     texto: 'Construa uma casa da vila',  tipo: 'construir', alvo: 'casa', qtd: 1, moedas: 60, xp: 20 },
];

/* Entregas: pedidos sorteados de acordo com o que o jogador já pode produzir */
export const ENTREGAS_NOMES = ['Dona Cida', 'Seu Zé do Baú', 'Mercearia da Praça', 'Pousada da Serra', 'Restaurante do Vale', 'Feira de domingo'];

/* Casas da vila: terrenos à venda perto da estrada da fazenda. Construir dá experiência e faz a cidade crescer. */
export const CASAS = [
  { id: 'casa1', nome: 'Casa rural simples',          custo: 80,  nivel: 1, xp: 15, lote: [790, 1468] },
  { id: 'casa2', nome: 'Casa de madeira com quintal', custo: 150, nivel: 2, xp: 20, lote: [1030, 1474] },
  { id: 'casa3', nome: 'Casa familiar',               custo: 240, nivel: 3, xp: 25, lote: [1236, 1466] },
  { id: 'casa4', nome: 'Casa moderna com varanda',    custo: 360, nivel: 4, xp: 30, lote: [330, 1490] },
  { id: 'casa5', nome: 'Sobrado comercial',           custo: 520, nivel: 5, xp: 40, lote: [1700, 1460] },
];

/* Campanha: ordem de desbloqueio das cidades (sequência do jogo, não ordem geográfica). */
export const REGIOES = [
  { id: 'sao-bento-do-sapucai', nome: 'São Bento do Sapucaí', ordem: 1, depois: null },
  { id: 'sapucai-mirim', nome: 'Sapucaí-Mirim', ordem: 2, depois: 'sao-bento-do-sapucai' },
  { id: 'santo-antonio-do-pinhal', nome: 'Santo Antônio do Pinhal', ordem: 3, depois: 'sapucai-mirim' },
  { id: 'campos-do-jordao', nome: 'Campos do Jordão', ordem: 4, depois: 'santo-antonio-do-pinhal' },
  { id: 'monte-verde', nome: 'Monte Verde', ordem: 5, depois: 'campos-do-jordao' },
  { id: 'camanducaia', nome: 'Camanducaia', ordem: 6, depois: 'monte-verde' },
  { id: 'extrema', nome: 'Extrema', ordem: 7, depois: 'camanducaia' },
  { id: 'paraisopolis', nome: 'Paraisópolis', ordem: 8, depois: 'extrema' },
  { id: 'goncalves', nome: 'Gonçalves', ordem: 9, depois: 'paraisopolis' },
  { id: 'itajuba', nome: 'Itajubá', ordem: 10, depois: 'goncalves' },
  { id: 'brasopolis', nome: 'Brasópolis', ordem: 11, depois: 'itajuba' },
];
/* Objetivos principais de cada cidade. Só São Bento tem área jogável nesta versão.
   O progresso é calculado do estado do jogo (contadores e construções), nunca guardado como número solto. */
export const OBJETIVOS = {
  'sao-bento-do-sapucai': [
    { id: 'plantar',  texto: 'Plantar 10 canteiros',          tipo: 'cont', chave: ['plantar', '*'], qtd: 10 },
    { id: 'colher',   texto: 'Colher 30 produtos',            tipo: 'cont', chave: ['colher', '*'], qtd: 30 },
    { id: 'animais',  texto: 'Alimentar os animais 8 vezes',  tipo: 'cont', chave: ['alimentar', '*'], qtd: 8 },
    { id: 'entregas', texto: 'Fazer 5 entregas',              tipo: 'cont', chave: ['entregar', '*'], qtd: 5 },
    { id: 'padaria',  texto: 'Construir a Padaria da Fazenda', tipo: 'padaria', qtd: 1 },
    { id: 'queijo',   texto: 'Produzir 2 queijos da serra',   tipo: 'cont', chave: ['produzir', 'queijo'], qtd: 2 },
    { id: 'casas',    texto: 'Construir 3 casas da vila',     tipo: 'casas', qtd: 3 },
    { id: 'nivel',    texto: 'Chegar ao nível 5',             tipo: 'nivel', qtd: 5 },
  ],
};
export const PREMIO_CIDADE = { moedas: 250, xp: 60 };
