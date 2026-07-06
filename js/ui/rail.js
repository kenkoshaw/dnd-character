// Floating left tool rail. DM: fog/door/monsters/settings + ruler. Player: ruler only
// (character panel button added in Task 16). Tool buttons toggle; popovers mount beside.
export function createRail(role) {
  document.querySelector('#rail')?.remove();
  document.querySelectorAll('.popover').forEach(x => x.remove()); // orphans from a prior rail
  const rail = document.createElement('div');
  rail.id = 'rail';
  document.body.appendChild(rail);

  let activeTool = null;           // 'fog' | 'door' | null
  let openPopover = null;
  const toolListeners = [];

  // One exclusive interaction (e.g. calibration) may hold the world's clicks;
  // opening another, switching tools, or rebuilding the rail must close it.
  let exclusiveClose = null;
  function setExclusive(closeFn) { exclusiveClose?.(); exclusiveClose = closeFn; }
  function clearExclusive(closeFn) { if (exclusiveClose === closeFn) exclusiveClose = null; }
  function closeExclusive() { const f = exclusiveClose; exclusiveClose = null; f?.(); }

  function button(icon, title, onClick) {
    const b = document.createElement('button');
    b.textContent = icon; b.title = title;
    b.onclick = () => onClick(b);
    rail.appendChild(b);
    return b;
  }

  function setTool(name, btn) {
    closeExclusive();
    activeTool = activeTool === name ? null : name;
    rail.querySelectorAll('button[data-tool]').forEach(x => x.classList.remove('active'));
    if (activeTool) btn.classList.add('active');
    closePopover();
    toolListeners.forEach(fn => fn(activeTool));
  }

  function showPopover(buildFn) {
    closePopover();
    openPopover = document.createElement('div');
    openPopover.className = 'popover';
    document.body.appendChild(openPopover);
    buildFn(openPopover);
  }
  function closePopover() { openPopover?.remove(); openPopover = null; }

  return {
    rail, button, setTool, showPopover, closePopover,
    setExclusive, clearExclusive, closeExclusive,
    getTool: () => activeTool,
    onToolChange: fn => toolListeners.push(fn),
    isDm: role.kind === 'dm',
  };
}
