// Draws the pine-ridge silhouettes in public/img/ridge-*.svg.
// Usage: node tools/make-ridges.mjs   (change a seed to get a different forest)
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../public/img/", import.meta.url));
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}
const r1=n=>Math.round(n*10)/10;
function tree(x,base,h,w,tiers){
  const top=base-h, foliage=h, pts=[[x,top]];
  for(let i=1;i<=tiers;i++){const y=top+foliage*i/tiers, wi=w*(0.35+0.65*i/tiers);
    pts.push([x-wi,y]); if(i<tiers) pts.push([x-wi*0.45,y-h*0.015]);}
  const tw=Math.max(1.5,w*0.12);
  pts.push([x-tw,top+foliage],[x-tw,base],[x+tw,base],[x+tw,top+foliage]);
  for(let i=tiers;i>=1;i--){const y=top+foliage*i/tiers, wi=w*(0.35+0.65*i/tiers);
    if(i<tiers) pts.push([x+wi*0.45,y-h*0.015]); pts.push([x+wi,y]);}
  return 'M'+pts.map(p=>r1(p[0])+' '+r1(p[1])).join('L')+'Z';
}
function ridge({seed,W=1440,H=360,base,minH,maxH,gap,hill}){
  const R=rng(seed); let d=`M0 ${H}L0 ${base}`, t='';
  // a gently rolling hill under the trees
  const ys=[];for(let x=0;x<=W;x+=40){const y=base-hill*Math.sin(x/W*Math.PI*2+seed)*0.5-hill*0.5*Math.sin(x/230+seed*2);ys.push([x,y]);d+=`L${x} ${r1(y)}`}
  d+=`L${W} ${H}Z`;
  const hillAt=x=>{x=Math.max(0,Math.min(W,x));const i=Math.min(ys.length-2,Math.floor(x/40)),t=(x-ys[i][0])/40;return ys[i][1]+(ys[i+1][1]-ys[i][1])*t};
  const lowest=(x,w)=>Math.max(hillAt(x-w),hillAt(x),hillAt(x+w));
  for(let x=-20;x<W+40;x+=gap*(0.6+R()*0.8)){const h=minH+R()*(maxH-minH),w=h*(0.28+R()*0.08);t+=tree(x,lowest(x,w)+3,h,w,4+Math.round(R()*2))}
  return {hill:d,trees:t};
}
const layers = {
 far:ridge({seed:7,base:250,minH:40,maxH:80,gap:26,hill:30}),
 mid:ridge({seed:19,base:290,minH:60,maxH:120,gap:40,hill:24}),
 near:ridge({seed:31,base:330,minH:90,maxH:170,gap:62,hill:16}),
 cta:ridge({seed:43,base:150,minH:50,maxH:110,gap:46,hill:12,H:200}),
 ctaBack:ridge({seed:53,base:130,minH:40,maxH:80,gap:32,hill:16,H:200}),
};
// Hill and trees are separate paths so their overlap can't cancel out.
const svg = (r, fill, h = 360) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 ${h}" preserveAspectRatio="xMidYMax slice"><g fill="${fill}"><path d="${r.hill}"/><path d="${r.trees}"/></g></svg>\n`;
writeFileSync(out + "ridge-far.svg", svg(layers.far, "#3B5A45"));
writeFileSync(out + "ridge-mid.svg", svg(layers.mid, "#284434"));
writeFileSync(out + "ridge-near.svg", svg(layers.near, "#183026"));
writeFileSync(out + "ridge-cta-back.svg", svg(layers.ctaBack, "#2A4636", 200));
writeFileSync(out + "ridge-cta.svg", svg(layers.cta, "#16291F", 200));
console.log("Wrote public/img/ridge-*.svg");
