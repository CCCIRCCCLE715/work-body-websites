import json,gzip,struct,collections
from pathlib import Path
p=Path('dist/assets/cloth-baked');m=json.loads((p/'collection.json').read_text());data=gzip.decompress((p/'collection.bin.gz').read_bytes());result={}
for k,t in m.items():
 def arr(name):
  l=t['layout'][name];return struct.unpack_from('<%s%s'%(l['length'],{'Float32Array':'f','Uint16Array':'H','Uint8Array':'B'}[l['type']]),data,t['offset']+l['offset'])
 a=arr('rest');idx=arr('index');edges=collections.Counter()
 for i in range(0,len(idx),3):
  for j in range(3):edges[tuple(sorted([idx[i+j],idx[i+(j+1)%3]]))]+=1
 invalid=0;neck=0;nu,nv,nw,nh=t['profile']['neckOpening'];
 if t['profile']['kind']=='vest':nu,nv,nw,nh=.5,.15,.13,.16
 w=t['profile']['width'];h=t['profile']['height']
 for (i,j),count in edges.items():
  if count!=1:continue
  u=(a[i*3]+a[j*3])/2/w+.5;v=-(a[i*3+1]+a[j*3+1])/2/h
  if v<.29 and abs(u-.5)<.18:
   if v<nv+nh+.02 and abs(u-nu)<nw+.02:neck+=1
   else:invalid+=1
 result[k]={'openShoulderEdges':invalid,'neckOpeningEdges':neck,'physicsComponents':t['topology']['components']}
print(json.dumps(result,indent=2))
