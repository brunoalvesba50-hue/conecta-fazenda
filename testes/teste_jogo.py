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
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st', timeout=15000); pg.wait_for_timeout(600)
        ev("localStorage.clear()"); pg.reload(); pg.wait_for_function('window.CF && window.CF.st'); pg.wait_for_timeout(700)
        T[0] = int(ev("Date.now()"))
        tag = 'celular' if mobile else 'computador'
        def tela(wx, wy):
            return ev(f"(()=>{{const s=CF.E.toScreen({wx},{wy});return [s.x,s.y]}})()")
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
        tocar_canteiro(1); s = st()
        check(f'[{tag}] tocar no milho pronto colhe e vai para o celeiro', s['celeiro']['itens'].get('milho') == 2 and s['xp'] == 3, s['celeiro'])
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
        pg.wait_for_timeout(1100)
        check(f'[{tag}] botão Colher mostra quantos estão prontos', ev("document.getElementById('dColher').textContent") in ('3', '4'))
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
        antes = st(); ev("CF.salvar()"); pg.reload(); pg.wait_for_function('window.CF && window.CF.st'); pg.wait_for_timeout(600); depois = st()
        iguais = all(antes[k] == depois[k] for k in ['moedas', 'xp', 'nivel', 'sementes', 'celeiro', 'canteiros', 'padaria', 'missao'])
        check(f'[{tag}] recarregar a página mantém tudo', iguais, [k for k in ['moedas', 'xp', 'nivel', 'sementes', 'celeiro', 'canteiros', 'padaria', 'missao'] if antes[k] != depois[k]])
        # 12) tempo passa com o jogo fechado
        tocar_canteiro(0)
        if ev("document.getElementById('sheet').classList.contains('hidden')") is False:
            pg.click("[data-act='escolher:alface']"); pg.wait_for_timeout(200); btn('#pbOk')
        ev("CF.salvar()"); T[0] = int(ev('Date.now()')) + 50000; pg.close()
        pg = ctx.new_page(); ev = pg.evaluate; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.clock.install(time=T[0] / 1000); pg.clock.resume()
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); pg.wait_for_timeout(500)
        check(f'[{tag}] a alface cresceu com o jogo fechado', ev("CF.G.estadoCanteiro(CF.st,0).tipo") == 'pronto', ev("CF.G.estadoCanteiro(CF.st,0)"))
        # 13) save danificado (gravado antes do jogo abrir)
        def abre_com_save(valor_js):
            p2 = ctx.new_page(); p2.on('pageerror', lambda e: errs.append(str(e)))
            p2.add_init_script("try{localStorage.setItem('conecta_fazenda_save_v1',"+valor_js+")}catch(_){}")
            p2.goto(URL); p2.wait_for_function('window.CF && window.CF.st'); p2.wait_for_timeout(400); return p2
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
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); ev("localStorage.clear()"); pg.reload(); pg.wait_for_function('window.CF && window.CF.st'); pg.wait_for_timeout(600)
        tag = 'mapa-celular' if mobile else 'mapa-computador'
        cam = lambda: ev("({x:CF.E.cam.x,y:CF.E.cam.y,z:CF.E.cam.zoom})")
        PE = """((pts,type)=>{const cv=document.getElementById('game');for(const q of pts){cv.dispatchEvent(new PointerEvent(type,{pointerId:q[0],clientX:q[1],clientY:q[2],bubbles:true,pointerType:'touch',isPrimary:q[0]===1,button:0,buttons:type==='pointerup'?0:1}))}})"""
        def ptr(pts, t): ev(PE + f"({json.dumps(pts)},'{t}')")
        W, H = viewport['width'], viewport['height']
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
        ev("CF.E.setZoom(.9)"); z = cam()['z']; pg.click('#zIn', force=True); pg.wait_for_timeout(500)
        check(f'[{tag}] botão + aproxima', cam()['z'] > z * 1.2)
        z = cam()['z']; pg.click('#zOut', force=True); pg.wait_for_timeout(500)
        check(f'[{tag}] botão − afasta', cam()['z'] < z * .85)
        pg.click('#zAll', force=True); pg.wait_for_timeout(800)
        vis = ev("(()=>{const a=CF.E.toScreen(0,0),b=CF.E.toScreen(CF.WORLD.w,CF.WORLD.h);return [a.x,a.y,b.x,b.y,innerWidth,innerHeight]})()")
        check(f'[{tag}] visão geral mostra a fazenda inteira', vis[0] >= -2 and vis[2] <= vis[4] + 2 and vis[1] >= -2 and vis[3] <= vis[5] + 62, vis)
        pg.click('#zOut', force=True); pg.wait_for_timeout(500)
        check(f'[{tag}] não afasta além da visão geral', abs(cam()['z'] - ev("CF.E.minZoom")) < .001)
        pg.click('#zHome', force=True); pg.wait_for_timeout(800)
        check(f'[{tag}] botão centralizar volta para a fazenda', cam()['z'] > ev("CF.E.minZoom") * 1.05)
        for _ in range(12): pg.click('#zIn', force=True); pg.wait_for_timeout(80)
        pg.wait_for_timeout(400)
        check(f'[{tag}] limite máximo de zoom', abs(cam()['z'] - ev("CF.E.maxZoom")) < .001 and ev("document.getElementById('zIn').disabled"))
        # 4) canteiro continua tocável no zoom máximo e no mínimo
        for zz in ['CF.E.maxZoom', 'CF.E.minZoom*1.05']:
            ev(f"CF.E.setZoom({zz});CF.E.centerOn(800,994)"); pg.wait_for_timeout(150)
            x, y = ev("(()=>{const s=CF.E.toScreen(800,994);return [s.x,s.y]})()")
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
          const tags=['casa','celeiro','padaria','galinheiro'];const blocos=CF.E.sprites.filter(s=>tags.includes(s.tag)).map(s=>{const b=s.bounds();return {tag:s.tag,x0:b.x+b.w*.08,x1:b.x+b.w*.92,y0:b.y+b.h*.3,y1:b.y+b.h-18}});
          const poco=CF.E.sprites.find(s=>s.img&&s.img.src.includes('poco'));if(poco){const b=poco.bounds();blocos.push({tag:'poco',x0:b.x+10,x1:b.x+b.w-10,y0:b.y+b.h*.3,y1:b.y+b.h-12})}
          const invade=[];for(const s of g)for(const q of s.pts)for(const k of blocos){if(q[0]>k.x0&&q[0]<k.x1&&q[1]>k.y0&&q[1]<k.y1)invade.push(k.tag+':'+s.de+'>'+s.ate)}
          let maxPasso=0;for(const s of g)for(let i=1;i<s.pts.length;i++)maxPasso=Math.max(maxPasso,Math.hypot(s.pts[i][0]-s.pts[i-1][0],s.pts[i][1]-s.pts[i-1][1]));
          let maxCurva=0;for(const s of g)for(let i=2;i<s.pts.length;i++){const a=Math.atan2(s.pts[i-1][1]-s.pts[i-2][1],s.pts[i-1][0]-s.pts[i-2][0]),b=Math.atan2(s.pts[i][1]-s.pts[i-1][1],s.pts[i][0]-s.pts[i-1][0]);let d=Math.abs(a-b);if(d>Math.PI)d=2*Math.PI-d;maxCurva=Math.max(maxCurva,d)}
          return {dup:pares.length-new Set(pares).size,ligado:vis.size===nomes.length,pontas,invade:[...new Set(invade)],soltos:nomes.filter(n=>!viz[n].length),maxPasso,maxCurva}})()""")
        check(f'[{tag}] estradas: nenhum trecho repetido', R['dup'] == 0)
        check(f'[{tag}] estradas: rede toda ligada, sem ponto solto', R['ligado'] and not R['soltos'], R['soltos'])
        check(f'[{tag}] estradas: cada trecho começa e termina num ponto da rede', R['pontas'])
        check(f'[{tag}] estradas: não atravessam casa, celeiro, padaria, galinheiro nem poço', not R['invade'], R['invade'][:5])
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
        pg.goto(URL); pg.wait_for_function('window.CF && window.CF.st'); pg.wait_for_timeout(500)
        pg.click('#zAll', force=True); pg.wait_for_timeout(120)
        check('[movimento reduzido] visão geral sem animação (imediata)', abs(pg.evaluate('CF.E.cam.zoom') - pg.evaluate('CF.E.minZoom')) < .001)
        prevent = pg.evaluate("(()=>{const e=new Event('gesturestart',{cancelable:true});document.dispatchEvent(e);return e.defaultPrevented})()")
        check('[iPhone] gesto de zoom da página é bloqueado (só o mapa amplia)', prevent)
        check('[extras] sem erros de script', not errs, errs[:3])
        ctx2 = b.new_context(viewport={'width': 1280, 'height': 800}); pg2 = ctx2.new_page(); pg2.goto(URL); pg2.wait_for_function('window.CF && window.CF.st'); pg2.wait_for_timeout(500)
        x, y = pg2.evaluate("(()=>{const b=CF.S.celeiro.bounds();const s=CF.E.toScreen(b.x+b.w/2,b.y+b.h*.6);return [s.x,s.y]})()")
        pg2.mouse.move(x, y); pg2.wait_for_timeout(150); pg2.mouse.move(x + 2, y + 2); pg2.wait_for_timeout(150)
        check('[computador] mãozinha em cima do celeiro', pg2.evaluate("document.getElementById('game').style.cursor") == 'pointer')
        b.close()
run_extras()

print(f"\n{len(res)} testes no total, {sum(1 for r in res if not r[1])} falhas")
