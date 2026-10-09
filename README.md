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

## Estrutura
```
index.html, style.css      tela e interface
src/main.js                junta tudo (interface, painéis, ações)
src/engine.js              motor próprio em Canvas 2D (desenho, câmera, toque)
src/scene.js               cena de São Bento (cenário, canteiros, animais, efeitos)
src/game.js                regras do jogo (plantar, colher, vender, missões…)
src/data.js                preços, tempos, missões (fácil de ajustar)
src/state.js               salvar/carregar com verificação
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
```
Testam o ciclo completo no computador e no celular: plantar, crescer, colher, vender, comprar, animais, entregas, nível, canteiro novo, padaria, salvar/recarregar, tempo com o jogo fechado e save danificado.

## Arte
Ilustrações geradas para o projeto (referências da região). As peças da primeira folha de referências são provisórias e estão sendo trocadas por versões em alta resolução: o fundo, a casa, o celeiro, o milho, a vaca e a galinha já foram trocados.
