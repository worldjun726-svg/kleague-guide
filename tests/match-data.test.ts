import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateMatches, teamProfile, metricTable, outlook, backtest, minuteLabel, matchInsights} from '../src/matchData.ts';
const raw = JSON.parse(readFileSync('public/data/matches-2026.json', 'utf8'));
const current = JSON.parse(readFileSync('public/data/current-season.json', 'utf8'));
const data = validateMatches(raw);

test('every club in the schedule exists in the current season teams', () => {
  const ids = new Set(current.teams.map((t: {id: string}) => t.id));
  for (const m of data.matches) { assert.ok(ids.has(m.home), m.home); assert.ok(ids.has(m.away), m.away); }
});
test('results add up to the official standings for teams whose standings were taken after their last result', () => {
  const asOf = current.sources.team1.asOf;
  for (const r of current.standings.filter((r: {league: number}) => r.league === 1)) {
    const p = teamProfile(data, r.teamId, asOf + '24:00');
    assert.deepEqual([p.all.played, p.all.gf, p.all.ga, p.all.points], [r.played, r.gf, r.ga, r.points], r.teamId);
  }
});
test('goal events agree with scores and own goals count for the other side', () => {
  for (const m of data.matches.filter(m => m.goals)) {
    assert.equal(m.goals!.filter(g => g[0] === 0).length, m.score![0], m.id);
    assert.equal(m.goals!.filter(g => g[0] === 1).length, m.score![1], m.id);
  }
  const bad = structuredClone(raw); const m = bad.matches.find((x: {goals: unknown}) => x.goals); m.score[0]++;
  assert.throws(() => validateMatches(bad));
});
test('stoppage time is shown as 45+ / 90+', () => {
  assert.equal(minuteLabel(1, 30), "30'"); assert.equal(minuteLabel(1, 50), "45+5'");
  assert.equal(minuteLabel(2, 10), "55'"); assert.equal(minuteLabel(2, 48), "90+3'");
});
test('league metric ranks cover every team once', () => {
  const {table, size} = metricTable(data, 1);
  assert.equal(size, 12);
  for (const k of Object.keys(table) as (keyof typeof table)[]) assert.deepEqual(Object.values(table[k].rank).sort((a, b) => a - b), Array.from({length: 12}, (_, i) => i + 1));
});
test('outlook probabilities sum to 100 and the backtest only uses earlier matches', () => {
  const o = outlook(data, 1, 'jeonbuk', 'seoul')!;
  assert.ok(Math.abs(o.probs.reduce((s, p) => s + p, 0) - 100) < 1e-6);
  assert.equal(outlook(data, 1, 'jeonbuk', 'seoul', '2026-03-01'), null);
  const bt = backtest(data, 1);
  assert.ok(bt.n > 100 && bt.hitRate > 0 && bt.hitRate < 100);
});
test('insights are generated only from recorded stats', () => {
  const m = data.matches.find(x => x.stats)!;
  assert.ok(Array.isArray(matchInsights(m, ['H', 'A'], null)));
  assert.deepEqual(matchInsights({...m, stats: null}, ['H', 'A'], null), []);
});
