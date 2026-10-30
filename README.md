# Conecta Fazenda

Jogo de fazenda no navegador, ambientado na Serra da Mantiqueira. A primeira área é **São Bento do Sapucaí**, com a Pedra do Baú ao fundo. É um projeto independente e futuramente fará parte do ecossistema Conecta Mantiqueira (página Conecta Games).

**Sem dinheiro real:** não existem compras, apostas, saques nem conversão de moedas. Tudo se ganha jogando.

## Como jogar
- Toque num **canteiro vazio**, escolha a semente e toque em outros canteiros para continuar plantando.
- As plantas crescem pelo relógio, mesmo com o jogo fechado. Quando aparecer o balão ✓, toque para **colher**, ou use o botão **Colher**.
- No **Celeiro**, venda os produtos. As **Entregas** pagam mais.
- Toque nas **vacas e galinhas** para alimentar (com milho) e depois coletar leite e ovos.
- Use **Construir** para liberar canteiros, aumentar o celeiro e construir a **Padaria**, que faz queijo da serra e cestas da roça.
- Complete as **missões** para ganhar moedas e experiência.
- Construa as **5 casas da vila** (terrenos "À venda" no mapa), que liberam por nível.
- No botão **Mapa**, veja as 11 cidades da Mantiqueira. Concluir os 8 objetivos de São Bento dá um prêmio (uma vez só) e libera Sapucaí-Mirim.
- **Sapucaí-Mirim** (2ª cidade) só abre depois de concluir São Bento. No mapa, toque nela e em **Viajar**: lá começa uma fazenda nova (canteiros, animais, padaria, casas e pedidos próprios), e moedas, nível, sementes e celeiro vão junto. A fazenda de São Bento fica guardada e dá para voltar a qualquer hora; o que ficou plantado continua crescendo.
- Os 8 objetivos de Sapucaí-Mirim só contam o que for feito depois de chegar lá. Concluir tudo dá 400 moedas e libera Santo Antônio do Pinhal (área jogável numa próxima versão).
- Num jogo novo, o **fazendeiro** ensina o básico. Cada passo só avança quando você faz a ação. Dá para pular e rever em Ajustes.

## Estrutura
```
index.html, style.css      tela e interface
src/main.js                junta tudo (interface, painéis, ações)
src/engine.js              motor próprio em Canvas 2D (desenho, câmera, toque)
src/scene.js               cena de São Bento (cenário, canteiros, animais, efeitos)
src/game.js                regras do jogo (plantar, colher, vender, missões…)
src/data.js                preços, tempos, missões (fácil de ajustar)
src/state.js               salvar/carregar com verificação
src/tutorial.js            tutorial com o fazendeiro
src/regional.js            mapa da Serra da Mantiqueira (cidades e progresso)
src/roads.js               rede de estradas (pontos e trechos)
src/cropmeta.js            posição da terra em cada imagem de plantação (gerado)
assets/img/                imagens (WebP)
testes/teste_jogo.py       testes automáticos (Playwright)
```
Não usa nenhuma biblioteca externa nem servidor: é só publicar os arquivos (GitHub Pages).

## Salvamento
Nesta fase, o progresso fica salvo **no próprio aparelho** (localStorage). O save é conferido ao abrir: valores estranhos são corrigidos e um save danificado não trava o jogo (uma cópia fica guardada). Não há senha nem dado pessoal.

**Próximo passo seguro:** um projeto Supabase só do jogo, com login, em que o servidor confere cada ação (por exemplo, se a planta já teve tempo de crescer) antes de gravar. Assim o progresso vai junto para outro aparelho e ninguém trapaceia nos rankings.

## Testes
```
python3 -m http.server 8765
python3 testes/teste_jogo.py
python3 testes/teste_cidade2.py
```
Testam o ciclo completo no computador e no celular: plantar, crescer, colher, vender, comprar, animais, entregas, nível, canteiro novo, padaria, salvar/recarregar, tempo com o jogo fechado e save danificado. Também testam zoom e arrasto, 8 tamanhos de tela, estradas (sem atravessar construções), tutorial passo a passo, casas, mapa regional e conclusão de São Bento (prêmio único, save mexido à mão não libera cidade).

## Arte
Ilustrações geradas para o projeto (referências da região). As peças da primeira folha de referências são provisórias e estão sendo trocadas por versões em alta resolução: o fundo, a casa, o celeiro, o milho, a vaca e a galinha já foram trocados.

## Pendências
- **Conquistas e Coleções** ainda não existem (sem botões falsos até existirem).
- Sapucaí-Mirim já é jogável, mas usa um **fundo provisório** (serra desenhada pelo código) e o mesmo desenho de fazenda de São Bento. Falta a ilustração de fundo da cidade (`fundo` da cidade em `REGIOES`, no `index.html`).
- O jogo que roda é o `index.html` (tudo num arquivo só). A pasta `src/` está desatualizada desde 11/10 e não recebeu a segunda cidade.
- `testes/teste_jogo.py` está desatualizado em relação ao jogo atual (falha já no toque no canteiro, antes desta mudança). A segunda cidade tem o teste próprio `testes/teste_cidade2.py`.
- O fazendeiro tem uma pose só no tutorial; mais poses precisam de arte nova.
- A conferência das cidades é feita no aparelho; vira à prova de trapaça quando o servidor do jogo existir.
