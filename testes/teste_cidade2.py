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
        check(f'[{tag}] cenário próprio: praça da Matriz com a igreja', ev("CF.E.sprites.some(s=>s.tag==='igreja')"))
        x, y = ev("(()=>{const s=CF.E.sprites.find(s=>s.tag==='igreja'); CF.E.setZoom(1); CF.E.centerOn(s.x, s.y-60); const p=CF.E.toScreen(s.x, s.y-60); return CF.pagina(p.x,p.y)})()")
        ev("document.getElementById('toast').textContent=''"); pg.wait_for_timeout(200); pg.mouse.click(x, y); pg.wait_for_timeout(1500)
        check(f'[{tag}] tocar na igreja mostra o nome', 'Matriz' in ev("document.getElementById('toast').textContent"), ev("document.getElementById('toast').textContent"))
        lim = ev("CF.E.limites")
        check(f'[{tag}] dá para rolar além da fazenda (lados e embaixo)', lim['x0'] < 0 and lim['x1'] > 1800 and lim['y1'] > 2340, lim)
        ev("CF.E.setZoom(0.01); CF.E.centerOn(-900, 1500)"); pg.wait_for_timeout(200)
        check(f'[{tag}] câmera chega aos arredores e o zoom afasta mais', ev("CF.E.cam.x") < -500 and ev("CF.E.minZoom") < ev("Math.max(CF.E.vw/1800, CF.E.vh/2340)"))
        check(f'[{tag}] arredores com mata, cachoeiras e bichos dos vizinhos', ev("CF.E.sprites.filter(s=>s.tag==='arredor').length") > 150 and ev("CF.S.vizinhos.length") >= 8)
        check(f'[{tag}] letreiro da cidade no fundo da fazenda', ev("CF.E.sprites.some(s=>s.tag==='letreiro')"))
        # layout próprio: canteiros, sede e celeiro em outro lugar que em São Bento
        p0 = ev("__mods['scene.js'].plotPos(4)")
        pos = ev("(()=>{const t=n=>CF.E.sprites.find(s=>s.tag===n); return [t('casa').x,t('celeiro').x]})()")
        check(f'[{tag}] fazenda com outro desenho (canteiros, sede e celeiro)', (p0['x'], p0['y']) != (880, 1040) and pos[0] > 1200 and pos[1] < 700, [p0, pos])
        i_vazio = ev("CF.st.canteiros.findIndex((c,i)=>c.liberado&&!c.cultura)")
        x, y = ev(f"(()=>{{const p=__mods['scene.js'].plotPos({i_vazio}); CF.E.setZoom(1); CF.E.centerOn(p.x,p.y); const q=CF.E.toScreen(p.x,p.y); return CF.pagina(q.x,q.y)}})()")
        pg.mouse.click(x, y)
        try: pg.wait_for_function("!document.getElementById('sheet').classList.contains('hidden')", timeout=8000); aberto = True
        except Exception: aberto = False
        check(f'[{tag}] tocar num canteiro de Sapucaí-Mirim abre as sementes', aberto)
        ev("document.getElementById('shClose').click()"); pg.wait_for_timeout(300)
        viz = ev(f"__mods['data.js'].REGIOES.find(r=>r.id==='{SM}').vizinhos")
        check(f'[{tag}] pedidos são de vizinhos de Sapucaí-Mirim', s['entregas'] and all(e['nome'] in viz for e in s['entregas']), [e['nome'] for e in s['entregas']])
        ev("(()=>{const i=CF.st.canteiros.findIndex(c=>c.liberado&&!c.cultura); CF.st.sementes.milho=5; CF.G.plantar(CF.st,i,'milho');})()")
        ob = ev(f"CF.G.objetivos(CF.st,'{SM}')")
        check(f'[{tag}] plantar em Sapucaí-Mirim conta no objetivo da cidade', ob[0]['feito'] == 1, ob[0])
        pg.screenshot(path=f'/tmp/cidade2_{tag}.png')

        # volta para São Bento
        ev("CF.salvar()")
        with pg.expect_navigation(): ev(f"(()=>{{const r=CF.G.viajar(CF.st,'{SB}'); CF.salvar(); location.reload(); return r}})()")
        abre(); s = st()
        check(f'[{tag}] volta para São Bento com a fazenda de antes', s['cidadeAtual'] == SB and s['padaria']['construida'] and len(s['casas']) == 3 and SM in s['fazendas'])
        check(f'[{tag}] São Bento continua com o pomar e sem a igreja', not ev("CF.E.sprites.some(s=>s.tag==='igreja')") and ev("CF.E.sprites.filter(s=>s.img===CF.IMG.arvore_frutifera).length") >= 10)
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
