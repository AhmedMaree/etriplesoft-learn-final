import {chromium} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/Ahmed/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'});
const routes=['overview','courses','ai-page','detail-course','assessment','calendar','certificates','payment','settings','sign-up'];
fs.mkdirSync('.impeccable/review',{recursive:true});
const reports=[];
for(const width of [1448,390]){
 const page=await browser.newPage({viewport:{width,height:width===1448?1086:844},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of routes){
  await page.goto(`http://127.0.0.1:5173/#${route}`);await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`.impeccable/review/${route}-${width}.png`,fullPage:true});
  const report=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),overflow:[...document.querySelectorAll('main *,.signup-page *')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&getComputedStyle(e).position!=='absolute'}).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent?.slice(0,45)}))}));
  reports.push({route,...report,errors:[...errors]});
 }
 await page.close();
}
fs.writeFileSync('.impeccable/review/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));await browser.close();
