import * as THREE from 'three';

// Neutral photographic reflection cards: broad key, narrow rim and dark gaps.
export function createStudioEnvironment(renderer) {
  const studio = new THREE.Scene();
  studio.background = new THREE.Color(.14,.15,.16);
  const panels = [
    {p:[-4.5,2.4,4],s:[3.8,7.5],power:5.2},
    {p:[.4,0,7],s:[2.5,8],power:4.5},
    {p:[4.2,.5,3],s:[.75,6.5],power:7.5},
    {p:[0,5,1],s:[5.5,1.8],power:3.5},
    {p:[-1,-3,4],s:[5,1],power:1.4},
    {p:[1,1,-4],s:[2.5,5],power:2.1},
  ];
  for(const {p,s,power} of panels){
    const material=new THREE.MeshBasicMaterial({color:new THREE.Color(power,power,power),side:THREE.DoubleSide});
    const panel=new THREE.Mesh(new THREE.PlaneGeometry(...s),material);
    panel.position.set(...p);panel.lookAt(0,0,0);studio.add(panel);
  }
  const generator=new THREE.PMREMGenerator(renderer);
  const target=generator.fromScene(studio,.04,.1,30);
  generator.dispose();studio.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});
  return target;
}
