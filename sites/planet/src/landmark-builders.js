// Code-built landmarks (no imported models). Each module exports build() -> { group, update }.
export const BUILDERS = {
  emperor: () => import('./landmarks/emperor.js'),
  scholar: () => import('./landmarks/scholar.js'),
  survivor: () => import('./landmarks/survivor.js'),
  director: () => import('./landmarks/director.js'),
  drama_lead: () => import('./landmarks/drama_lead.js'),
  designer: () => import('./landmarks/designer.js'),
  phone_steward: () => import('./landmarks/phone_steward.js'),
  programmer: () => import('./landmarks/programmer.js'),
  curator: () => import('./landmarks/curator.js'),
  wizard: () => import('./landmarks/wizard.js'),
  racer: () => import('./landmarks/racer.js'),
  planner: () => import('./landmarks/planner.js'),
};
