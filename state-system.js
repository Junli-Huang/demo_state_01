(function (root) {
  const ATTRIBUTE_DEFS = {
    fire: { name: 'Fire', icon: '🔥', color: '#ff795c', state: 'burning' },
    water: { name: 'Water', icon: '💧', color: '#53a8ff', state: 'wet' },
    frost: { name: 'Ice', icon: '❄️', color: '#8ee6ff', state: 'frozen' },
    toxin: { name: 'Poison', icon: '☠️', color: '#b887ff', state: 'poisoned' }
  };

  const STATE_DEFS = {
    burning: {
      name: 'Burning', icon: '🔥', attribute: 'fire',
      triggers: {
        onEnter: [],
        onTick: [{ kind: 'RemoveStateProgress', state: 'frozen', amount: 5 }],
        onExit: []
      }
    },
    wet: { name: 'Wet', icon: '💧', attribute: 'water', triggers: { onEnter: [], onTick: [], onExit: [] } },
    frozen: {
      name: 'Frozen', icon: '❄️', attribute: 'frost',
      triggers: { onEnter: [], onTick: [{ kind: 'RemoveStateProgress', state: 'burning', amount: 5 }], onExit: [] }
    },
    poisoned: { name: 'Poisoned', icon: '☠️', attribute: 'toxin', triggers: { onEnter: [], onTick: [], onExit: [] } }
  };

  // V0.2.1 only needs two simple, independent duration conditions.
  const RULE_DEFS = [
    {
      id: 'burning-fire-grant',
      label: 'Burning ActiveFor 5s',
      state: 'burning',
      condition: { type: 'StateActiveFor', durationMs: 5000 },
      effect: { kind: 'AddAttribute', attribute: 'fire', amount: 1, sourceRuleId: 'burning-fire-grant' }
    },
    {
      id: 'burning-fire-remove',
      label: 'Burning InactiveFor 10s',
      state: 'burning',
      condition: { type: 'StateInactiveFor', durationMs: 10000 },
      requiresContributionSource: 'burning-fire-grant',
      effect: { kind: 'RemoveAttribute', attribute: 'fire', amount: 1, sourceRuleId: 'burning-fire-grant' }
    }
  ];

  const clamp = n => Math.max(0, Math.min(100, n));
  const blankAttributes = () => Object.fromEntries(Object.keys(ATTRIBUTE_DEFS).map(k => [k, 0]));
  const blankStates = () => Object.fromEntries(Object.keys(STATE_DEFS).map(k => [k, {
    active: false, entry: 0, exit: 0, nextTickAt: 0,
    activeDurationMs: 0, inactiveDurationMs: 0, hasActivated: false
  }]));
  const blankRuleStates = () => Object.fromEntries(RULE_DEFS.map(rule => [rule.id, { triggered: false }]));

  function createEntity(id, name, x = 50, y = 50, base = {}) {
    return {
      id, name, x, y, isEnvironment: false, enabled: true,
      baseAttributes: { ...blankAttributes(), ...base },
      contributions: [], states: blankStates(), ruleStates: blankRuleStates()
    };
  }

  function createEnvironment(id, name) {
    const entity = createEntity(id, name, 0, 0);
    entity.isEnvironment = true;
    return entity;
  }

  function getAttributeTotal(entity, attribute) {
    return entity.baseAttributes[attribute] + entity.contributions
      .filter(c => c.attribute === attribute && c.amount > 0)
      .reduce((sum, c) => sum + c.amount, 0);
  }

  function setBaseAttribute(entity, attribute, amount) {
    entity.baseAttributes[attribute] = Math.max(0, amount);
  }

  function addContribution(entity, attribute, amount, source, duration, nowMs = 0, sourceRuleId = null) {
    const contribution = {
      id: `${source}-${nowMs}-${Math.random()}`,
      attribute, amount, source, sourceRuleId,
      remainingMs: duration == null ? null : duration * 1000
    };
    entity.contributions.push(contribution);
    return contribution;
  }

  function removeBaseAttribute(entity, attribute, amount) {
    const removed = Math.min(entity.baseAttributes[attribute], amount);
    entity.baseAttributes[attribute] -= removed;
    return removed;
  }

  function removeContribution(entity, attribute, amount, sourceRuleId) {
    let remaining = amount;
    for (const contribution of entity.contributions) {
      if (contribution.attribute !== attribute || contribution.sourceRuleId !== sourceRuleId || remaining <= 0) continue;
      const removed = Math.min(contribution.amount, remaining);
      contribution.amount -= removed;
      remaining -= removed;
    }
    entity.contributions = entity.contributions.filter(c => c.amount > 0);
    return amount - remaining;
  }

  function hasContribution(entity, sourceRuleId) {
    return entity.contributions.some(c => c.sourceRuleId === sourceRuleId && c.amount > 0);
  }

  function expireContributions(entity, deltaMs) {
    const expired = [];
    entity.contributions.forEach(c => {
      if (c.remainingMs != null) {
        c.remainingMs -= deltaMs;
        if (c.remainingMs <= 0) expired.push(c);
      }
    });
    entity.contributions = entity.contributions.filter(c => !expired.includes(c));
    return expired;
  }

  function addStateProgress(entity, stateKey, amount) {
    const state = entity.states[stateKey];
    if (!state) return 0;
    if (state.active) state.exit = clamp(state.exit - amount);
    else state.entry = clamp(state.entry + amount);
    return state.active ? state.exit : state.entry;
  }

  function removeStateProgress(entity, stateKey, amount) {
    const state = entity.states[stateKey];
    if (!state) return 0;
    if (state.active) state.exit = clamp(state.exit + amount);
    else state.entry = clamp(state.entry - amount);
    return state.active ? state.exit : state.entry;
  }

  function applyEffect(entity, effect, source, nowMs = 0) {
    if (effect.kind === 'AddAttribute') {
      addContribution(entity, effect.attribute, effect.amount, source, effect.duration, nowMs, effect.sourceRuleId || null);
      return `gains ${ATTRIBUTE_DEFS[effect.attribute].name} +${effect.amount}`;
    }
    if (effect.kind === 'RemoveAttribute') {
      const removed = effect.sourceRuleId
        ? removeContribution(entity, effect.attribute, effect.amount, effect.sourceRuleId)
        : removeBaseAttribute(entity, effect.attribute, effect.amount);
      return `loses ${ATTRIBUTE_DEFS[effect.attribute].name} ${removed}`;
    }
    if (effect.kind === 'AddStateProgress') {
      addStateProgress(entity, effect.state, effect.amount);
      return `${STATE_DEFS[effect.state].name} progress +${effect.amount}`;
    }
    if (effect.kind === 'RemoveStateProgress') {
      removeStateProgress(entity, effect.state, effect.amount);
      return `${STATE_DEFS[effect.state].name} progress −${effect.amount}`;
    }
    return 'unknown effect ignored';
  }

  function advanceEntity(entity, influence = {}, deltaMs = 100, nowMs = 0) {
    const events = [];
    Object.entries(STATE_DEFS).forEach(([key, definition]) => {
      const state = entity.states[key];
      const wasActive = state.active;
      const previousInactiveMs = state.inactiveDurationMs;
      const power = influence[definition.attribute] || 0;

      if (power > 0) {
        if (!state.active) {
          const before = state.entry;
          const oldBand = Math.floor(before / 20);
          state.entry = clamp(state.entry + power * deltaMs / 100);
          state.exit = 0;
          const band = Math.floor(state.entry / 20);
          events.push({ type: 'progress', state: key, phase: 'Enter', delta: +(state.entry - before).toFixed(1), value: state.entry, crossedBand: band > oldBand });
          if (state.entry >= 100) {
            state.active = true;
            state.entry = 100;
            state.exit = 0;
            state.activeDurationMs = 0;
            state.inactiveDurationMs = 0;
            state.hasActivated = true;
            state.nextTickAt = nowMs + 1000;
            events.push({ type: 'enter', state: key, cancelledInactiveMs: previousInactiveMs });
          }
        } else {
          state.exit = clamp(state.exit - power * deltaMs / 400);
        }
      } else if (state.active) {
        const before = state.exit;
        const oldBand = Math.floor(before / 20);
        state.exit = clamp(state.exit + deltaMs / 100);
        const band = Math.floor(state.exit / 20);
        events.push({ type: 'progress', state: key, phase: 'Exit', delta: +(state.exit - before).toFixed(1), value: state.exit, crossedBand: band > oldBand });
        if (state.exit >= 100) {
          state.active = false;
          state.entry = 0;
          state.exit = 0;
          state.activeDurationMs = 0;
          state.inactiveDurationMs = 0;
          state.nextTickAt = 0;
          events.push({ type: 'exit', state: key });
        }
      } else {
        state.entry = clamp(state.entry - deltaMs / 500);
      }

      if (state.active) {
        state.activeDurationMs += deltaMs;
        state.inactiveDurationMs = 0;
      } else if (state.hasActivated) {
        state.inactiveDurationMs += deltaMs;
      }

      if (state.active && nowMs >= state.nextTickAt) {
        state.nextTickAt = nowMs + 1000;
        events.push({ type: 'tick', state: key });
      }

      if (wasActive && !state.active) events.push({ type: 'inactiveCountdownStarted', state: key });
    });
    return events;
  }

  function evaluateRules(entity, nowMs = 0) {
    const events = [];
    for (const rule of RULE_DEFS) {
      const state = entity.states[rule.state];
      const ruleState = entity.ruleStates[rule.id];

      if (rule.condition.type === 'StateInactiveFor' && state.active) {
        ruleState.triggered = false;
      }

      const conditionMet = rule.condition.type === 'StateActiveFor'
        ? state.active && state.activeDurationMs >= rule.condition.durationMs
        : !state.active && state.hasActivated && state.inactiveDurationMs >= rule.condition.durationMs;
      const requirementMet = !rule.requiresContributionSource || hasContribution(entity, rule.requiresContributionSource);

      if (!conditionMet || !requirementMet || ruleState.triggered) continue;
      ruleState.triggered = true;
      const result = applyEffect(entity, rule.effect, rule.label, nowMs);
      events.push({ type: 'ruleTriggered', rule, result });

      if (rule.effect.kind === 'RemoveAttribute' && rule.effect.sourceRuleId) {
        const grantState = entity.ruleStates[rule.effect.sourceRuleId];
        if (grantState) grantState.triggered = false;
      }
    }
    return events;
  }

  const api = {
    ATTRIBUTE_DEFS, STATE_DEFS, RULE_DEFS,
    createEntity, createEnvironment, getAttributeTotal, setBaseAttribute,
    addContribution, removeBaseAttribute, removeContribution, hasContribution, expireContributions,
    addStateProgress, removeStateProgress, applyEffect, advanceEntity, evaluateRules
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.StateSystem = api;
})(typeof window !== 'undefined' ? window : globalThis);
