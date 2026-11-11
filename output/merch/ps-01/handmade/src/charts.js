const sharp=require('/Users/bunyasit/dev/passionseed/web/node_modules/sharp');
const fs=require('fs'); const OUT='/Users/bunyasit/dev/passionseed/web/output/merch/ps-01/handmade/';
const esc=s=>s.replace(/&/g,'&amp;');
async function chart(name,title,rows,legend,cell,note){
  const h=rows.length,w=rows[0].length, pad=40, top=70, lw=260;
  const W=pad*2+w*cell+lw, H=Math.max(top+h*cell+pad+30, top+legend.length*30+60);
  let s=`<rect width="100%" height="100%" fill="#fff"/><text x="${pad}" y="34" font-family="Helvetica" font-size="22" font-weight="700">${esc(title)}</text><text x="${pad}" y="56" font-family="Helvetica" font-size="13" fill="#555">${esc(note)}</text>`;
  rows.forEach((row,y)=>[...row].forEach((c,x)=>{ const L=legend.find(l=>l.keys.includes(c)); const X=pad+x*cell,Y=top+y*cell;
    s+=`<rect x="${X}" y="${Y}" width="${cell}" height="${cell}" fill="${L?L.hex:'#fff'}" stroke="#bbb" stroke-width="0.6"/>`;
    if(L) s+=`<text x="${X+cell/2}" y="${Y+cell/2+cell*0.17}" font-family="Helvetica" font-size="${cell*0.45}" font-weight="700" text-anchor="middle" fill="${L.ink}">${L.sym}</text>`; }));
  for(let x=0;x<=w;x+=4) s+=`<line x1="${pad+x*cell}" y1="${top}" x2="${pad+x*cell}" y2="${top+h*cell}" stroke="#666" stroke-width="${x%8?0.8:1.6}"/>`;
  for(let y=0;y<=h;y+=4) s+=`<line x1="${pad}" y1="${top+y*cell}" x2="${pad+w*cell}" y2="${top+y*cell}" stroke="#666" stroke-width="${y%8?0.8:1.6}"/>`;
  const lx=pad*1.5+w*cell; legend.forEach((l,i)=>{ const y=top+i*30;
    s+=`<rect x="${lx}" y="${y}" width="22" height="22" fill="${l.hex}" stroke="#999"/><text x="${lx+11}" y="${y+16}" font-family="Helvetica" font-size="11" font-weight="700" text-anchor="middle" fill="${l.ink}">${l.sym}</text><text x="${lx+32}" y="${y+15}" font-family="Helvetica" font-size="13">${esc(l.name)}</text>`; });
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`)).png().toFile(OUT+name);
}
const T=(sym,hex,ink,name,keys)=>({sym,hex,ink,name,keys});
(async()=>{
  // Pocket mascot: 16px peek, rows 0-11 (the part above the pocket edge), no disc
  const peek=fs.readFileSync('/Users/bunyasit/dev/passionseed/web/output/merch/ps-01/logo/ps-pixel-16-peek.txt','utf8').trim().split('\n').slice(0,12);
  await chart('pocket-mascot-chart.png','Pocket mascot · cross-stitch on waste canvas',peek,[
    T('Y','#ffc33e','#000','Yellow · DMC 972','Y'),T('O','#ff8f19','#000','Orange · DMC 740','O'),
    T('K','#000000','#fff','Black · DMC 310','K'),T('W','#ffffff','#000','White · DMC Blanc','W')],
    36,'16 × 12 stitches · 8.5-count waste canvas = 48 × 36 mm · bottom row sits on the pocket edge');
  // TEAM patch: 16px badge, disc collapsed to 2 maroons for hand stitching
  const b16=fs.readFileSync('/Users/bunyasit/dev/passionseed/web/output/merch/ps-01/logo/ps-pixel-16.txt','utf8').trim().split('\n');
  await chart('team-patch-chart.png','TEAM patch · cross-stitch on 8-count aida',b16,[
    T('D','#5a1022','#fff','Dark maroon · DMC 902','12'),T('M','#9a1b5b','#fff','Plum · DMC 915','34'),
    T('Y','#ffc33e','#000','Yellow · DMC 972','Y'),T('O','#ff8f19','#000','Orange · DMC 740','O'),
    T('K','#000000','#fff','Black · DMC 310','K'),T('W','#ffffff','#000','White · DMC Blanc','W')],
    36,'16 × 16 stitches · 8-count aida = 51 mm · back with felt + hook velcro');
  // Back sky: Dusk, 20 mm cells, 28 x 13, Bayer-dithered 3 inks + sun
  const BAYER=[[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]], W=20,H=13, rows=[];
  for(let y=0;y<H;y++){ let r=''; const v=3*(y+.5)/H, i=Math.floor(v), f=v-i;
    for(let x=0;x<W;x++){ const dx=x+.5-10, dy=y+.5-(H+1.2); if(dx*dx+dy*dy<=5.6*5.6){ r+='S'; continue; }
      const idx=f>(BAYER[y%4][x%4]+.5)/16?i+1:i; r+= idx===0?'.':'VMR'[Math.min(idx,3)-1]; } rows.push(r); }
  await chart('back-sky-stencil-chart.png','Back sky · Dusk · stencil + fabric paint',rows,[
    T('V','#5a1d8a','#fff','Violet','V'),T('M','#c2185b','#fff','Magenta','M'),T('R','#f97316','#000','Ember orange','R'),
    T('S','#ffc33e','#000','Sun yellow','S'),T('·','#ffffff','#999','Empty: shirt shows','.')],
    30,'20 × 13 cells · 20 mm pitch, 18 mm holes = 40 × 26 cm · fits one A3 stencil sheet and sizes S–2XL · bottom row on the hem');
  // Front sky: same, no sun, 20 mm cells, 28 x 13, Bayer-dithered 3 inks + sun
  { const rows=[];
  for(let y=0;y<H;y++){ let r=''; const v=3*(y+.5)/H, i=Math.floor(v), f=v-i;
    for(let x=0;x<W;x++){ const dx=x+.5-14, dy=y+.5-(H+1.5); 
      const idx=f>(BAYER[y%4][x%4]+.5)/16?i+1:i; r+= idx===0?'.':'VMR'[Math.min(idx,3)-1]; } rows.push(r); }
  await chart('front-sky-stencil-chart.png','Front sky · Dusk · same stencils, no sun',rows,[
    T('V','#5a1d8a','#fff','Violet','V'),T('M','#c2185b','#fff','Magenta','M'),T('R','#f97316','#000','Ember orange','R'),
    T('·','#ffffff','#999','Empty: shirt shows','.')],
    30,'20 × 13 cells · 20 mm pitch, 18 mm holes = 40 × 26 cm · fits one A3 stencil sheet and sizes S–2XL · bottom row on the hem · rows line up with the back at the side seams');
  }
  console.log(fs.readdirSync(OUT).join(' '));
})();
