const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const dir=process.argv[2],out=process.argv[3];
for(const f of ['cal_recto_v9','cal_verso_v9']){const p=await b.newPage({viewport:{width:344,height:231},deviceScaleFactor:8});
await p.goto('file://'+path.join(dir,f+'.html'));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
await p.screenshot({path:`${out}/${f}.png`});
await p.pdf({path:`${out}/${f}.pdf`,width:'91mm',height:'61mm',printBackground:true,pageRanges:'1'});
await p.close();}await b.close();})();
