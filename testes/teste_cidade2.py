"""Testes da segunda cidade (Sapucaí-Mirim): bloqueio, liberação ao concluir São Bento, viagem e volta.
Como rodar:  python3 -m http.server 8765   (na pasta do jogo)   e depois   python3 testes/teste_cidade2.py
Opcional: CHROME=/caminho/do/chrome para escolher o navegador."""
import sys, os, json
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
CHROME = os.environ.get('CHROME')
SB, SM = 'sao-bento-do-sapucai', 'sapucai-mirim'
res = []
def check(nome, ok, info=''):
    res.append((nome, bool(ok))); print(('OK    ' if ok else 'FALHA ') + nome + (f'  -> {info}' if info != '' else ''), flush=True)

def run(viewport, mobile):
    with sync_playwright() as p:
        b = p.chromium.launch(**({'executable_path': CHROME} if CHROME else {}))
        ctx = b.new_context(viewport=viewport, has_touch=mobile, is_mobile=mobile)
        pg = ctx.new_page(); ev = pg.evaluate; errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        tag = 'celular' if mobile else 'computador'
        def grava_save(js):
            # monta o save fora do jogo (o jogo salva o próprio estado ao sair da página)
            pg.goto(URL.rsplit('/', 1)[0] + '/manifest.json'); ev(js); pg.goto(URL); abre()
        def abre():
            pg.wait_for_function('window.CF && window.CF.st && !document.getElementById("loading")', timeout=20000)
            ev("document.getElementById('modalPerfil')&&0"); ev("CF.tut&&CF.tut.pular()"); pg.wait_for_timeout(500)
        pg.goto(URL); abre(); ev("localStorage.clear()"); pg.reload(); abre()
        # perfil escolhido para não ficar a janela de escolha por cima
        ev("CF.st.perfil={genero:'f',nome:'Ana'}; CF.salvar()"); pg.reload(); abre()
        st = lambda: ev("JSON.parse(JSON.stringify(CF.st))")

        # save antigo (antes da segunda cidade existir) abre com o progresso inteiro
        velho = ev("(()=>{const s=JSON.parse(JSON.stringify(CF.st)); delete s.cidadeAtual; delete s.fazendas; delete s.chegadas; s.moedas=777; s.casas={casa1:true}; return JSON.stringify(s)})()")
        grava_save(f"localStorage.setItem('conecta_fazenda_save_v1', JSON.stringify({{v:1,d:{json.dumps(velho)},h:'x'}}))"); s = st()
        check(f'[{tag}] save antigo abre sem perder o progresso', s['moedas'] == 777 and s['casas'] == {'casa1': True} and s['cidadeAtual'] == SB, s['moedas'])
        ev("localStorage.clear()"); pg.reload(); abre(); ev("CF.st.perfil={genero:'f',nome:'Ana'}; CF.salvar()"); pg.reload(); abre()
        check(f'[{tag}] jogo novo começa em São Bento', st()['cidadeAtual'] == SB and 'São Bento' in ev("document.getElementById('hRegiao').textContent"), errs[:2])
        check(f'[{tag}] Sapucaí-Mirim começa bloqueada', ev(f"CF.G.estadoCidade(CF.st,'{SM}').tipo") == 'bloqueada')
        r = ev(f"CF.G.viajar(CF.st,'{SM}')")
        check(f'[{tag}] não dá para viajar para cidade bloqueada', not r['ok'] and st()['cidadeAtual'] == SB, r)

        # joga São Bento até o fim (estado em memória, como se tivesse jogado) e recarrega: o prêmio sai na abertura
        ev("""(()=>{const s=CF.st; s.cont={plantar:{'*':12},colher:{'*':40},alimentar:{'*':9},entregar:{'*':6},produzir:{queijo:2,'*':2}};
          s.padaria.construida=true; s.casas={casa1:true,casa2:true,casa3:true}; s.xp=400; s.nivel=5; s.canteiros[0].cultura='milho'; s.canteiros[0].plantadoEm=Date.now(); CF.salvar();})()""")
        pg.reload(); abre()
        s = st()
        check(f'[{tag}] concluir São Bento dá o prêmio e libera Sapucaí-Mirim', s['cidades'].get(SB, {}).get('premio') and ev(f"CF.G.estadoCidade(CF.st,'{SM}').tipo") == 'disponivel', s['cidades'])
        check(f'[{tag}] objetivos de Sapucaí-Mirim não contam o que foi feito em São Bento', ev(f"CF.G.progressoCidade(CF.st,'{SM}').feitos") == 0)
        ev("document.getElementById('modal').className='hidden'")

        # viaja pelo mapa
        ev("CF.rg.abrir()"); pg.wait_for_timeout(300)
        pg.click(f".rgCity[data-id='{SM}']", force=True); pg.wait_for_timeout(300)
        check(f'[{tag}] painel da cidade mostra o botão de viajar', pg.locator(f"[data-act='viajar:{SM}']").count() == 1)
        moedas = s['moedas']
        with pg.expect_navigation(): pg.click(f"[data-act='viajar:{SM}']", force=True)
        abre(); s = st()
        check(f'[{tag}] chega em Sapucaí-Mirim', s['cidadeAtual'] == SM and ev("document.getElementById('hRegiao').textContent") == 'Sapucaí-Mirim', s['cidadeAtual'])
        check(f'[{tag}] fazenda nova: sem padaria e sem casas', not s['padaria']['construida'] and s['casas'] == {})
        check(f'[{tag}] moedas, nível e celeiro vão junto', s['moedas'] == moedas and s['nivel'] >= 5)
        check(f'[{tag}] fazenda de São Bento fica guardada', s['fazendas'][SB]['padaria']['construida'] and len(s['fazendas'][SB]['casas']) == 3 and s['fazendas'][SB]['canteiros'][0]['cultura'] == 'milho')
        check(f'[{tag}] São Bento continua concluída estando fora', ev(f"CF.G.estadoCidade(CF.st,'{SB}').tipo") == 'concluida')
        check(f'[{tag}] mostra as boas-vindas', 'Sapucaí-Mirim' in ev("document.getElementById('toast').textContent"))
        check(f'[{tag}] pedidos são de vizinhos de Sapucaí-Mirim', all(e['nome'] in ev(f"CF.G.viajar && JSON.parse(JSON.stringify(CF.st.entregas.map(e=>e.nome)))") for e in s['entregas']))
        ev("(()=>{const i=CF.st.canteiros.findIndex(c=>c.liberado&&!c.cultura); CF.st.sementes.milho=5; CF.G.plantar(CF.st,i,'milho');})()")
        ob = ev(f"CF.G.objetivos(CF.st,'{SM}')")
        check(f'[{tag}] plantar em Sapucaí-Mirim conta no objetivo da cidade', ob[0]['feito'] == 1, ob[0])
        pg.screenshot(path=f'/tmp/cidade2_{tag}.png')

        # volta para São Bento
        ev("CF.salvar()")
        with pg.expect_navigation(): ev(f"(()=>{{const r=CF.G.viajar(CF.st,'{SB}'); CF.salvar(); location.reload(); return r}})()")
        abre(); s = st()
        check(f'[{tag}] volta para São Bento com a fazenda de antes', s['cidadeAtual'] == SB and s['padaria']['construida'] and len(s['casas']) == 3 and SM in s['fazendas'])
        check(f'[{tag}] o objetivo de Sapucaí-Mirim fica guardado na volta', ev(f"CF.G.objetivos(CF.st,'{SM}')[0].feito") == 1)

        # save mexido à mão: estar em Sapucaí-Mirim sem ter concluído São Bento
        novo = ev("JSON.stringify(CF.G.novoJogo())")
        grava_save(f"""(()=>{{localStorage.clear(); const s=JSON.parse({json.dumps(novo)}); s.cidadeAtual='{SM}'; s.chegadas={{'{SM}':{{em:1,base:{{}}}}}}; s.perfil={{genero:'m',nome:'Zé'}};
          const d=JSON.stringify(s); localStorage.setItem('conecta_fazenda_save_v1', JSON.stringify({{v:1,d,h:'x'}}));}})()""")
        check(f'[{tag}] save mexido à mão não deixa entrar em cidade bloqueada', st()['cidadeAtual'] == SB and ev(f"CF.G.estadoCidade(CF.st,'{SM}').tipo") == 'bloqueada')
        check(f'[{tag}] sem erros na página', not errs, errs[:3])
        b.close()

run({'width': 1280, 'height': 800}, False)
run({'width': 390, 'height': 844}, True)
falhas = [n for n, ok in res if not ok]
print(f'\n{len(res) - len(falhas)}/{len(res)} passaram')
sys.exit(1 if falhas else 0)
