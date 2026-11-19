import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildRig, buildOutfitParts, animateRig, trousers, sleeve } from '../src/avatar.js';
import { extractHead, HEAD_CUT_Y } from '../src/avatar-head.js';

test('head keeps its scan recentering and leg visibility preserves shoes', () => {
  const rig = buildRig();
  const head = new THREE.Group(); head.position.y = -.8;
  rig.setHead(head);
  assert.equal(head.position.y, -.8);
  assert.doesNotThrow(() => rig.setLegVisible(false));
  assert.equal(rig.legL.shin.visible, false);
  assert.equal(rig.legL.foot.visible, true);
  rig.setLegVisible(true);
  assert.equal(rig.legL.shin.visible, true);
});

test('trousers and sleeves bend at knees and elbows in the walk cycle', () => {
  const rig=buildRig();
  const parts=buildOutfitParts(rig,o=>{
    for(const side of ['L','R']){
      o['leg'+side].add(trousers(0x333333));
      o['arm'+side].add(sleeve(0xdddddd));
    }
  });
  for(const k of Object.keys(rig.outfit)) rig.outfit[k].add(parts[k]);
  assert.equal(parts.shinL.children.length,1);
  assert.equal(parts.foreR.children.length,1);
  assert.equal(rig.outfit.shinL.parent,rig.legL.knee);
  assert.equal(rig.outfit.foreL.parent,rig.armL.elbow);
  animateRig(rig,{walking:true,t:.5});
  assert.notEqual(rig.legL.knee.rotation.x,0);
  assert.notEqual(rig.armL.elbow.rotation.x,0);
  rig.root.updateMatrixWorld(true);
  const point=new THREE.Vector3(); parts.shinL.getWorldPosition(point);
  assert.ok(Number.isFinite(point.y));
});

test('head cut interpolates UVs at the cut rather than copying a neighbouring texel', () => {
  const geo=new THREE.BufferGeometry();
  const cut=HEAD_CUT_Y;
  geo.setAttribute('position',new THREE.Float32BufferAttribute([0,cut-.1,0, 1,cut+.1,0, 0,cut+.1,1],3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));
  const head=extractHead(new THREE.Mesh(geo,new THREE.MeshStandardMaterial()));
  const clipped=head.children[0].geometry;
  let edge=0;
  for(let i=0;i<clipped.attributes.position.count;i++){
    const pos=clipped.attributes.position;
    assert.ok(pos.getY(i)>=cut-1e-6);
    if(Math.abs(pos.getY(i)-cut)<1e-6){
      edge++;
      assert.ok(Math.abs(clipped.attributes.uv.getX(i)+clipped.attributes.uv.getY(i)-.5)<1e-5);
    }
  }
  assert.ok(edge>0);
});
