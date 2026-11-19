// Rail-space clearance for rotating garments. Every pair uses separating axes;
// the compact resting layout is preserved whenever it already has enough room.
// One motion budget feeds both the solver and the rail clearance.
export const GARMENT_TURN={durationScale:.6,stiffness:86,damping:18.5,slideSpeed:.65};

export function garmentMotion(profile){
  const robe=['robe','hanfu','wizard'].includes(profile.kind),armour=profile.kind==='vest',structured=armour||profile.kind==='space';
  return {robe,structured,x:robe?.045:structured?.018:.030,y:robe?.055:structured?.018:.035,z:robe?.105:structured?.024:.055,swing:armour?.055:structured?.03:.018,bending:robe?.018:structured?profile.bending:.035,damping:robe?.028:structured?profile.damping*.85:.032,kick:robe?2.2:structured?.7:1.65,wind:robe?4:structured?.7:2.3};
}
export function garmentEnvelope(rest,profile){
  const motion=garmentMotion(profile);let width=0,depth=0;
  for(let i=0;i<rest.length;i+=3){
    // The swivel swings in the garment's plane around the bottom of the hook.
    width=Math.max(width,Math.abs(rest[i])+motion.x+(Math.abs(rest[i+1]+.112)+.055)*Math.sin(motion.swing));
    depth=Math.max(depth,Math.abs(rest[i+2])+motion.z);
  }
  return {width:width+.008,depth:depth+.006};
}
export function railGap(a,b,angleA,angleB){
  const u=[Math.cos(angleA),-Math.sin(angleA)],v=[-u[1],u[0]],s=[Math.cos(angleB),-Math.sin(angleB)],t=[-s[1],s[0]];
  const dot=(x,y)=>Math.abs(x[0]*y[0]+x[1]*y[1]);
  let gap=Infinity;
  for(const n of [u,v,s,t])if(Math.abs(n[0])>1e-7)gap=Math.min(gap,(a.width*dot(u,n)+a.depth*dot(v,n)+b.width*dot(s,n)+b.depth*dot(t,n)+.008)/Math.abs(n[0]));
  return gap;
}
export function railLayout(items,angles,halfLength,anchor=null,slideStep=Infinity,homeBlend=1){
  const n=items.length,gaps=Array.from({length:n},()=>new Float64Array(n)),early=new Float64Array(n),late=new Float64Array(n),upper=new Float64Array(n);
  for(let i=0;i<n;i++){
    const g=items[i],extent=Math.abs(Math.cos(angles[i]))*g.envelope.width+Math.abs(Math.sin(angles[i]))*g.envelope.depth;
    early[i]=Math.max(-halfLength+extent,g.railPlaced?g.pivot.position.x-slideStep:-Infinity,anchor?.index===i?anchor.x:-Infinity);
    upper[i]=Math.min(halfLength-extent,g.railPlaced?g.pivot.position.x+slideStep:Infinity,anchor?.index===i?anchor.x:Infinity);
    for(let j=0;j<i;j++){gaps[j][i]=railGap(items[j].envelope,g.envelope,angles[j],angles[i]);early[i]=Math.max(early[i],early[j]+gaps[j][i]);}
  }
  if(early.some((x,i)=>x>upper[i]+1e-8))return null;
  for(let i=n-1;i>=0;i--){late[i]=upper[i];for(let j=i+1;j<n;j++)late[i]=Math.min(late[i],late[j]-gaps[i][j]);}
  const left=[],right=[],goals=items.map(g=>{const home=g.homeX??g.x,current=g.pivot.position.x;return g.railPlaced&&Math.abs(home-current)>.00001?current+(home-current)*homeBlend:home;});
  for(let i=0;i<n;i++){let low=early[i];for(let j=0;j<i;j++)low=Math.max(low,left[j]+gaps[j][i]);left[i]=Math.max(low,Math.min(late[i],goals[i]));}
  for(let i=n-1;i>=0;i--){let high=late[i];for(let j=i+1;j<n;j++)high=Math.min(high,right[j]-gaps[i][j]);right[i]=Math.max(early[i],Math.min(high,goals[i]));}
  return left.map((x,i)=>(x+right[i])/2);
}
export function initializeRail(items,halfLength){
  const homes=railLayout(items,items.map(g=>g.railYaw),halfLength);
  items.forEach((g,i)=>{g.x=g.homeX=homes[i];g.restYaw=g.railYaw;g.pivot.position.x=homes[i];g.railPlaced=true;});
}
export function resolveRailActive(items,requested,halfLength,hoverAngle=34*Math.PI/180){
  if(items.railRequest!==requested){
    items.railRequest=requested;
    items.railReturning=false;
    if(requested){
      // A neighbor may have yielded into a slot with insufficient room to open.
      // Check the complete turn, not only the next frame's angle, before locking
      // that temporary slot. Otherwise the new anchor can also block the old
      // garment's return and both springs remain constrained forever.
      const angles=items.map(g=>g.restYaw),anchor={index:requested.index,x:requested.pivot.position.x};
      const steps=Math.ceil((requested.restYaw+hoverAngle)/(.02));
      for(let i=0;i<=steps;i++){
        angles[requested.index]=-hoverAngle+(requested.restYaw+hoverAngle)*i/steps;
        if(!railLayout(items,angles,halfLength,anchor)){items.railReturning=true;break;}
      }
    }
  }
  if(items.railReturning&&items.every(g=>Math.abs(g.railYaw-g.restYaw)<.002&&Math.abs(g.pivot.position.x-g.homeX)<.0001))items.railReturning=false;
  // During a crowded handoff the row closes without an anchor. The latest
  // requested garment opens only after it reaches its original slot, and then
  // stays fixed throughout its turn. Pointer changes can replace the request.
  return items.railReturning?null:requested;
}
export function arrangeRail(items,active,halfLength,dt=1/60){
  if(items.railAnchor?.garment!==active)items.railAnchor=active?{garment:active,index:active.index,x:active.pivot.position.x}:null;
  const angles=items.map(g=>g.railYaw),slideStep=GARMENT_TURN.slideSpeed/GARMENT_TURN.durationScale*dt;
  const layout=angles=>railLayout(items,angles,halfLength,items.railAnchor,slideStep,1-Math.exp(-dt*10));
  // Let returning pieces settle first. A rapid hover change cannot open a new
  // garment into space still occupied by the previous garment.
  const order=items.filter(g=>g!==active);if(active)order.push(active);
  for(const g of order){
    const i=g.index,from=angles[i],to=g.rotation.value;angles[i]=to;
    if(!layout(angles)){
      let low=0,high=1;
      for(let k=0;k<12;k++){const t=(low+high)/2;angles[i]=from+(to-from)*t;if(layout(angles))low=t;else high=t;}
      angles[i]=from+(to-from)*low;g.rotation.value=angles[i];g.rotation.velocity=0;
    }
  }
  const positions=layout(angles);
  let moving=false;
  items.forEach((g,i)=>{if(Math.abs(g.pivot.position.x-positions[i])>1e-7)moving=true;g.railYaw=angles[i];g.railPlaced=true;g.pivot.position.x=positions[i];});
  return moving;
}
