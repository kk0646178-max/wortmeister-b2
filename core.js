export function dueWordsFrom(words, timestamp = Date.now()) {
  return (words || []).filter(w => {
    const s = w.srs || {};
    return (s.reps || 0) > 0 && Number.isFinite(s.due) && s.due <= timestamp;
  }).sort((a, b) => (a.srs.due || 0) - (b.srs.due || 0));
}
export function newWordsFrom(words) {
  return (words || []).filter(w => {
    const s = w.srs || {};
    return (s.reps || 0) === 0 && !s.introduced;
  }).sort((a, b) => ((a.source === 'personal') ? 0 : 1) - ((b.source === 'personal') ? 0 : 1) || ((a.createdAt || 0) - (b.createdAt || 0)));
}
export function buildDailyQueue(words, settings = {}, timestamp = Date.now()) {
  const due = dueWordsFrom(words, timestamp);
  const fresh = newWordsFrom(words).slice(0, Math.max(0, Number(settings.newPerDay) || 5));
  const max = Math.max(1, Number(settings.sessionSize) || 25);
  return [...due, ...fresh].slice(0, max);
}
export function applyReviewGrade(word, grade, timestamp = Date.now()) {
  if (!['again', 'hard', 'good', 'easy'].includes(grade)) throw new Error('Unknown review grade');
  const old = {box:1,ease:2.5,interval:0,due:null,reps:0,lapses:0,last:null,introduced:null,...(word.srs || {})};
  let interval = old.interval || 0, ease = old.ease || 2.5, box = old.box || 1, lapses = old.lapses || 0;
  if (grade === 'again') { interval = 0.01; ease = Math.max(1.3, ease - 0.2); box = 1; lapses += 1; }
  if (grade === 'hard') { interval = old.reps === 0 ? 1 : Math.max(1, Math.ceil(interval * 1.2)); ease = Math.max(1.3, ease - 0.15); }
  if (grade === 'good') { interval = old.reps === 0 ? 1 : old.reps === 1 ? 3 : Math.max(1, Math.ceil(interval * ease)); box = Math.min(5, Math.max(1, box + 1)); }
  if (grade === 'easy') { interval = old.reps === 0 ? 3 : old.reps === 1 ? 7 : Math.max(2, Math.ceil(interval * ease * 1.3)); ease = Math.min(3.2, ease + 0.15); box = Math.min(5, Math.max(1, box + 1)); }
  const gradeNum = {again:0,hard:1,good:2,easy:3}[grade];
  const score = {again:0,hard:40,good:75,easy:95}[grade];
  const skills = {recognition:0,recall:0,production:0,...(word.skills || {})};
  word.skills = {...skills, recall:Math.round((skills.recall || 0) * 0.65 + score * 0.35)};
  word.srs = {...old,box,ease,interval,due:timestamp + interval * 86400000,reps:(old.reps || 0) + 1,lapses,last:timestamp,introduced:old.introduced || timestamp};
  word.updatedAt = timestamp;
  return {id:null,ts:timestamp,type:'review',wordId:word.id,skill:'recall',grade:gradeNum,correct:grade !== 'again',mode:'active-recall',scheduled:true};
}

// Merge local and cloud snapshots without discarding a newer word state.
// Event IDs are immutable; if duplicated, keep the event with the latest timestamp.
export function mergeStates(local = {}, remote = {}) {
  const wordMap = new Map();
  for (const word of [...(local.words || []), ...(remote.words || [])]) {
    if (!word?.id) continue;
    const current = wordMap.get(word.id);
    if (!current) { wordMap.set(word.id, word); continue; }
    const currentTime = Math.max(Number(current.updatedAt) || 0, Number(current.srs?.last) || 0);
    const candidateTime = Math.max(Number(word.updatedAt) || 0, Number(word.srs?.last) || 0);
    const currentReps = Number(current.srs?.reps) || 0;
    const candidateReps = Number(word.srs?.reps) || 0;
    if (candidateTime > currentTime || (candidateTime === currentTime && candidateReps > currentReps)) {
      wordMap.set(word.id, word);
    }
  }
  const eventMap = new Map();
  for (const event of [...(local.events || []), ...(remote.events || [])]) {
    if (!event?.id) continue;
    const current = eventMap.get(event.id);
    if (!current || (Number(event.ts) || 0) > (Number(current.ts) || 0)) eventMap.set(event.id, event);
  }
  return {
    ...remote,
    ...local,
    words: [...wordMap.values()],
    events: [...eventMap.values()],
    settings: { ...(remote.settings || {}), ...(local.settings || {}) },
    updatedAt: Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0)
  };
}

export function mergeBackupState(current = {}, incoming = {}) {
  if (!Array.isArray(incoming.words) || !Array.isArray(incoming.events)) {
    throw new Error('Backup must contain words and events arrays.');
  }
  const words = [...(current.words || [])];
  const wordIndex = new Map(words.map((word, index) => [word.id, index]).filter(([id]) => Boolean(id)));
  let added = 0;
  let updated = 0;
  for (const word of incoming.words) {
    if (!word?.id) continue;
    const index = wordIndex.get(word.id);
    if (index === undefined) {
      wordIndex.set(word.id, words.length);
      words.push(word);
      added += 1;
      continue;
    }
    const existing = words[index];
    const existingStamp = Math.max(Number(existing.updatedAt) || 0, Number(existing.srs?.last) || 0);
    const incomingStamp = Math.max(Number(word.updatedAt) || 0, Number(word.srs?.last) || 0);
    const existingReps = Number(existing.srs?.reps) || 0;
    const incomingReps = Number(word.srs?.reps) || 0;
    if (incomingStamp > existingStamp || (incomingStamp === existingStamp && incomingReps > existingReps)) {
      words[index] = word;
      updated += 1;
    }
  }
  const events = [...(current.events || [])];
  const eventIds = new Set(events.map(event => event.id).filter(Boolean));
  let eventsAdded = 0;
  for (const event of incoming.events) {
    if (!event?.id || eventIds.has(event.id)) continue;
    events.push(event);
    eventIds.add(event.id);
    eventsAdded += 1;
  }
  return {
    state: { ...current, words, events, settings: { ...(incoming.settings || {}), ...(current.settings || {}) } },
    added,
    updated,
    eventsAdded
  };
}
