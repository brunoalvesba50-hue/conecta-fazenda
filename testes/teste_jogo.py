"""Testes automáticos do Conecta Fazenda (Playwright + Chromium).
Como rodar:  python3 -m http.server 8765   (na pasta do jogo)   e depois   python3 testes/teste_jogo.py
O tempo do jogo é adiantado mudando o relógio do navegador (as plantas crescem pelo relógio real)."""
import sys, json, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8765/index.html'
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
res = []
def check(nome, ok, info=''):
    res.append((nome, bool(ok))); print(('OK    ' if ok else 'FALHA ') + nome + (f'  -> {info}' if info != '' else ''), flush=True)

def run(viewport, mobile):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        ctx = b.new_context(viewport=viewport, has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
        pg = ctx.new_page(); ev = pg.evaluate; errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        T = [int(time.time() * 1000)]
        pg.clock.install(time=T[0] / 1000)
        pg.clock.resume()
        def avanca(seg):
            T[0] = int(ev('Date.now()')) + int(seg * 1000); pg.clock.set_system_time(T[0] / 1000); pg.wait_for_timeout(450)
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st', timeout=15000); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(600)
        ev("localStorage.clear()"); pg.reload(); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(700)
        T[0] = int(ev("Date.now()"))
        tag = 'celular' if mobile else 'computador'
        def tela(wx, wy):
            return ev(f"(()=>{{const s=CF.E.toScreen({wx},{wy});return CF.pagina(s.x,s.y)}})()")
        def toque_mundo(wx, wy):
            ev(f"CF.E.centerOn({wx},{wy})"); pg.wait_for_timeout(120)
            x, y = tela(wx, wy); pg.mouse.click(x, y); pg.wait_for_timeout(300)
        def plot(i): return ev(f"(()=>{{const r=Math.floor({i}/3),c={i}%3;return [880+(c-r)*80,1040+(c+r-2)*46]}})()")
        def tocar_canteiro(i):
            x, y = plot(i); toque_mundo(x, y)
        st = lambda: ev("JSON.parse(JSON.stringify(CF.st))")
        def btn(sel): pg.click(sel, force=True); pg.wait_for_timeout(250)

        check(f'[{tag}] abre sem erros e mostra a fazenda', not errs and ev("!!document.querySelector('#hud:not(.hidden)')"), errs[:2])
        s = st(); check(f'[{tag}] começa com 100 moedas, nível 1', s['moedas'] == 100 and s['nivel'] == 1)
        check(f'[{tag}] mostra São Bento do Sapucaí', 'São Bento do Sapucaí' in ev("document.getElementById('hRegiao').textContent"))
        check(f'[{tag}] barra de baixo cabe na tela', ev("(()=>{const r=document.querySelector('.bottom').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()"))
        # 1) colher o milho que já começa pronto
        g0 = st()['celeiro']['itens'].get('milho', 0); tocar_canteiro(1); s = st()
        check(f'[{tag}] tocar no milho pronto colhe e vai para o celeiro', s['celeiro']['itens'].get('milho', 0) - g0 == 2 and s['xp'] == 3, s['celeiro'])
        # 2) plantar: tocar em canteiro vazio abre as sementes
        tocar_canteiro(0)
        check(f'[{tag}] canteiro vazio abre a escolha de sementes', ev("!document.getElementById('sheet').classList.contains('hidden')") and 'Milho' in ev("document.getElementById('shBody').innerText"))
        pg.click("[data-act='escolher:milho']"); pg.wait_for_timeout(300); s = st()
        check(f'[{tag}] escolher milho planta no canteiro tocado', s['canteiros'][0]['cultura'] == 'milho' and s['sementes'].get('milho') == 5)
        check(f'[{tag}] entra no modo plantar (barra de aviso)', ev("!document.getElementById('plantBar').classList.contains('hidden')"))
        tocar_canteiro(1); tocar_canteiro(4); s = st()
        check(f'[{tag}] modo plantar: tocar planta direto', s['canteiros'][1]['cultura'] == 'milho' and s['canteiros'][4]['cultura'] == 'milho' and s['sementes'].get('milho') == 3, [c['cultura'] for c in s['canteiros']])
        btn('#pbOk')
        e = ev("CF.G.estadoCanteiro(CF.st,0)")
        check(f'[{tag}] plantação começa na primeira fase', e['tipo'] == 'crescendo' and e['fase'] == 1, e)
        # missão 1
        check(f'[{tag}] missão "Plante 3 milhos" completa', ev("CF.G.missaoAtual(CF.st).completa"))
        m0 = st()['moedas']; btn('#mChip'); s = st()
        check(f'[{tag}] receber prêmio da missão dá moedas e passa para a próxima', s['moedas'] == m0 + 20 and s['missao']['idx'] == 1)
        # 3) crescer com o tempo
        avanca(31); e = ev("CF.G.estadoCanteiro(CF.st,0)")
        check(f'[{tag}] na metade do tempo está numa fase do meio', e['tipo'] == 'crescendo' and 2 <= e['fase'] <= 4, e)
        avanca(31); e = ev("CF.G.estadoCanteiro(CF.st,0)")
        check(f'[{tag}] depois de 60s fica pronto para colher', e['tipo'] == 'pronto' and e['fase'] == 5, e)
        try: pg.wait_for_function("['3','4'].includes(document.getElementById('dColher').textContent)", timeout=4000)
        except Exception: pass
        check(f'[{tag}] botão Colher mostra quantos estão prontos', ev("document.getElementById('dColher').textContent") in ('3', '4'), ev("[document.getElementById('dColher').textContent,CF.st.canteiros.map((c,i)=>CF.G.estadoCanteiro(CF.st,i).tipo).join(',')]"))
        btn("nav.bottom button[data-a='colher']"); s = st()
        check(f'[{tag}] Colher colhe tudo de uma vez', s['celeiro']['itens'].get('milho', 0) >= 8, s['celeiro']['itens'])
        # 4) vender no celeiro
        btn('#bCeleiro'); m0 = st()['moedas']
        pg.click("[data-act='vender:milho:1']"); pg.wait_for_timeout(250); s = st()
        check(f'[{tag}] vender 1 milho dá 6 moedas', s['moedas'] == m0 + 6)
        btn('#shClose')
        # 5) comprar sementes
        btn("nav.bottom button[data-a='plantar']"); m0 = st()['moedas']; sm = st()['sementes'].get('alface', 0)
        pg.click("[data-act='comprar:alface:5']"); pg.wait_for_timeout(250); s = st()
        check(f'[{tag}] comprar 5 sementes de alface gasta 15 moedas', s['moedas'] == m0 - 15 and s['sementes'].get('alface') == sm + 5)
        check(f'[{tag}] tomate bloqueado no nível 1', 'Libera no nível 2' in ev("document.getElementById('shBody').innerText"))
        btn('#shClose')
        # 6) animais: alimentar a vaca tocando nela
        A = ev("(()=>{const b=CF.S.animals[0].spr.bounds();return [b.x+b.w*.5,b.y+b.h*.4]})()")
        ev("CF.S.animals.forEach(a=>{a.mode='idle';a.timer=999;a.tx=a.x;a.ty=a.y})")
        toque_mundo(A[0], A[1]); s = st()
        check(f'[{tag}] tocar na vaca alimenta (gasta 2 milhos)', s['animais'][0]['comeuEm'] > 0, s['animais'][0])
        avanca(91)
        A = ev("(()=>{const b=CF.S.animals[0].spr.bounds();return [b.x+b.w*.5,b.y+b.h*.4]})()"); toque_mundo(A[0], A[1]); s = st()
        check(f'[{tag}] depois do tempo, tocar coleta o leite', s['celeiro']['itens'].get('leite') == 1, s['celeiro']['itens'])
        btn("nav.bottom button[data-a='animais']"); pg.click("[data-act='alimentarTodos']"); pg.wait_for_timeout(250); s = st()
        check(f'[{tag}] "Alimentar todos" alimenta os animais com fome', sum(1 for a in s['animais'] if a['comeuEm'] > 0) >= 3, [a['comeuEm'] > 0 for a in s['animais']])
        btn('#shClose')
        # 7) entrega
        ev("CF.st.celeiro.itens.milho=(CF.st.celeiro.itens.milho||0)+1;CF.st.entregas[0]={id:'t1',nome:'Dona Cida',pede:{milho:1},moedas:30,xp:5};CF.salvar()")
        btn('#bMissoes'); pg.click("[data-act='aba:entregas']"); pg.wait_for_timeout(200); m0 = st()['moedas']
        pg.click("[data-act='entregar:0']"); pg.wait_for_timeout(300); s = st()
        check(f'[{tag}] entrega paga as moedas e aparece outro pedido', s['moedas'] == m0 + 30 and len(s['entregas']) == 3 and s['entregas'][0]['id'] != 't1')
        btn('#shClose')
        # 8) nível 2 (modal) e liberar canteiro
        ev("CF.st.moedas+=0"); xp0 = st()['xp']
        ev("(()=>{const r=CF.G.ganhaXp(CF.st,40-CF.st.xp);})()")
        check(f'[{tag}] XP suficiente sobe para o nível 2', st()['nivel'] == 2)
        btn("nav.bottom button[data-a='construir']"); m0 = st()['moedas']
        pg.click("[data-act='liberar:6']"); pg.wait_for_timeout(300); s = st()
        check(f'[{tag}] liberar canteiro gasta 60 moedas e libera', s['canteiros'][6]['liberado'] and s['moedas'] == m0 - 60 + (40 if s['nivel'] == 3 else 0), s['moedas'])
        # 9) padaria
        ev("CF.st.moedas+=200;CF.salvar()"); pg.wait_for_timeout(1100)
        pg.click("[data-act='padaria']"); pg.wait_for_timeout(300)
        check(f'[{tag}] construir a padaria', st()['padaria']['construida'])
        btn('#shClose')
        ev("CF.st.celeiro.itens.leite=3")
        btn("nav.bottom button[data-a='produzir']"); pg.wait_for_timeout(1100); pg.click("[data-act='produzir:queijo']"); pg.wait_for_timeout(250); s = st()
        check(f'[{tag}] produzir queijo usa 3 leites', s['padaria']['fila'] and s['padaria']['fila']['receita'] == 'queijo' and not s['celeiro']['itens'].get('leite'))
        avanca(91); pg.wait_for_timeout(1100); pg.click("[data-act='coletarProd']"); pg.wait_for_timeout(250); s = st()
        check(f'[{tag}] depois de 90s coleta o queijo', s['celeiro']['itens'].get('queijo') == 1, s['celeiro']['itens'])
        btn('#shClose')
        # 10) botão + não abre loja de dinheiro real
        btn('#bGanhar'); t = ev("document.getElementById('shBody').innerText")
        check(f'[{tag}] "+" mostra como ganhar jogando (sem compra real)', 'dinheiro de verdade' in t and 'R$' not in t)
        btn('#shClose')
        # 11) salvar e recarregar
        antes = st(); ev("CF.salvar()"); pg.reload(); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(600); depois = st()
        iguais = all(antes[k] == depois[k] for k in ['moedas', 'xp', 'nivel', 'sementes', 'celeiro', 'canteiros', 'padaria', 'missao'])
        check(f'[{tag}] recarregar a página mantém tudo', iguais, [k for k in ['moedas', 'xp', 'nivel', 'sementes', 'celeiro', 'canteiros', 'padaria', 'missao'] if antes[k] != depois[k]])
        # 12) tempo passa com o jogo fechado
        tocar_canteiro(0)
        if ev("document.getElementById('sheet').classList.contains('hidden')") is False:
            pg.click("[data-act='escolher:alface']"); pg.wait_for_timeout(200); btn('#pbOk')
        ev("CF.salvar()"); T[0] = int(ev('Date.now()')) + 50000; pg.close()
        pg = ctx.new_page(); ev = pg.evaluate; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.install(time=T[0] / 1000); pg.clock.resume()
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(500)
        check(f'[{tag}] a alface cresceu com o jogo fechado', ev("CF.G.estadoCanteiro(CF.st,0).tipo") == 'pronto', ev("CF.G.estadoCanteiro(CF.st,0)"))
        # 13) save danificado (gravado antes do jogo abrir)
        def abre_com_save(valor_js):
            p2 = ctx.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
            p2.add_init_script("try{localStorage.setItem('conecta_fazenda_save_v1',"+valor_js+")}catch(_){}")
            p2.goto(URL); p2.wait_for_function('window.CF && window.CF.st'); p2.evaluate('CF.tut&&CF.tut.pular()'); p2.wait_for_timeout(400); return p2
        pg.close()
        p2 = abre_com_save("'{quebrado'")
        check(f'[{tag}] save danificado não trava o jogo', p2.evaluate("CF.st.moedas") == 100 and p2.evaluate("!!localStorage.getItem('conecta_fazenda_backup')"))
        p2.close()
        estranho = "(()=>{const d=JSON.stringify({moedas:-50,xp:'abc',sementes:{milho:'x',ouro:999},celeiro:{itens:{milho:5,diamante:9}},canteiros:[{liberado:true,cultura:'bomba',plantadoEm:5}]});return JSON.stringify({v:1,d,h:'0'})})()"
        pg = abre_com_save(estranho); ev = pg.evaluate; s = st()
        check(f'[{tag}] valores estranhos no save são corrigidos', s['moedas'] == 0 and s['xp'] == 0 and 'ouro' not in s['sementes'] and s['celeiro']['itens'] == {'milho': 5} and s['canteiros'][0]['cultura'] is None, s['sementes'])
        pg.screenshot(path=f'/tmp/claude-0/cft/teste_{tag}.png')
        check(f'[{tag}] sem erros de script', not errs, errs[:3])
        b.close()

run({'width': 1280, 'height': 800}, False)
run({'width': 390, 'height': 844}, True)

print(f"\n{len(res)} testes, {sum(1 for r in res if not r[1])} falhas")


# ---------------------------------------------------------------- mapa: zoom, arraste, estradas
def run_mapa(viewport, mobile):
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        ctx = b.new_context(viewport=viewport, has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
        pg = ctx.new_page(); ev = pg.evaluate; errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); ev("localStorage.clear()"); pg.reload(); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(600)
        tag = 'mapa-celular' if mobile else 'mapa-computador'
        cam = lambda: ev("({x:CF.E.cam.x,y:CF.E.cam.y,z:CF.E.cam.zoom})")
        PE = """((pts,type)=>{const cv=document.getElementById('game');for(const q of pts){const [px,py]=CF.pagina(q[1],q[2]);cv.dispatchEvent(new PointerEvent(type,{pointerId:q[0],clientX:px,clientY:py,bubbles:true,pointerType:'touch',isPrimary:q[0]===1,button:0,buttons:type==='pointerup'?0:1}))}})"""
        def ptr(pts, t): ev(PE + f"({json.dumps(pts)},'{t}')")
        W, H = ev('CF.E.vw'), ev('CF.E.vh')
        # 1) arrastar com um dedo
        ev("CF.E.setZoom(1);CF.E.centerOn(900,800)"); c0 = cam(); fic0 = json.dumps(ev("CF.st.canteiros"))
        ptr([[1, W/2, H/2]], 'pointerdown')
        for k in range(1, 9): ptr([[1, W/2 - k*15, H/2 - k*8]], 'pointermove')
        ptr([[1, W/2 - 120, H/2 - 64]], 'pointerup'); c1 = cam()
        check(f'[{tag}] arrastar com um dedo move o mapa', abs((c1['x'] - c0['x']) - 120) < 3 and abs((c1['y'] - c0['y']) - 64) < 3, (c1['x'] - c0['x'], c1['y'] - c0['y']))
        # 2) pinça: afastar os dedos aproxima, o ponto entre os dedos fica no lugar
        ev("CF.E.setZoom(.8);CF.E.centerOn(880,1000)"); pl = ev("(()=>{const s=CF.E.toScreen(880,1040);return [s.x,s.y]})()")
        mx, my = pl; w0 = ev(f"CF.E.toWorld({mx},{my})"); z0 = cam()['z']
        ptr([[1, mx - 40, my], [2, mx + 40, my]], 'pointerdown')
        for k in range(1, 11): ptr([[1, mx - 40 - k*8, my], [2, mx + 40 + k*8, my]], 'pointermove')
        z1 = cam()['z']; w1 = ev(f"CF.E.toWorld({mx},{my})")
        ptr([[2, mx + 120, my]], 'pointerup'); ptr([[1, mx - 120, my]], 'pointerup'); pg.wait_for_timeout(200)
        check(f'[{tag}] dois dedos se afastando aproximam o mapa', z1 > z0 * 1.6, (z0, z1))
        check(f'[{tag}] o ponto entre os dedos não salta', abs(w1['x'] - w0['x']) < 2 and abs(w1['y'] - w0['y']) < 2, (w0, w1))
        check(f'[{tag}] a pinça em cima de um canteiro não planta nem colhe', json.dumps(ev("CF.st.canteiros")) == fic0 and ev("document.getElementById('sheet').classList.contains('hidden')"))
        # dedos se aproximando afastam
        ptr([[1, mx - 150, my], [2, mx + 150, my]], 'pointerdown')
        for k in range(1, 11): ptr([[1, mx - 150 + k*12, my], [2, mx + 150 - k*12, my]], 'pointermove')
        z2 = cam()['z']; ptr([[1, mx - 30, my]], 'pointerup'); ptr([[2, mx + 30, my]], 'pointerup')
        check(f'[{tag}] dois dedos se aproximando afastam o mapa', z2 < z1 * .6, (z1, z2))
        # 3) botões
        ev("CF.E.setZoom(.9)"); z = cam()['z']; ev("document.getElementById('zIn').click()"); pg.wait_for_timeout(500)
        check(f'[{tag}] botão + aproxima', cam()['z'] > z * 1.2)
        z = cam()['z']; ev("document.getElementById('zOut').click()"); pg.wait_for_timeout(500)
        check(f'[{tag}] botão − afasta', cam()['z'] < z * .85)
        ev("document.getElementById('zAll').click()"); pg.wait_for_timeout(800)
        vis = ev("(()=>{const a=CF.E.toScreen(0,0),b=CF.E.toScreen(CF.WORLD.w,CF.WORLD.h);return [a.x,a.y,b.x,b.y,CF.E.vw,CF.E.vh]})()")
        check(f'[{tag}] visão geral: o mapa cobre a tela toda (nada vazio fora do mapa)', vis[0] <= .5 and vis[1] <= .5 and vis[2] >= vis[4] - .5 and vis[3] >= vis[5] - .5, vis)
        # pinça para afastar ao máximo e arrastar para os cantos: continua sem nada fora do mapa
        for dx, dy in [(-3000, -3000), (3000, 3000), (-3000, 3000), (3000, -3000)]:
            ev(f"CF.E.cam.x+={dx};CF.E.cam.y+={dy};CF.E.clamp()")
            v2 = ev("(()=>{const a=CF.E.toScreen(0,0),b=CF.E.toScreen(CF.WORLD.w,CF.WORLD.h);return a.x<=.5&&a.y<=.5&&b.x>=CF.E.vw-.5&&b.y>=CF.E.vh-.5})()")
            if not v2: break
        check(f'[{tag}] afastado e arrastado até os cantos: nunca aparece área vazia', v2)
        ev("document.getElementById('zOut').click()"); pg.wait_for_timeout(500)
        check(f'[{tag}] não afasta além da visão geral', abs(cam()['z'] - ev("CF.E.minZoom")) < .001)
        ev("document.getElementById('zHome').click()"); pg.wait_for_timeout(800)
        check(f'[{tag}] botão centralizar volta para a fazenda', ev("(()=>{const s=CF.E.toScreen(880,1000);return s.x>0&&s.x<CF.E.vw&&s.y>0&&s.y<CF.E.vh})()"))
        for _ in range(12): ev("document.getElementById('zIn').click()"); pg.wait_for_timeout(80)
        pg.wait_for_timeout(400)
        check(f'[{tag}] limite máximo de zoom', abs(cam()['z'] - ev("CF.E.maxZoom")) < .001 and ev("document.getElementById('zIn').disabled"))
        # 4) canteiro continua tocável no zoom máximo e no mínimo
        for zz in ['CF.E.maxZoom', 'CF.E.minZoom*1.05']:
            ev(f"CF.E.setZoom({zz});CF.E.centerOn(800,994)"); pg.wait_for_timeout(150)
            x, y = ev("(()=>{const s=CF.E.toScreen(800,994);return CF.pagina(s.x,s.y)})()")
            antes = ev("CF.st.canteiros[3].cultura")
            pg.mouse.click(x, y); pg.wait_for_timeout(300)
            aberto = not ev("document.getElementById('sheet').classList.contains('hidden')")
            check(f'[{tag}] canteiro tocável com zoom {"máximo" if "max" in zz else "mínimo"}', antes is None and aberto)
            pg.click('#shClose', force=True); pg.wait_for_timeout(200)
        # 5) roda do mouse (computador): zoom em volta do cursor
        if not mobile:
            ev("CF.E.setZoom(.8);CF.E.centerOn(900,900)"); w0 = ev("CF.E.toWorld(300,300)")
            pg.mouse.move(300, 300); pg.mouse.wheel(0, -300); pg.wait_for_timeout(300); w1 = ev("CF.E.toWorld(300,300)")
            check(f'[{tag}] roda do mouse aproxima mantendo o ponto do cursor', cam()['z'] > .8 and abs(w1['x'] - w0['x']) < 2 and abs(w1['y'] - w0['y']) < 2, (w0, w1))
            ev("CF.E.setZoom(1)"); c0 = cam(); pg.mouse.move(600, 400); pg.mouse.down(); pg.mouse.move(500, 350, steps=6); pg.mouse.up(); c1 = cam()
            check(f'[{tag}] arrastar com o mouse move o mapa', abs((c1['x'] - c0['x']) - 100) < 3)
        # 6) estradas: rede ligada, sem trechos repetidos, sem passar por construções
        R = ev("""(async()=>{const m=await import('./src/roads.js');const g=m.geometria();
          const pares=m.TRECHOS.map(t=>[t.de,t.ate].sort().join('|'));
          const nomes=Object.keys(m.PONTOS);const viz={};nomes.forEach(n=>viz[n]=[]);m.TRECHOS.forEach(t=>{viz[t.de].push(t.ate);viz[t.ate].push(t.de)});
          const vis=new Set([nomes[0]]);const fila=[nomes[0]];while(fila.length){const a=fila.pop();for(const b of viz[a])if(!vis.has(b)){vis.add(b);fila.push(b)}}
          const pontas=g.every(s=>{const a=m.PONTOS[s.de],b=m.PONTOS[s.ate],p0=s.pts[0],p1=s.pts[s.pts.length-1];return Math.hypot(p0[0]-a.x,p0[1]-a.y)<1&&Math.hypot(p1[0]-b.x,p1[1]-b.y)<1});
          const tags=['casa','celeiro','padaria','galinheiro','curral','deposito','silo'];const blocos=CF.E.sprites.filter(s=>tags.includes(s.tag)).map(s=>{const b=s.bounds();return {tag:s.tag,x0:b.x+b.w*.08,x1:b.x+b.w*.92,y0:b.y+b.h*.3,y1:b.y+b.h-18}});
          const poco=CF.E.sprites.find(s=>s.img&&s.img.src.includes('poco'));if(poco){const b=poco.bounds();blocos.push({tag:'poco',x0:b.x+10,x1:b.x+b.w-10,y0:b.y+b.h*.3,y1:b.y+b.h-12})}
          for(const L of CF.S.lotes)blocos.push({tag:'vila_'+L.c.id,x0:L.x-78,x1:L.x+78,y0:L.y-95,y1:L.y+8});
          const invade=[];for(const s of g)for(const q of s.pts)for(const k of blocos){if(q[0]>k.x0&&q[0]<k.x1&&q[1]>k.y0&&q[1]<k.y1)invade.push(k.tag+':'+s.de+'>'+s.ate)}
          let maxPasso=0;for(const s of g)for(let i=1;i<s.pts.length;i++)maxPasso=Math.max(maxPasso,Math.hypot(s.pts[i][0]-s.pts[i-1][0],s.pts[i][1]-s.pts[i-1][1]));
          let maxCurva=0;for(const s of g)for(let i=2;i<s.pts.length;i++){const a=Math.atan2(s.pts[i-1][1]-s.pts[i-2][1],s.pts[i-1][0]-s.pts[i-2][0]),b=Math.atan2(s.pts[i][1]-s.pts[i-1][1],s.pts[i][0]-s.pts[i-1][0]);let d=Math.abs(a-b);if(d>Math.PI)d=2*Math.PI-d;maxCurva=Math.max(maxCurva,d)}
          return {dup:pares.length-new Set(pares).size,ligado:vis.size===nomes.length,pontas,invade:[...new Set(invade)],soltos:nomes.filter(n=>!viz[n].length),maxPasso,maxCurva}})()""")
        check(f'[{tag}] estradas: nenhum trecho repetido', R['dup'] == 0)
        check(f'[{tag}] estradas: rede toda ligada, sem ponto solto', R['ligado'] and not R['soltos'], R['soltos'])
        check(f'[{tag}] estradas: cada trecho começa e termina num ponto da rede', R['pontas'])
        check(f'[{tag}] estradas: não atravessam casa, celeiro, padaria, galinheiro, curral, galpão, silo, poço nem casas da vila', not R['invade'], R['invade'][:5])
        check(f'[{tag}] estradas: curvas suaves (sem quinas)', R['maxPasso'] < 12 and R['maxCurva'] < .5, (round(R['maxPasso'], 1), round(R['maxCurva'], 2)))
        pg.screenshot(path=f'/tmp/claude-0/cft/{tag}.png')
        check(f'[{tag}] sem erros de script', not errs, errs[:3])
        b.close()

run_mapa({'width': 1280, 'height': 800}, False)
run_mapa({'width': 390, 'height': 844}, True)

def run_extras():
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce', has_touch=True, is_mobile=True)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(500)
        pg.evaluate("document.getElementById('zAll').click()"); pg.wait_for_timeout(120)
        check('[movimento reduzido] visão geral sem animação (imediata)', abs(pg.evaluate('CF.E.cam.zoom') - pg.evaluate('CF.E.minZoom')) < .001)
        prevent = pg.evaluate("(()=>{const e=new Event('gesturestart',{cancelable:true});document.dispatchEvent(e);return e.defaultPrevented})()")
        check('[iPhone] gesto de zoom da página é bloqueado (só o mapa amplia)', prevent)
        check('[extras] sem erros de script', not errs, errs[:3])
        ctx2 = b.new_context(viewport={'width': 1280, 'height': 800}); pg2 = ctx2.new_page(); pg2.goto(URL); pg2.wait_for_function('window.CF && window.CF.st'); pg2.evaluate('CF.tut&&CF.tut.pular()'); pg2.wait_for_timeout(500)
        x, y = pg2.evaluate("(()=>{const b=CF.S.celeiro.bounds();const s=CF.E.toScreen(b.x+b.w/2,b.y+b.h*.6);return [s.x,s.y]})()")
        pg2.mouse.move(x, y); pg2.wait_for_timeout(150); pg2.mouse.move(x + 2, y + 2); pg2.wait_for_timeout(150)
        check('[computador] mãozinha em cima do celeiro', pg2.evaluate("document.getElementById('game').style.cursor") == 'pointer')
        b.close()
run_extras()

def run_telas():
    for (w, h) in [(360, 640), (375, 667), (390, 844), (430, 932), (412, 915), (768, 1024), (844, 390), (1280, 800)]:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=CHROME)
            mob = w < 1000
            ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=mob, is_mobile=mob and w < 900, device_scale_factor=2 if mob else 1)
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); pg.evaluate('CF.tut&&CF.tut.pular()'); pg.wait_for_timeout(500)
            tag = f'[tela {w}x{h} {"em pé" if h > w else "deitada"}]'
            R = pg.evaluate("""(()=>{const vis=(b)=>{const a=CF.E.toScreen(b.x,b.y),c=CF.E.toScreen(b.x+b.w,b.y+b.h);const x0=Math.max(0,a.x),x1=Math.min(CF.E.vw,c.x),y0=Math.max(0,a.y),y1=Math.min(CF.E.vh,c.y);return Math.max(0,x1-x0)*Math.max(0,y1-y0)/((c.x-a.x)*(c.y-a.y))};
              const ok=(x,y)=>{const s=CF.E.toScreen(x,y);return s.x>0&&s.x<CF.E.vw&&s.y>0&&s.y<CF.E.vh-80};
              const r=s=>document.querySelector(s).getBoundingClientRect();const dentro=s=>{const q=r(s);return q.left>=-1&&q.top>=-1&&q.right<=innerWidth+1&&q.bottom<=innerHeight+1};
              const sobre=(a,b)=>{const p=r(a),q=r(b);return !(p.right<=q.left||q.right<=p.left||p.bottom<=q.top||q.bottom<=p.top)};
              return {gir:document.body.classList.contains('girado'),vertical:CF.E.vh>CF.E.vw,casa:vis(CF.S.casa.bounds()),cel:vis(CF.S.celeiro.bounds()),
                pl:CF.S.plots.slice(0,6).every(P=>ok(P.x,P.y)),uniforme:CF.E.sprites.every(s=>!s.img||Math.abs(s.sx-s.sy)<.03),
                cantos:['.hLvl','.hRes','.sideL','.sideR','.bottom .big','.quick','.bottom .big:last-child'].every(dentro),
                semSobrepor:!sobre('.hLvl','.hRes')&&!sobre('.sideL','.bottom')&&!sobre('.sideR','.bottom')&&!sobre('.quick','.bottom .big')&&!sobre('.quick','.bottom .big:last-child')}})()""")
            check(f'{tag} sem giro: o jogo usa a tela como está', not R['gir'] and R['vertical'] == (h > w), R)
            check(f'{tag} casa e celeiro aparecem (no máximo 15% cortado)', R['casa'] >= .85 and R['cel'] >= .85, (round(R['casa'], 2), round(R['cel'], 2)))
            check(f'{tag} canteiros na tela ao abrir', R['pl'])
            check(f'{tag} nada esticado', R['uniforme'])
            check(f'{tag} interface nos cantos, dentro da tela e sem botões um em cima do outro', R['cantos'] and R['semSobrepor'], R)
            x, y = pg.evaluate("(()=>{const P=CF.S.plots[0];const s=CF.E.toScreen(P.x,P.y);return CF.pagina(s.x,s.y)})()")
            (pg.touchscreen.tap if mob else pg.mouse.click)(x, y); pg.wait_for_timeout(400)
            check(f'{tag} tocar no canteiro funciona (abre as sementes)', not pg.evaluate("document.getElementById('sheet').classList.contains('hidden')"))
            pg.click('#shClose', force=True); pg.wait_for_timeout(200)
            pg.click("nav.bottom button[data-a='mercado']", force=True); pg.wait_for_timeout(300)
            check(f'{tag} Mercado abre com as abas comprar e vender', 'Comprar sementes' in pg.evaluate("document.getElementById('shBody').innerText") and pg.evaluate("document.getElementById('shTitle').textContent") == 'Mercado da Fazenda')
            pg.click("[data-act='mercado:vender']", force=True); pg.wait_for_timeout(250)
            check(f'{tag} aba vender mostra o celeiro', 'Guardado' in pg.evaluate("document.getElementById('shBody').innerText"))
            pg.click('#shClose', force=True); pg.wait_for_timeout(200)
            pg.evaluate("CF.E.setZoom(1);CF.E.centerOn(900,900)"); pg.wait_for_timeout(100)
            c0 = pg.evaluate("CF.E.cam.x"); x0, y0 = pg.evaluate("CF.pagina(CF.E.vw/2,CF.E.vh/2)"); x1, y1 = pg.evaluate("CF.pagina(CF.E.vw/2-100,CF.E.vh/2)")
            pg.evaluate(f"""(()=>{{const cv=document.getElementById('game');const f=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{{pointerId:1,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:true,buttons:t==='pointerup'?0:1}}));
              f('pointerdown',{x0},{y0});for(let k=1;k<=10;k++)f('pointermove',{x0}+({x1}-{x0})*k/10,{y0}+({y1}-{y0})*k/10);f('pointerup',{x1},{y1})}})()""")
            check(f'{tag} arrastar move o mapa no sentido certo', abs(pg.evaluate("CF.E.cam.x") - c0 - 100) < 3, pg.evaluate("CF.E.cam.x") - c0)
            pg.screenshot(path=f'/tmp/claude-0/cft/tela_{w}x{h}.png')
            check(f'{tag} sem erros de script', not errs, errs[:2])
            b.close()
run_telas()

def run_campanha():
    """tutorial, plantas novas, casas da vila, mapa da Mantiqueira e conclusão de São Bento"""
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        ev = pg.evaluate
        def carrega(limpa=False):
            if limpa: ev("localStorage.clear()")
            pg.reload(); pg.wait_for_function('window.CF&&window.CF.tut&&window.CF.rg'); pg.wait_for_timeout(600)
        pg.goto(URL); pg.wait_for_function('window.CF&&window.CF.tut'); carrega(True)
        vis = lambda sel: ev(f"(()=>{{const e=document.querySelector('{sel}');if(!e||e.classList.contains('hidden'))return false;const r=e.getBoundingClientRect();return getComputedStyle(e).display!=='none'&&r.width>0}})()")
        def toca(wx, wy):
            x, y = ev(f"(()=>{{const s=CF.E.toScreen({wx},{wy});return CF.pagina(s.x,s.y)}})()"); pg.touchscreen.tap(x, y); pg.wait_for_timeout(350)
        def mostra(wx, wy): ev(f"CF.E.setZoom(1);CF.E.centerOn({wx},{wy})"); pg.wait_for_timeout(120)
        T = '[campanha]'
        # --- 15 imagens de plantas (5 fases) carregam
        R = ev("""Promise.all(['alface','tomate','cenoura','milho'].flatMap(c=>[1,2,3,4,5].map(n=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth>0);i.onerror=()=>r(false);i.src='assets/img/'+c+'_'+n+'.webp'})))).then(a=>a.filter(Boolean).length)""")
        check(f'{T} 20 imagens de plantas (alface, tomate, cenoura e milho × 5 fases) carregam', R == 20, R)
        R = ev("(async()=>{const d=await import('./src/data.js');return Object.values(d.CULTURAS).every(c=>c.stages===5)})()")
        check(f'{T} toda cultura tem 5 fases', R)
        # --- tutorial
        check(f'{T} tutorial aparece num jogo novo, passo 1', vis('#tut') and ev("CF.tut.passo") == 0)
        pg.click('#tutOk', force=True); pg.wait_for_timeout(200)
        check(f'{T} botão "Vamos lá" vai ao passo 2 (colher)', ev("CF.tut.passo") == 1)
        P = ev("(()=>{const s=CF.st;const P=CF.S.plots.find(P=>CF.G.estadoCanteiro(s,P.i).tipo==='pronto');return P&&[P.x,P.y]})()")
        check(f'{T} existe um canteiro pronto para colher', bool(P))
        mostra(*P); toca(P[0], P[1] - 40)
        check(f'{T} colher de verdade avança o tutorial', ev("CF.tut.passo") == 2, ev("CF.tut.passo"))
        P = ev("(()=>{const s=CF.st;const P=CF.S.plots.find(P=>CF.G.estadoCanteiro(s,P.i).tipo==='vazio');return [P.x,P.y]})()")
        mostra(*P); toca(P[0], P[1])
        aberto = vis('#sheet')
        if aberto:
            pg.click("[data-act='escolher:alface']", force=True); pg.wait_for_timeout(300)
        check(f'{T} plantar alface pelo canteiro avança o tutorial', ev("CF.tut.passo") == 3, (aberto, ev("CF.tut.passo")))
        ev("document.getElementById('pbOk')&&document.getElementById('pbOk').click()")
        A = ev("(()=>{const A=CF.S.animals.find(A=>A.tipo==='vaca');return [A.x,A.y]})()")
        mostra(*A); toca(A[0], A[1] - 30)
        if ev("CF.tut.passo") == 3:  # a vaca anda pelo pasto; se o toque não pegou, usa o botão Animais
            if not vis('#sheet'): pg.click("nav.bottom [data-a='animais']", force=True); pg.wait_for_timeout(300)
            pg.click("[data-act^='alimentar:']:not([disabled])", force=True); pg.wait_for_timeout(300)
        check(f'{T} alimentar a vaca avança o tutorial', ev("CF.tut.passo") == 4, ev("CF.tut.passo"))
        if vis('#sheet'): pg.click('#shClose', force=True); pg.wait_for_timeout(200)
        check(f'{T} botão do Mercado fica destacado', ev("document.querySelector('[data-a=mercado]').classList.contains('tutAlvo')"))
        pg.click("nav.bottom button[data-a='mercado']", force=True); pg.wait_for_timeout(250)
        pg.click("[data-act='mercado:vender']", force=True); pg.wait_for_timeout(250)
        pg.click("[data-act^='vender:']", force=True); pg.wait_for_timeout(300)
        check(f'{T} vender no Mercado avança o tutorial', ev("CF.tut.passo") == 5, ev("CF.tut.passo"))
        pg.click('#shClose', force=True); pg.wait_for_timeout(200)
        pg.click("nav.bottom button[data-a='construir']", force=True); pg.wait_for_timeout(300)
        check(f'{T} abrir Construir avança o tutorial', ev("CF.tut.passo") == 6)
        check(f'{T} Construir lista as 5 casas da vila', ev("document.querySelectorAll('#shBody [data-act^=\"casa:\"]').length + document.querySelectorAll('#shBody .row.sel img[src*=vila_]').length") >= 1 and ev("document.getElementById('shBody').innerText").count('Casa') >= 5)
        pg.click('#shClose', force=True); pg.wait_for_timeout(200)
        pg.click('#tutOk', force=True); pg.wait_for_timeout(200)
        check(f'{T} último botão encerra o tutorial', not vis('#tut') and ev("CF.st.tut.fim"))
        carrega()
        check(f'{T} tutorial concluído não volta depois de recarregar', not vis('#tut'))
        ev("document.querySelector('[data-act=rever]')||0"); pg.click('#bConfig', force=True); pg.wait_for_timeout(250)
        pg.click("[data-act='rever']", force=True); pg.wait_for_timeout(250)
        check(f'{T} "Rever tutorial" em Ajustes recomeça do passo 1', vis('#tut') and ev("CF.tut.passo") == 0)
        pg.click('#tutPular', force=True); pg.wait_for_timeout(200)
        check(f'{T} "Pular" fecha o tutorial', not vis('#tut') and ev("CF.st.tut.fim"))
        # --- casas da vila
        R = ev("(()=>{const s=CF.st;s.moedas=50;return CF.G.construirCasa(s,'casa1').ok})()")
        check(f'{T} casa não sai sem moedas suficientes', R is False)
        R = ev("(()=>{const s=CF.st;s.moedas=5000;return CF.G.construirCasa(s,'casa2')})()")
        check(f'{T} casa respeita o nível mínimo', not R['ok'] and 'nível' in R['msg'], R['msg'])
        R = ev("(()=>{const s=CF.st;const m=s.moedas;const r=CF.G.construirCasa(s,'casa1');return [r.ok,m-s.moedas,!!s.casas.casa1,CF.G.construirCasa(s,'casa1').ok]})()")
        check(f'{T} construir casa 1 cobra 80 moedas e não constrói duas vezes', R == [True, 80, True, False], R)
        ev("CF.salvar()"); carrega()
        check(f'{T} casa construída continua depois de recarregar', ev("!!CF.st.casas.casa1"))
        # --- mapa da Mantiqueira
        pg.click('#bMapa', force=True); pg.wait_for_timeout(500)
        check(f'{T} botão Mapa abre o mapa da Mantiqueira', vis('#regiao'))
        R = ev("[...document.querySelectorAll('.rgCity')].map(e=>[e.dataset.id,e.className])")
        check(f'{T} mapa mostra as 11 cidades', len(R) == 11, len(R))
        check(f'{T} São Bento disponível/em andamento, Sapucaí-Mirim bloqueada', ('rg-disponivel' in R[0][1] or 'rg-andamento' in R[0][1]) and 'rg-bloqueada' in dict(R)['sapucai-mirim'], R[:2])
        R = ev("""(()=>{const a=[...document.querySelectorAll('.rgCity')].map(e=>e.getBoundingClientRect());let n=0;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){const p=a[i],q=a[j];if(p.left<q.right-2&&q.left<p.right-2&&p.top<q.bottom-2&&q.top<p.bottom-2)n++}return n})()""")
        check(f'{T} etiquetas das cidades não ficam umas sobre as outras', R == 0, R)
        k0 = ev("CF.rg.T.k"); pg.click('#rgIn', force=True); pg.wait_for_timeout(100)
        check(f'{T} botão + aproxima o mapa regional', ev("CF.rg.T.k") > k0)
        for _ in range(6): pg.click('#rgOut', force=True)
        R = ev("(()=>{const c=document.getElementById('rgCena'),r=document.querySelector('#rgWrap img').getBoundingClientRect(),q=c.getBoundingClientRect();return r.left<=q.left+1&&r.top<=q.top+1&&r.right>=q.right-1&&r.bottom>=q.bottom-1})()")
        check(f'{T} afastando ao máximo o mapa ainda cobre a tela toda (sem fundo vazio)', R)
        x0 = ev("CF.rg.T.x")
        ev("""(()=>{const c=document.getElementById('rgCena');const f=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{pointerId:3,clientX:x,clientY:y,bubbles:true,pointerType:'touch'}));f('pointerdown',300,400);for(let i=1;i<=8;i++)f('pointermove',300-i*10,400);f('pointerup',220,400)})()""")
        check(f'{T} arrastar move o mapa regional', ev("CF.rg.T.x") != x0 or ev("CF.rg.T.x") <= ev("document.getElementById('rgCena').clientWidth-1536*CF.rg.T.k")+1)
        pg.click('#rgCentro', force=True); pg.wait_for_timeout(150)
        pg.click(".rgCity[data-id='sapucai-mirim']", force=True); pg.wait_for_timeout(300)
        t = ev("document.getElementById('shBody').innerText")
        check(f'{T} tocar em cidade bloqueada explica o requisito', 'bloqueada' in t.lower() and 'São Bento' in t, t[:80])
        pg.click('#shClose', force=True); pg.click('#rgVoltar', force=True); pg.wait_for_timeout(200)
        check(f'{T} voltar fecha o mapa regional', not vis('#regiao'))
        # --- conclusão de São Bento: prêmio uma vez só, libera Sapucaí-Mirim, fica salvo
        m0 = ev("CF.st.moedas")
        ev("""(()=>{const s=CF.st;const c=(t,v)=>{s.cont[t]=s.cont[t]||{};s.cont[t]['*']=Math.max(s.cont[t]['*']||0,v)};c('plantar',10);c('colher',30);c('alimentar',8);c('entregar',5);
              s.cont.produzir=s.cont.produzir||{};s.cont.produzir.queijo=2;s.padaria.construida=true;s.casas={casa1:true,casa2:true,casa3:true};s.xp=Math.max(s.xp,99999);s.nivel=Math.max(s.nivel,5);s.celeiro.itens.milho=(s.celeiro.itens.milho||0)+1})()""")
        R = ev("CF.G.progressoCidade(CF.st,'sao-bento-do-sapucai')")
        check(f'{T} objetivos de São Bento ficam 100% quando tudo é feito', R['completa'] and R['pct'] == 100, R)
        m0 = ev("CF.st.moedas")
        pg.click("nav.bottom button[data-a='mercado']", force=True); pg.wait_for_timeout(250); pg.click("[data-act='mercado:vender']", force=True); pg.wait_for_timeout(250)
        pg.click("[data-act='vender:milho:1']", force=True); pg.wait_for_timeout(400); m0 += 6
        check(f'{T} aviso de cidade concluída aparece', vis('#modal') and 'concluída' in ev("document.getElementById('modal').innerText"))
        m1 = ev("CF.st.moedas")
        check(f'{T} prêmio de 250 moedas entregue (mais os presentes de nível)', m1 - m0 >= 250 and '250 moedas' in ev("document.getElementById('modal').innerText") and ev("CF.st.cidades['sao-bento-do-sapucai'].premio"), m1 - m0)
        check(f'{T} Sapucaí-Mirim liberada', ev("CF.G.estadoCidade(CF.st,'sapucai-mirim').tipo") == 'em-breve')
        check(f'{T} Santo Antônio continua bloqueada', ev("CF.G.estadoCidade(CF.st,'santo-antonio-do-pinhal').tipo") == 'bloqueada')
        pg.click('#mOk', force=True); pg.wait_for_timeout(400)
        check(f'{T} "Ver o mapa" abre o mapa com São Bento concluída', vis('#regiao') and 'rg-concluida' in ev("document.querySelector(\".rgCity[data-id='sao-bento-do-sapucai']\").className"))
        R = ev("CF.G.concluirCidade(CF.st,'sao-bento-do-sapucai').ok")
        check(f'{T} prêmio não pode ser recebido duas vezes', R is False and ev("CF.st.moedas") == m1)
        ev("CF.salvar()"); carrega()
        check(f'{T} depois de recarregar: São Bento concluída, Sapucaí liberada, sem prêmio repetido', ev("CF.G.estadoCidade(CF.st,'sao-bento-do-sapucai').tipo") == 'concluida' and ev("CF.G.estadoCidade(CF.st,'sapucai-mirim').tipo") == 'em-breve' and ev("CF.st.moedas") == m1 and not vis('#modal'))
        falso = ev("""(()=>{const p=JSON.parse(localStorage.getItem('conecta_fazenda_save_v1'));const d=JSON.parse(p.d);d.cidades={'sapucai-mirim':{premio:true,em:1}};d.casas={};d.cont={};d.padaria={construida:false};d.xp=0;p.d=JSON.stringify(d);return JSON.stringify(p)})()""")
        pg.close(); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); ev = pg.evaluate
        pg.add_init_script("if(!sessionStorage.getItem('t')){sessionStorage.setItem('t','1');localStorage.setItem('conecta_fazenda_save_v1'," + json.dumps(falso) + ")}")
        pg.goto(URL); pg.wait_for_function('window.CF&&window.CF.rg'); pg.wait_for_timeout(500)
        check(f'{T} save alterado à mão não libera cidade sem cumprir os objetivos', ev("CF.G.estadoCidade(CF.st,'sapucai-mirim').tipo") == 'bloqueada' and ev("CF.G.estadoCidade(CF.st,'sao-bento-do-sapucai').tipo") != 'concluida')
        pg.screenshot(path='/tmp/claude-0/cft/campanha.png')
        check(f'{T} sem erros de script', not errs, errs[:3])
        b.close()
run_campanha()

print(f"\n{len(res)} testes no total, {sum(1 for r in res if not r[1])} falhas")
