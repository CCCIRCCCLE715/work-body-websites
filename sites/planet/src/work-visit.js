// A visit owns its arrival callback, so interrupted journeys cannot reveal old work.
export function createWorkVisit({ walk, dress, reveal, hide }) {
  let visit = null;
  return {
    get phase() { return visit?.phase ?? 'idle'; },
    begin(entry) {
      hide();
      const next = { entry, phase: 'walking' };
      visit = next;
      const started = walk(entry, () => {
        if (visit !== next) return;
        next.phase = 'dressing';
        dress(entry);
      });
      if (!started) visit = null;
      return started;
    },
    cancel() { visit = null; hide(); },
    update(avatar) {
      if (visit?.phase !== 'dressing' || avatar.walking || avatar.pop > 0 || avatar.outfit !== visit.entry.site.id) return;
      visit.phase = 'open';
      reveal(visit.entry);
    },
  };
}
