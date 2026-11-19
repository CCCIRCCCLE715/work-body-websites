export const CHAPTERS = [
  {name:'Introduction',at:0,key:'hero',bounds:[0,.035]},
  {name:'The timeless',at:.075,key:'timeless',bounds:[.060,.093]},
  {name:'Case & finishes',at:.174,key:'craft',bounds:[.146,.195]},
  {name:'Exploded view',at:.252,key:'explode',bounds:[.225,.276]},
  {name:'Mechanical heart',at:.334,key:'heart',bounds:[.307,.361]},
  {name:'Precision',at:.408,key:'precision',bounds:[.389,.43]},
  {name:'Elegant contours',at:.505,key:'contours',bounds:[.474,.565]},
  {name:'Slim profile',at:.63,key:'profile',bounds:[.602,.658]},
  {name:'Bracelet',at:.738,key:'bracelet',bounds:[.708,.794]},
  {name:'Dimensions',at:.839,key:'dimensions',bounds:[.822,.854]},
  {name:'Silver steel',at:.911,key:'finish',bounds:[.885,.936]},
  {name:'Model 146GR',at:.989,key:'specs',bounds:[.972,1.03]},
];
export const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
export const smooth=n=>{const t=clamp(n);return t*t*(3-2*t);};
export const ramp=(p,a,b)=>smooth((p-a)/(b-a));
export const windowed=(p,a,b,fade=.017)=>ramp(p,a-fade,a)*(1-ramp(p,b,b+fade));
// Progress / position / scale / rotation / case separation / link spread /
// movement isolation / independent flat bracelet close-up.
const rows=[
  [0,.65,0,1.08,.02,-.10,-.01,0,0,0,0],
  [.04,.65,0,1.08,.02,-.10,-.01,0,0,0,0],
  [.075,.35,.05,1,.06,.70,.02,0,0,0,0],
  [.117,.1,.03,.99,.07,2.95,.025,0,0,0,0],
  [.174,.65,0,1.17,.03,6.14,-.015,0,0,0,0],
  [.198,.4,0,.96,.05,6.27,-.03,0,0,0,0],
  [.222,.25,0,.88,.07,5.13,-.025,.12,0,0,0,0],
  [.252,.30,0,1.12,.07,4.96,-.025,1,0,0,0],
  [.276,.30,0,1.12,.07,4.96,-.025,1,0,0,0],
  [.317,.9,0,1.32,.02,6.05,0,0,0,1,0],
  [.36,.9,0,1.32,.02,6.64,-.09,0,0,1,0],
  [.389,.2,-.08,1.08,.08,6.56,-.06,.48,0,.35,0],
  [.408,.2,-.12,1.04,.06,6.52,-.1,0,0,0,0],
  [.439,.2,-.12,1.04,.06,6.52,-.1,0,0,0,0],
  [.485,.60,-1.0,1.85,-.95,6.20,.03,0,0,0,0],
  [.522,.60,-1.0,1.85,-.95,6.12,.03,0,0,0,0],
  [.567,1.9,-.12,1.77,.06,6.0,-.06,0,0,0,0],
  [.612,.5,-1.1,2.1,-1.92,6.28,-1.57,0,0,0,0],
  [.644,.5,-1.2,2.1,-1.98,6.28,-1.57,0,0,0,0],
  [.684,0,-4.1,1.75,-1.53,6.28,-1.57,0,0,0,0],
  [.717,0,-4.1,1.0,-1.53,6.28,-1.57,0,0,0,1],
  [.738,0,-4.1,1.0,-1.53,6.28,-1.57,0,0,0,1],
  [.775,0,-4.1,1.0,-1.53,6.28,-1.57,0,1,0,1],
  [.795,0,-4.1,1.0,-1.53,6.28,-1.57,0,1,0,1],
  [.829,2.38,-.18,.77,.10,5.93,-.04,0,0,0,0],
  [.852,2.38,-.18,.77,.10,5.93,-.04,0,0,0,0],
  [.89,.65,.05,1.20,.12,7.0,-.14,0,0,0,0],
  [.943,.65,.05,1.20,.12,7.0,-.14,0,0,0,0],
  [.981,2.8,1.38,.40,.02,5.90,-.04,0,0,0,0],
  [1,2.8,1.38,.40,.02,5.90,-.04,0,0,0,0],
];
export const SHOTS=rows.map(r=>Object.fromEntries(['p','x','y','s','rx','ry','rz','explode','links','isolate','detail'].map((k,i)=>[k,r[i]])));
export function shotAt(p){
  let i=0;while(i<SHOTS.length-2&&p>SHOTS[i+1].p)i++;
  const a=SHOTS[i],b=SHOTS[i+1],t=smooth((p-a.p)/(b.p-a.p));
  return Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+(b[k]-a[k])*t]));
}
