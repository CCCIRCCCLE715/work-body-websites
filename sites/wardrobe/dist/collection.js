import { ISLAND_PRODUCTS } from './island-collection.js?v=huangbai-portfolio-1';
import { WORKS } from './works.js?v=work-covers-2';

const target=document.querySelector('#pieces');
ISLAND_PRODUCTS.forEach((p,i)=>{
  const work=WORKS[p.id];
  const article=document.createElement('article');article.className='piece';article.id=p.id;
  const preview=document.createElement('a');preview.className='piece-image'+(work.cover?' has-cover':'');preview.href=work.url;preview.target='_blank';preview.rel='noopener noreferrer';preview.setAttribute('aria-label','观看视频：'+work.title);
  const image=document.createElement('img');image.src=work.cover||p.previewImage;if(!work.cover){image.srcset=p.previewImage+' 1024w, '+p.image+' 1774w';image.sizes='(max-width:700px) 90vw, 30vw'}image.loading='lazy';image.alt=work.cover?work.title+' · 视频封面':p.role+'款的正面与背面设计';image.decoding='async';
  const number=document.createElement('span');number.className='piece-number';number.textContent=String(i+1).padStart(2,'0')+' / 12';preview.append(image,number);
  const info=document.createElement('div');info.className='piece-info';
  const title=document.createElement('div');title.className='piece-title';
  const name=document.createElement('h2');name.textContent=p.role;
  const english=document.createElement('span');english.className='piece-en';english.textContent=p.category;title.append(name,english);
  const workTitle=document.createElement('h3');workTitle.textContent=work.title;workTitle.className='piece-work-title';
  const cue=document.createElement('p');cue.className='piece-cue';cue.textContent=(p.gender==='men'?'男装':'女装')+' / '+p.category+' / '+p.cut;
  const action=document.createElement('a');action.className='piece-action';action.href='./?piece='+p.id;action.setAttribute('aria-label','预览'+p.role+'款的布料动效');
  const label=document.createElement('span');label.textContent='挂装预览';const arrow=document.createElement('span');arrow.textContent='↗';action.append(label,arrow);
  const video=document.createElement('a');video.className='piece-video';video.href=work.url;video.target='_blank';video.rel='noopener noreferrer';video.textContent='观看视频 ↗';video.setAttribute('aria-label','观看视频：'+work.title);
  const actions=document.createElement('div');actions.className='piece-actions';actions.append(video,action);
  info.append(title,workTitle,cue,actions);article.append(preview,info);target.append(article);
});
