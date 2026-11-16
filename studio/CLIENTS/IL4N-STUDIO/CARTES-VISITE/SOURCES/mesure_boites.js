// Rend la page SANS le fond de points (svg du .bleed masqué) à 20 px/mm -> PNG, pour mesurer l'encre réelle des textes.
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:582,height:420},deviceScaleFactor:20*25.4/96});
await p.goto('file://'+path.resolve(process.argv[2]));await p.evaluate(()=>document.fonts.ready);
await p.addStyleTag({content:'.bleed svg{display:none !important}'});await p.waitForTimeout(200);
await p.screenshot({path:process.argv[3],clip:{x:0,y:0,width:154*96/25.4,height:111*96/25.4}});await b.close();})();
