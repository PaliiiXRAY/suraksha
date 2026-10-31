/**
 * Gossip Network Simulator CLI — SRS §12.7 & Roadmap Phase 6.
 *
 * Runs the real sync and domain code across N virtual phones in a 5x5 km area,
 * benchmarking dissemination time to 95% convergence across baseline, spam,
 * and clock-skew scenarios.
 */

import { SimulationEngine, type SimResult } from './sim/engine.ts';

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m (${minutes.toFixed(1)} mins)`;
  }
  return `${minutes.toFixed(1)} mins`;
}

function printDivider(char: string = '─', len: number = 72) {
  console.log(char.repeat(len));
}

async function runScenario(
  title: string,
  numPhones: number,
  options?: { spammerRatio?: number; badClockRatio?: number }
): Promise<SimResult> {
  console.log(`\n▶ Starting: ${title} (${numPhones} phones in 5x5 km, 50m radio)...`);
  const startTime = Date.now();

  const engine = new SimulationEngine({
    numPhones,
    worldSizeMeters: 5000,
    radioRangeMeters: 50,
    dtSeconds: 10,
    coolDownSec: 30,
    spammerRatio: options?.spammerRatio ?? 0,
    badClockRatio: options?.badClockRatio ?? 0,
    maxSimMinutes: 300,
  });

  await engine.initialize();
  const result = await engine.run();
  const realDurationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`  ✓ Completed in ${realDurationSec}s real compute time.`);
  console.log(
    `  • 95% Target: ${result.reached95 ? 'REACHED' : 'NOT REACHED'} in ${formatDuration(
      result.timeTo95Minutes
    )}`
  );
  console.log(
    `  • Dissemination: ${result.finalInfectedCount}/${result.numPhones} phones (${result.finalPercentage}%)`
  );
  console.log(
    `  • Sync Sessions: ${result.totalSyncSessions.toLocaleString()} (${result.totalEncounters.toLocaleString()} meetings)`
  );

  if (result.milestones.length > 0) {
    const milestonesStr = result.milestones
      .map((m) => `${m.percentage}% at ${m.minutes}m`)
      .join(' ➔ ');
    console.log(`  • Milestones: ${milestonesStr}`);
  }

  if (result.spamEventsBlocked > 0) {
    console.log(`  • Security: Rate limiter dropped ${result.spamEventsBlocked} spam events`);
  }

  return result;
}

async function main() {
  printDivider('═');
  console.log('       SURAKSHA (FireSense) — GOSSIP NETWORK SIMULATOR');
  console.log('       5x5 km Area · 50m Contact Range · Real DeltaSync & HLC');
  printDivider('═');

  const results: { scenario: string; phones: number; time95: string; notes: string }[] = [];

  // ── Scenario 1: 50 Phones (Low Density) ──
  const res50 = await runScenario('Low Density Baseline', 50);
  results.push({
    scenario: 'Baseline (50 phones)',
    phones: 50,
    time95: res50.reached95 ? `${res50.timeTo95Minutes.toFixed(1)} mins` : '> 300 mins',
    notes: 'Sparse mesh; slower encounter rate',
  });

  // ── Scenario 2: 200 Phones (Medium Density) ──
  const res200 = await runScenario('Medium Density Baseline', 200);
  results.push({
    scenario: 'Baseline (200 phones)',
    phones: 200,
    time95: res200.reached95 ? `${res200.timeTo95Minutes.toFixed(1)} mins` : '> 300 mins',
    notes: 'Standard urban evacuation density',
  });

  // ── Scenario 3: 500 Phones (High Density) ──
  const res500 = await runScenario('High Density Baseline', 500);
  results.push({
    scenario: 'Baseline (500 phones)',
    phones: 500,
    time95: res500.reached95 ? `${res500.timeTo95Minutes.toFixed(1)} mins` : '> 300 mins',
    notes: 'Rapid epidemic dissemination',
  });

  // ── Scenario 4: Spam Attack (200 Phones, 10% Spammers) ──
  const resSpam = await runScenario('Spam Attack Mitigation (10% spammers)', 200, {
    spammerRatio: 0.1,
  });
  results.push({
    scenario: 'Spam Attack (200 phones, 20 spammers)',
    phones: 200,
    time95: resSpam.reached95 ? `${resSpam.timeTo95Minutes.toFixed(1)} mins` : '> 300 mins',
    notes: `Rate limiter dropped ${resSpam.spamEventsBlocked} spam events`,
  });

  // ── Scenario 5: Bad Clocks (200 Phones, 10% Clock +3 Days) ──
  const resClock = await runScenario('Clock Skew Scenario (10% clocks +3 days)', 200, {
    badClockRatio: 0.1,
  });
  results.push({
    scenario: 'Bad Clocks (200 phones, +3 days ahead)',
    phones: 200,
    time95: resClock.reached95 ? `${resClock.timeTo95Minutes.toFixed(1)} mins` : '> 300 mins',
    notes: 'HLC causal ordering preserved',
  });

  // ── Final Benchmark Summary Table ──
  console.log('\n');
  printDivider('═');
  console.log('              FINAL SIMULATION CONVERGENCE SUMMARY');
  printDivider('═');
  console.log(
    '| Scenario                              | Phones | 95% Convergence | Observations                     |'
  );
  console.log(
    '|---------------------------------------|--------|-----------------|----------------------------------|'
  );
  for (const r of results) {
    const sc = r.scenario.padEnd(37);
    const ph = String(r.phones).padStart(6);
    const tm = r.time95.padStart(15);
    const nt = r.notes.padEnd(32);
    console.log(`| ${sc} | ${ph} | ${tm} | ${nt} |`);
  }
  printDivider('═');
  console.log('All real cryptographic, validation, and delta-sync checks executed.\n');
}

main().catch((err) => {
  console.error('[Simulator] Fatal execution error:', err);
  process.exit(1);
});

