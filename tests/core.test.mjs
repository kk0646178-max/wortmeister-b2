import assert from 'node:assert/strict';
import fs from 'node:fs';
import { dueWordsFrom, newWordsFrom, buildDailyQueue, applyReviewGrade, mergeStates, mergeBackupState } from '../core.js';
const seed = JSON.parse(fs.readFileSync(new URL('../initial_backup.json', import.meta.url), 'utf8'));
assert.equal(seed.words.length, 35, 'public curated seed contains 35 bank words');
assert.equal(seed.events.length, 0, 'public seed does not disclose personal learning history');
assert.equal(seed.words.filter(w => w.source === 'personal').length, 0, 'private personal terms are not exposed in the public seed');
const personal = {id:'personal-test',de:'Beispielwort',ar:'كلمة تجريبية',source:'personal',createdAt:Date.now(),srs:{box:1,ease:2.5,interval:0,due:null,reps:0,lapses:0,last:null,introduced:null},skills:{recognition:0,recall:0,production:0}};
assert.equal(newWordsFrom([personal]).length, 1, 'new personal words are eligible for the new queue');
const queue = buildDailyQueue([personal,...seed.words], {newPerDay:5,sessionSize:25}, Date.now());
assert.ok(queue.some(w => w.id === 'personal-test'), 'daily queue includes personal words');
const overdue = {...seed.words[0],srs:{box:2,ease:2.5,interval:1,due:Date.now()-1000,reps:1,lapses:0,last:Date.now()-86400000,introduced:Date.now()-86400000}};
assert.equal(dueWordsFrom([overdue]).length, 1, 'overdue review detected');
const queueWithDue = buildDailyQueue([personal,overdue],{newPerDay:5,sessionSize:25},Date.now());
assert.equal(queueWithDue[0].id,overdue.id,'due reviews are prioritized ahead of new words');
const event = applyReviewGrade(personal, 'good', Date.now());
assert.equal(personal.srs.reps, 1, 'first review increments repetitions');
assert.equal(personal.srs.interval, 1, 'first Good review schedules one day');
assert.ok(personal.srs.due > Date.now(), 'Good answer schedules a future review');
assert.equal(event.correct, true);
applyReviewGrade(personal, 'again', Date.now());
assert.equal(personal.srs.box, 1, 'Again returns card to box one');
assert.ok(personal.srs.lapses >= 1, 'Again increments lapse count');


const backupMerge = mergeBackupState(
  {words:seed.words, events:seed.events, settings:{newPerDay:5}},
  {words:[...seed.words, personal], events:[...seed.events, {id:'personal-review-1',wordId:personal.id,ts:10,type:'review'}], settings:{newPerDay:7}}
);
assert.equal(backupMerge.added, 1, 'backup merge adds a previously missing personal word only');
assert.equal(backupMerge.eventsAdded, 1, 'backup merge adds only a new event');
assert.equal(backupMerge.state.words.length, 36, 'backup merge does not duplicate curated bank words');
assert.equal(backupMerge.state.events.length, 1, 'backup merge imports new history without duplicate events');
assert.equal(backupMerge.state.settings.newPerDay, 5, 'backup merge preserves current local preferences');

const seededWord = {...seed.words[0], updatedAt:0, srs:{box:1,ease:2.5,interval:0,due:null,reps:0,lapses:0,last:null,introduced:null}, skills:{recognition:0,recall:0,production:0}};
const privateProgressWord = {...seededWord, updatedAt:500, srs:{box:2,ease:2.5,interval:3,due:900000,reps:2,lapses:0,last:500,introduced:100}, skills:{recognition:80,recall:70,production:20}};
const progressMerge = mergeBackupState({words:[seededWord],events:[],settings:{}},{words:[privateProgressWord],events:[{id:'private-history-1',wordId:seededWord.id,ts:500,type:'review'}],settings:{}});
assert.equal(progressMerge.updated,1,'private backup restores progress for matching seeded word IDs');
assert.equal(progressMerge.state.words[0].srs.reps,2,'restored word keeps its review repetitions');
assert.equal(progressMerge.eventsAdded,1,'private review history is restored on import');

const localSnapshot = {
  words: [{id:'sync-word',de:'Wort',updatedAt:100,srs:{reps:2,last:100}}],
  events: [{id:'event-1',ts:100,grade:1}],
  settings: {newPerDay:5},
  updatedAt:100
};
const cloudSnapshot = {
  words: [{id:'sync-word',de:'Wort',updatedAt:200,srs:{reps:2,last:200}}, {id:'cloud-only',de:'Cloud',updatedAt:200,srs:{reps:1,last:200}}],
  events: [{id:'event-1',ts:100,grade:1}, {id:'event-2',ts:200,grade:2}],
  settings: {newPerDay:7},
  updatedAt:200
};
const merged = mergeStates(localSnapshot, cloudSnapshot);
assert.equal(merged.words.find(w=>w.id==='sync-word').updatedAt, 200, 'newer cloud word state wins when repetitions tie');
assert.ok(merged.words.some(w=>w.id==='cloud-only'), 'cloud-only words are retained');
assert.equal(merged.events.length, 2, 'event history merges without duplicate IDs');
assert.equal(merged.settings.newPerDay, 5, 'local settings remain active');

console.log('PASS: privacy-safe 35-word public seed, private backup merge restores matching word progress and events, personal-word review queue, due priority, and SRS grades.');
