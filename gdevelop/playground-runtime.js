// V0.3 GDevelop Playground runtime. This file is also embedded into game.json.
const dt = runtimeScene.getTimeManager().getElapsedTime() / 1000;
const entities = runtimeScene.getObjects('Entity');
const states = ['Burning', 'Wet', 'Frozen', 'Poisoned'];
const pg = runtimeScene.__statePlayground || (runtimeScene.__statePlayground = {
  running: true, logs: [], overlaps: new Set(), tickAt: new Map(), timed: [],
  selectedState: 'Burning',
  effects: {
    Burning: { OnEnter: [], OnTick: [{ type: 'RemoveStateProgress', target: 'Frozen', amount: 5 }], OnExit: [] },
    Wet: { OnEnter: [], OnTick: [], OnExit: [] },
    Frozen: { OnEnter: [], OnTick: [{ type: 'RemoveStateProgress', target: 'Burning', amount: 5 }], OnExit: [] },
    Poisoned: { OnEnter: [], OnTick: [], OnExit: [] }
  }
});
const addLog = text => {
  const time = (runtimeScene.getTimeManager().getTimeFromStart() / 1000).toFixed(1);
  pg.logs.unshift(`${time}s · ${text}`);
  pg.logs = pg.logs.slice(0, 14);
};
const read = (v, ...path) => path.slice(1).reduce((p, key) => p == null ? undefined : p[key], v.get(path[0]).toJSObject());
const write = (v, value, ...path) => {
  const root = v.get(path[0]), data = root.toJSObject() || {};
  let p = data;
  for (let i = 1; i < path.length - 1; i++) p = p[path[i]] || (p[path[i]] = {});
  p[path[path.length - 1]] = value;
  root.fromJSObject(data);
};
const num = (v, ...path) => Number(read(v, ...path) || 0);
const setNum = (v, value, ...path) => write(v, value, ...path);
const bool = (v, ...path) => Boolean(read(v, ...path));
const setBool = (v, value, ...path) => write(v, value, ...path);
const entityName = e => e.getVariables().get('Name').getAsString();

const applyEffect = (entity, ownerState, trigger, effect) => {
  const v = entity.getVariables();
  const amount = Math.max(0, Number(effect.amount) || 0);
  if (effect.type === 'AddAttribute') {
    setNum(v, num(v, 'Attributes', effect.target) + amount, 'Attributes', effect.target);
    if (effect.duration > 0) pg.timed.push({ entity, attribute: effect.target, amount, remaining: effect.duration });
    addLog(`${entityName(entity)} gains ${effect.target} +${amount}${effect.duration > 0 ? ` (${effect.duration}s)` : ''}`);
  } else if (effect.type === 'RemoveAttribute') {
    setNum(v, Math.max(0, num(v, 'Attributes', effect.target) - amount), 'Attributes', effect.target);
    addLog(`${entityName(entity)} loses ${effect.target} ${amount}`);
  } else {
    const active = bool(v, 'States', effect.target, 'Active');
    const field = active ? 'ExitProgress' : 'EnterProgress';
    const direction = effect.type === 'AddStateProgress' ? (active ? -1 : 1) : (active ? 1 : -1);
    setNum(v, Math.max(0, Math.min(100, num(v, 'States', effect.target, field) + direction * amount)), 'States', effect.target, field);
    addLog(`${entityName(entity)} ${effect.target} ${field} ${direction > 0 ? '+' : '−'}${amount}`);
  }
  addLog(`${ownerState}.${trigger} → ${effect.type}`);
};
const runTrigger = (entity, state, trigger) => (pg.effects[state][trigger] || []).forEach(effect => applyEffect(entity, state, trigger, effect));

const effectTypes = ['AddAttribute', 'RemoveAttribute', 'AddStateProgress', 'RemoveStateProgress'];
const attributes = ['Fire', 'Water', 'Ice', 'Poison'];
const renderEditor = () => {
  const editor = pg.root.querySelector('#sp-editor');
  const state = pg.selectedState;
  editor.innerHTML = `<div class="sp-editor-head"><b>TRIGGER EFFECTS</b><select id="sp-state">${states.map(s => `<option ${s === state ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="sp-lock">${pg.running ? '运行中：暂停后可编辑' : '已暂停：修改立即生效'}</div>` +
    ['OnEnter', 'OnTick', 'OnExit'].map(trigger => `<section><div class="sp-trigger"><b>${trigger}</b><button data-add="${trigger}" ${pg.running ? 'disabled' : ''}>＋ Add Effect</button></div>${pg.effects[state][trigger].length ? pg.effects[state][trigger].map((effect, index) => {
      const targetList = effect.type.includes('Attribute') ? attributes : states;
      return `<div class="sp-effect" data-trigger="${trigger}" data-index="${index}"><select data-field="type" ${pg.running ? 'disabled' : ''}>${effectTypes.map(type => `<option ${type === effect.type ? 'selected' : ''}>${type}</option>`).join('')}</select><select data-field="target" ${pg.running ? 'disabled' : ''}>${targetList.map(target => `<option ${target === effect.target ? 'selected' : ''}>${target}</option>`).join('')}</select><input data-field="amount" type="number" min="1" max="5" value="${effect.amount || 1}" ${pg.running ? 'disabled' : ''}><input data-field="duration" title="0 = Permanent" type="number" min="0" value="${effect.duration || 0}" ${effect.type !== 'AddAttribute' || pg.running ? 'disabled' : ''}><button data-delete ${pg.running ? 'disabled' : ''}>×</button></div>`;
    }).join('') : '<div class="sp-empty">No Effects</div>'}</section>`).join('') +
    `<section class="sp-condition"><b>CONDITION EFFECTS · READ ONLY</b><div>ActiveFor 5s → AddAttribute Fire +1</div><div>InactiveFor 10s → RemoveAttribute Fire 1</div></section>`;
};

if (!pg.root) {
  const host = document.getElementById('canvasArea') || document.body;
  host.style.position = 'relative';
  const root = document.createElement('div');
  root.id = 'state-playground-ui';
  root.innerHTML = `<style>#state-playground-ui{position:absolute;inset:0;pointer-events:none;color:#dcecff;font:14px system-ui,sans-serif}#sp-toolbar{position:absolute;left:18px;top:16px;display:flex;gap:10px;align-items:center;pointer-events:auto}#sp-toolbar strong{font-size:18px}#sp-toolbar button,#sp-editor button,#sp-editor select,#sp-editor input{border:1px solid #58d8ef;background:#132434;color:#eaffff;border-radius:6px;padding:5px 8px}button:disabled,select:disabled,input:disabled{opacity:.45}#sp-cards{position:absolute;right:16px;top:16px;width:292px;display:grid;gap:8px}.sp-card{background:#0d1722e8;border:1px solid #29465d;border-radius:9px;padding:9px 11px}.sp-card.active{border-color:#ff754f;box-shadow:0 0 16px #ff5b3433}.sp-name{font-weight:700;color:#fff}.sp-row{display:flex;justify-content:space-between;margin-top:4px}.sp-meter{height:5px;background:#1c2b38;border-radius:4px;overflow:hidden;margin-top:3px}.sp-meter i{display:block;height:100%;background:#57d9ef}.sp-card.active .sp-meter i{background:#ff7650}#sp-log{position:absolute;left:18px;bottom:18px;width:390px;max-height:150px;overflow:hidden;background:#081019df;border:1px solid #253d50;border-radius:9px;padding:10px}#sp-log>b,#sp-editor>div>b{color:#6ee7ff}#sp-help{position:absolute;left:18px;top:62px;color:#8ba9bd}#sp-editor{position:absolute;left:18px;top:92px;width:430px;max-height:270px;overflow:auto;background:#081019ee;border:1px solid #29465d;border-radius:9px;padding:10px;pointer-events:auto}.sp-editor-head,.sp-trigger{display:flex;justify-content:space-between;align-items:center}.sp-lock,.sp-empty{color:#8ba9bd;margin:6px 0}.sp-trigger{border-top:1px solid #29465d;padding-top:7px;margin-top:7px}.sp-effect{display:grid;grid-template-columns:1.4fr 1fr 48px 62px 28px;gap:4px;margin-top:5px}.sp-effect input{min-width:0}.sp-condition{border-top:1px solid #29465d;margin-top:10px;padding-top:8px;color:#a9bed0}.sp-condition div{margin-top:4px}</style><div id="sp-toolbar"><strong>State → Effect → Attribute</strong><button id="sp-toggle">Ⅱ 暂停</button><button id="sp-reset">重置</button></div><div id="sp-help">拖动 A 与 B 重叠；暂停后可以编辑 Trigger Effects。</div><div id="sp-editor"></div><div id="sp-cards"></div><div id="sp-log"><b>EVENT LOG</b><div id="sp-log-lines"></div></div>`;
  host.appendChild(root);
  pg.root = root;
  root.querySelector('#sp-toggle').onclick = () => { pg.running = !pg.running; root.querySelector('#sp-toggle').textContent = pg.running ? 'Ⅱ 暂停' : '▶ 继续'; addLog(pg.running ? 'Simulation resumed' : 'Simulation paused'); renderEditor(); };
  root.querySelector('#sp-reset').onclick = () => location.reload();
  root.querySelector('#sp-editor').onchange = event => {
    if (event.target.id === 'sp-state') { pg.selectedState = event.target.value; renderEditor(); return; }
    if (pg.running) return;
    const row = event.target.closest('.sp-effect'); if (!row) return;
    const effect = pg.effects[pg.selectedState][row.dataset.trigger][Number(row.dataset.index)];
    effect[event.target.dataset.field] = event.target.type === 'number' ? Number(event.target.value) : event.target.value;
    if (event.target.dataset.field === 'type') { effect.target = effect.type.includes('Attribute') ? 'Fire' : 'Burning'; effect.duration = 0; renderEditor(); }
  };
  root.querySelector('#sp-editor').onclick = event => {
    if (pg.running) return;
    if (event.target.dataset.add) { pg.effects[pg.selectedState][event.target.dataset.add].push({ type: 'AddAttribute', target: 'Fire', amount: 1, duration: 0 }); renderEditor(); }
    if (event.target.hasAttribute('data-delete')) { const row = event.target.closest('.sp-effect'); pg.effects[pg.selectedState][row.dataset.trigger].splice(Number(row.dataset.index), 1); renderEditor(); }
  };
  addLog('Playground ready');
  renderEditor();
}

if (pg.running) {
  for (let i = pg.timed.length - 1; i >= 0; i--) {
    const contribution = pg.timed[i]; contribution.remaining -= dt;
    if (contribution.remaining <= 0) { const v = contribution.entity.getVariables(); setNum(v, Math.max(0, num(v, 'Attributes', contribution.attribute) - contribution.amount), 'Attributes', contribution.attribute); addLog(`${entityName(contribution.entity)} timed ${contribution.attribute} expired`); pg.timed.splice(i, 1); }
  }
  const influence = new Map(entities.map(e => [e, { Fire: 0, Water: 0, Ice: 0, Poison: 0 }]));
  const overlaps = (a, b) => Math.abs(a.getCenterXInScene() - b.getCenterXInScene()) < 88 && Math.abs(a.getCenterYInScene() - b.getCenterYInScene()) < 88;
  for (let i = 0; i < entities.length; i++) for (let j = i + 1; j < entities.length; j++) {
    const a = entities[i], b = entities[j], pair = [num(a.getVariables(), 'Id'), num(b.getVariables(), 'Id')].sort().join('-');
    if (!overlaps(a, b)) { if (pg.overlaps.has(pair)) { pg.overlaps.delete(pair); addLog(`Entity ${pair} overlap ended`); } continue; }
    if (!pg.overlaps.has(pair)) { pg.overlaps.add(pair); addLog(`Entity ${pair} overlap started`); }
    for (const attribute of attributes) { influence.get(a)[attribute] += num(b.getVariables(), 'Attributes', attribute); influence.get(b)[attribute] += num(a.getVariables(), 'Attributes', attribute); }
  }
  const responses = { Fire: 'Burning', Water: 'Wet', Ice: 'Frozen', Poison: 'Poisoned' };
  for (const entity of entities) {
    const v = entity.getVariables();
    for (const [attribute, state] of Object.entries(responses)) {
      const active = bool(v, 'States', state, 'Active'), strength = influence.get(entity)[attribute];
      if (!active && strength > 0) { const next = Math.min(100, num(v, 'States', state, 'EnterProgress') + strength * 20 * dt); setNum(v, next, 'States', state, 'EnterProgress'); if (next >= 100) { setBool(v, true, 'States', state, 'Active'); setNum(v, 0, 'States', state, 'ExitProgress'); setNum(v, 0, 'States', state, 'ActiveDuration'); addLog(`${entityName(entity)} enters ${state}`); runTrigger(entity, state, 'OnEnter'); } }
      else if (active && strength <= 0) { const next = Math.min(100, num(v, 'States', state, 'ExitProgress') + 20 * dt); setNum(v, next, 'States', state, 'ExitProgress'); if (next >= 100) { setBool(v, false, 'States', state, 'Active'); setNum(v, 0, 'States', state, 'EnterProgress'); setNum(v, 0, 'States', state, 'InactiveDuration'); addLog(`${entityName(entity)} exits ${state}`); runTrigger(entity, state, 'OnExit'); } }
      else if (active && strength > 0) setNum(v, Math.max(0, num(v, 'States', state, 'ExitProgress') - strength * 20 * dt), 'States', state, 'ExitProgress');
      if (bool(v, 'States', state, 'Active')) { setNum(v, num(v, 'States', state, 'ActiveDuration') + dt, 'States', state, 'ActiveDuration'); setNum(v, 0, 'States', state, 'InactiveDuration'); const key = `${num(v, 'Id')}-${state}`, now = runtimeScene.getTimeManager().getTimeFromStart() / 1000; if (now >= (pg.tickAt.get(key) || 0)) { pg.tickAt.set(key, now + 1); runTrigger(entity, state, 'OnTick'); } }
      else { setNum(v, num(v, 'States', state, 'InactiveDuration') + dt, 'States', state, 'InactiveDuration'); setNum(v, 0, 'States', state, 'ActiveDuration'); }
    }
    const burning = bool(v, 'States', 'Burning', 'Active'), granted = bool(v, 'States', 'Burning', 'Granted');
    if (burning && !granted && num(v, 'States', 'Burning', 'ActiveDuration') >= 5) { setNum(v, num(v, 'Attributes', 'Fire') + 1, 'Attributes', 'Fire'); setBool(v, true, 'States', 'Burning', 'Granted'); addLog(`${entityName(entity)} gains Fire +1 · Burning ActiveFor 5s`); }
    if (!burning && granted && num(v, 'States', 'Burning', 'InactiveDuration') >= 10) { setNum(v, Math.max(0, num(v, 'Attributes', 'Fire') - 1), 'Attributes', 'Fire'); setBool(v, false, 'States', 'Burning', 'Granted'); addLog(`${entityName(entity)} loses Fire +1 · Burning InactiveFor 10s`); }
  }
}

const cards = pg.root.querySelector('#sp-cards');
cards.innerHTML = entities.map(entity => { const v = entity.getVariables(), name = entityName(entity), attrs = v.get('Attributes').toJSObject() || {}, s = (v.get('States').toJSObject() || {}).Burning || {}, active = !!s.Active, phase = active ? 'Exit' : 'Enter', progress = active ? (s.ExitProgress || 0) : (s.EnterProgress || 0), duration = active ? (s.ActiveDuration || 0) : (s.InactiveDuration || 0); if (entity.setColor) entity.setColor(active ? '255;105;66' : '255;255;255'); return `<div class="sp-card ${active ? 'active' : ''}"><div class="sp-row"><span class="sp-name">${name}</span><b>${active ? '🔥 BURNING' : 'INACTIVE'}</b></div><div class="sp-row"><span>ATTR · Fire</span><b>+${attrs.Fire || 0}</b></div><div class="sp-row"><span>${phase} Progress</span><span>${Math.round(progress)}/100</span></div><div class="sp-meter"><i style="width:${Math.min(100, progress)}%"></i></div><div class="sp-row"><span>${active ? 'Active' : 'Inactive'} Duration</span><span>${duration.toFixed(1)}s</span></div>${active && !s.Granted ? `<div class="sp-row"><span>Fire grant</span><span>${Math.min(5, duration).toFixed(1)}/5.0s</span></div>` : ''}${!active && s.Granted ? `<div class="sp-row"><span>Fire removal</span><span>${Math.min(10, duration).toFixed(1)}/10.0s</span></div>` : ''}</div>`; }).join('');
pg.root.querySelector('#sp-log-lines').innerHTML = pg.logs.map(line => `<div>${line}</div>`).join('');
