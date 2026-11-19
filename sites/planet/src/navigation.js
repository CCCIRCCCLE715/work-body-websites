import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, SITES, heightAt, lakeCoords, arcPoints } from './planet-surface.js';

export function walkable(d) {
  if (heightAt(d) < 0.012 || lakeCoords(d).u < 1.08) return false;
  return !SITES.some(s => {
    const front = d.dot(s.n);
    if (front < 0.9) return false;
    const x = Math.atan2(d.dot(s.frame.r), front) * R;
    const z = Math.atan2(d.dot(s.frame.f), front) * R;
    return Math.abs(x) < s.bounds[0] * s.scale + 0.18 && Math.abs(z) < s.bounds[2] * s.scale + 0.18;
  });
}
export function clearArc(a, b) { return arcPoints(a, b, 0.012).every(walkable); }

export function createNavigator() {
  // Three r170 uses (detail + 1) columns, not exponential subdivision:
  // 20 * 18^2 = 6,480 triangles and 3,242 welded vertices; no rendered meshes are added.
  let geometry = new THREE.IcosahedronGeometry(1, 17);
  geometry.deleteAttribute('normal'); geometry.deleteAttribute('uv');
  geometry = mergeVertices(geometry, 1e-5);
  const pos = geometry.attributes.position;
  const nodes = Array.from({ length: pos.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(pos, i).normalize());
  const land = nodes.map(walkable), links = nodes.map(() => new Set());
  const ids = geometry.index.array;
  for (let i = 0; i < ids.length; i += 3) for (let k = 0; k < 3; k++) {
    const a = ids[i + k], b = ids[i + (k + 1) % 3];
    if (land[a] && land[b]) { links[a].add(b); links[b].add(a); }
  }
  const edges = links.map((neighbours, i) => [...neighbours].filter(j => clearArc(nodes[i], nodes[j])));
  geometry.dispose();
  function connect(d) {
    return nodes.map((n, i) => ({ i, dot: n.dot(d) })).filter(n => land[n.i])
      .sort((a, b) => b.dot - a.dot).slice(0, 16).filter(n => clearArc(d, nodes[n.i])).map(n => n.i);
  }
  function route(start, goal) {
    if (!walkable(goal)) return null;
    if (clearArc(start, goal)) return [start.clone(), goal.clone()];
    const starts = connect(start), ends = new Set(connect(goal));
    if (!starts.length || !ends.size) return null;
    const cost = new Float64Array(nodes.length).fill(Infinity);
    const score = new Float64Array(nodes.length).fill(Infinity);
    const prev = new Int32Array(nodes.length).fill(-1);
    const open = new Set(starts);
    for (const i of starts) { cost[i] = start.angleTo(nodes[i]); score[i] = cost[i] + nodes[i].angleTo(goal); }
    let end = -1;
    while (open.size) {
      let best = -1;
      for (const i of open) if (best < 0 || score[i] < score[best]) best = i;
      if (ends.has(best)) { end = best; break; }
      open.delete(best);
      for (const next of edges[best]) {
        const g = cost[best] + nodes[best].angleTo(nodes[next]);
        if (g >= cost[next]) continue;
        cost[next] = g; prev[next] = best; score[next] = g + nodes[next].angleTo(goal); open.add(next);
      }
    }
    if (end < 0) return null;
    const points = [goal.clone()];
    for (let i = end; i >= 0; i = prev[i]) points.unshift(nodes[i]);
    points.unshift(start.clone());
    const path = [points[0]];
    for (let i = 0; i < points.length - 1;) {
      let j = points.length - 1;
      while (j > i + 1 && !clearArc(points[i], points[j])) j--;
      path.push(points[j].clone()); i = j;
    }
    return path;
  }
  return { route };
}
