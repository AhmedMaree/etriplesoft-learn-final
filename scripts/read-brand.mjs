import fs from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const doc=await getDocument({data:new Uint8Array(fs.readFileSync('E Triple Soft Learn Brand Identity.pdf')),useSystemFonts:true}).promise;
fs.mkdirSync('tmp/brand',{recursive:true});
for(let i=1;i<=doc.numPages;i++){
 const page=await doc.getPage(i);const text=await page.getTextContent();console.log('PAGE '+i+'\n'+text.items.map(x=>x.str).join(' '));
 const viewport=page.getViewport({scale:1});const canvas=createCanvas(viewport.width,viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 fs.writeFileSync(`tmp/brand/page-${i}.png`,canvas.toBuffer('image/png'));
}
