#!/usr/bin/env node
/* Reproduz em jsdom os achados B0 da base pré-correção. Uso:
   node scripts/repro-b0-corrida.js /caminho/para/checkout-da-base
   Requer somente os devDependencies já usados por npm test (jsdom). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(process.argv[2] || process.cwd());
const files = ['actions.js','storage.js','catalogo.js','gamificacao.js','assistente.js','planilha_data.js','historico.js','busca.js','custom_exercises.js','datas.js','cartoes.js','calculadoras.js','backup.js','persistencia.js','sessao.js','config.js','boss.js','registro.js','app.js'].map(f => path.join(root, 'js', f));
const strip = s => s.replace(/^import [^\n]*;\n/gm, '').replace(/^export \{[^\n]*\};?\n/gm, '');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script src="https:\/\/[^"]+"><\/script>/g, '');
const vc = new VirtualConsole();
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom, document = window.document, ctx = dom.getInternalVMContext();
const ctx2d = () => new Proxy(function () {}, { get: (t,k) => k === 'canvas' ? { width:1080,height:1920 } : ctx2d(), set:()=>true, apply:()=>ctx2d() });
window.HTMLCanvasElement.prototype.getContext = () => ctx2d();
window.Chart = class { constructor(){return {destroy(){},resize(){},update(){}};} };
window.Element.prototype.scrollIntoView = function(){};
window.scrollTo = () => {};
window.matchMedia = () => ({matches:false,addListener(){},removeListener(){}});
window.alert = () => {};
Object.defineProperty(window.navigator, 'vibrate', {value:()=>true, configurable:true});
Object.defineProperty(window.navigator, 'serviceWorker', {value:{register:()=>Promise.resolve()}, configurable:true});
window.fetch = url => { const f=String(url).replace(/^\.?\//,''); return fs.existsSync(path.join(root,f)) ? Promise.resolve({ok:true,json:()=>Promise.resolve(JSON.parse(fs.readFileSync(path.join(root,f),'utf8')))}) : Promise.resolve({ok:false,json:()=>Promise.resolve(null)}); };
for (const f of files) vm.runInContext(strip(fs.readFileSync(f,'utf8')), ctx, {filename:f});
const ev = s => vm.runInContext(s,ctx);
const click = el => { if(!el) throw Error('botão ausente'); el.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true})); };
const race = {id:990001,date:'2026-10-15',kind:'corrida',muscle:'Cardio',exercise:'Corrida (Rua)',xpTheme:'classico',distanceKm:10,durationMin:50,notes:'repro sintética',isPR:true,type:'corrida',reps:[]};
(async () => {
  if (typeof window.onload === 'function') await window.onload();
  const openAndSave = (entry) => {
    ev(`logs = [${JSON.stringify(race)}]; document.getElementById('filter-date').value = '2026-10-15'; renderLogsTable(); renderSearchScreen();`);
    const button = entry === 'dia'
      ? document.querySelector('#logs-container [data-action="editLog"]')
      : document.querySelector(`#hist-results [data-log-id="${race.id}"] [data-action="editLog"]`);
    click(button);
    const before = {type:document.getElementById('el-type')?.value, reps:document.getElementById('el-r')?.value, distance:!!document.getElementById('el-distance')};
    document.getElementById('el-r').value = '1';
    click(document.querySelector('#edit-log-overlay [data-action="saveEditedLog"]'));
    const edited = JSON.parse(ev(`JSON.stringify(logs.find(l => l.id === ${race.id}))`));
    return {before, edited};
  };
  const list = openAndSave('dia');
  const csv = ev('buildPlanilhaCSV()');
  const parsed = ev(`JSON.stringify(lerPlanilhaCSV(${JSON.stringify(csv)}).logs.find(l => l.kind === 'corrida'))`);
  const plan = ev(`JSON.stringify(planejarImportacaoLogs([JSON.parse(${JSON.stringify(parsed)})], logs))`);
  ev(`logs = [${JSON.stringify(race)}]; document.getElementById('filter-date').value = '2026-10-15'; renderLogsTable();`);
  const dayBadge = document.getElementById('logs-container').textContent.includes('PR (1RM auto)');
  const history = openAndSave('historico');
  const bikeVsRunPR = ev(`detectAutoPR({id:990003,kind:'corrida',distanceKm:10},[{id:990002,kind:'corrida',distanceKm:20,exercise:'Bike'}],80)`);
  const report = {
    root, dayEditor:list.before, editedFields:Object.fromEntries(['kind','type','reps','weight','mode','perSide','rir','sessao','conferir','sets','repsText','distanceKm','durationMin','xpTheme'].map(k=>[k,list.edited[k]])),
    csvImportPlan:JSON.parse(plan), dayCardHasPR1RMBadge:dayBadge,
    historyEditor:history.before, bike20kmThenRun10kmIsPR:bikeVsRunPR,
    testUiRaceEntryPoints: (fs.readdirSync(path.join(root,'tests','ui')).filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync(path.join(root,'tests','ui',f),'utf8')).join('\n').match(/kind:\s*['"]corrida['"]/g)||[]).length
  };
  console.log(JSON.stringify(report,null,2));
  dom.window.close();
})().catch(e=>{ console.error(e.stack||e); dom.window.close(); process.exitCode=1; });
