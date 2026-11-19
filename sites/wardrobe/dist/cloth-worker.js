import { createClothTemplate } from './cloth-geometry.js?v=huangbai-portfolio-1';

self.onmessage=({data:{image,bitmap,profile}})=>{
  const t=createClothTemplate(bitmap,profile),attributes={};
  for(const [name,attribute] of Object.entries(t.geometry.attributes))attributes[name]={array:attribute.array,itemSize:attribute.itemSize};
  const geometry={attributes,index:t.geometry.index.array,groups:t.geometry.groups};
  const support={...t.support,shoulder:t.support.shoulder.map(v=>v.toArray()),bar:t.support.bar.map(v=>v.toArray()),stem:t.support.stem.map(v=>v.toArray()),segments:t.support.segments.map(s=>s.map(v=>v.toArray()))};
  const result={...t,geometry,support};
  const arrays=[...Object.values(attributes).map(a=>a.array),geometry.index,t.rest,t.coarse,t.binding.vertices,t.binding.weights,t.binding.detail,t.renderRim,t.coarseRim];
  self.postMessage({image,template:result},[...new Set(arrays.map(a=>a.buffer))]);bitmap.close();
};
