import { ISLAND_PRODUCTS, ISLAND_PROFILES } from './island-collection.js?v=huangbai-portfolio-1';

// Content, atmosphere and motion controls. Units for the room are metres.
export const STORE = {
  brand: 'HUANGBAI', suffix: '', headline: ['Wearable', 'Portfolio'],
  chips: ['12 works', 'Many roles', 'One creator'], notes: ['Design', 'Code', 'Stories'],
  link: 'Explore my work', accent: '#F3FF00',
  atmosphere: ['#34444e','#465762','#596b76','#6e818c','#8496a0','#9baab3','#afbcc4','#c2cdd4','#d4dde3','#e2e9ed','#edf2f5'],
  lighting: {
    exposure: 1.15,
    sky: '#ffffff', ground: '#cad6df', ambient: 2.1,
    key: { color:'#fff6e9', intensity:4.2, position:[-3.4,4.2,.5] },
    fill: { color:'#edf5ff', intensity:2.6, position:[3.5,2.6,1.5] },
    rim: { color:'#ffffff', intensity:2.7, position:[1.8,3.1,-7] }
  },
  room: { size: 10, height: 3.2, rackWidth: 5.4, garmentSpacing: .32, rackHeight: 1.8, rackInset: .5 },
  motion: { commitAt: .7, scrollScreens: 1.1, maxEdgeTurn: 40, heroBlur: 8, parallax: [18,27,48,36,15] },
  cloth: { restAngle: 68, hoverAngle: 34, airflow: .09, impulse: .4, gravity: 3.2, settleSeconds: 8 },
  clothProfiles: ISLAND_PROFILES,
  products: ISLAND_PRODUCTS
};
