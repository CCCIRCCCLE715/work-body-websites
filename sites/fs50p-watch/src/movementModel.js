import * as THREE from 'three';

/** Fit the locally rebuilt movement into the watch; retain the exported geometry. */
export function prepareMovement(source) {
  const movement = new THREE.Group();
  const fitted = new THREE.Group();
  fitted.add(source);
  source.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(source);
  const initialSize = bounds.getSize(new THREE.Vector3());
  // The thinnest axis is the movement's depth; its decorated face is inspected separately.
  if (initialSize.y < initialSize.x && initialSize.y < initialSize.z) source.rotation.x += Math.PI / 2;
  else if (initialSize.x < initialSize.y && initialSize.x < initialSize.z) source.rotation.y += Math.PI / 2;
  source.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(source);
  const size = bounds.getSize(new THREE.Vector3());
  source.position.sub(bounds.getCenter(new THREE.Vector3()));
  fitted.scale.setScalar(1.76 / Math.max(size.x, size.y));
  movement.add(fitted);
  movement.position.z = -.17;
  const materials = [];
  source.traverse(node => {
    if (!node.isMesh) return;
    const original = Array.isArray(node.material) ? node.material : [node.material];
    const clones = original.map(m => {
      const material = m.clone();
      material.envMapIntensity = .9;
      material.aoMapIntensity = 1.0;
      if(material.name==='Brushed bronze baseplate'){material.color.set('#343b3f');material.roughness=.38;}
      if(material.name==='Brushed ratchet steel'){material.color.set('#252c31');material.roughness=.32;}

      materials.push({material, opacity: material.opacity, transparent: material.transparent});
      return material;
    });
    node.material = Array.isArray(node.material) ? clones : clones[0];
  });
  return {
    object: movement,
    setOpacity(value) {
      movement.visible = value > .005;
      for (const entry of materials) {
        entry.material.opacity = entry.opacity * value;
        entry.material.transparent = entry.transparent || value < .999;
      }
    },
  };
}
