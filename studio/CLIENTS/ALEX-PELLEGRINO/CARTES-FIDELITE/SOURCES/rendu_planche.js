const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:820,height:600},deviceScaleFactor:2.5});
await p.goto('file://'+path.resolve(process.argv[2]));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
await p.screenshot({path:process.argv[3],fullPage:true});await b.close();})();
