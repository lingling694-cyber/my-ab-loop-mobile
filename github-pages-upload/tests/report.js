function stats(values) {
  if (!values.length) return { samples: 0, mean: null, min: null, max: null, maxAbsolute: null };
  return { samples: values.length, mean: values.reduce((a,b)=>a+b,0)/values.length,
    min: Math.min(...values), max: Math.max(...values), maxAbsolute: Math.max(...values.map(Math.abs)) };
}
export function summarize(testCase, records, ledger, reason, environment) {
  const loops = [], anomalies = [];
  let previous = null, pending = null, firstSeek = true, nextFrame = null, resource = null, frameCount = null, frameGaps = 0;
  for (const row of records) {
    if (resource !== row.resource) { resource = row.resource; previous = null; pending = null; firstSeek = true; nextFrame = null; frameCount = null; }
    if (row.event === 'frame') {
      if (frameCount !== null && row.presentedFrames > frameCount + 1) frameGaps += row.presentedFrames-frameCount-1;
      frameCount = row.presentedFrames;
      if (nextFrame && !row.seeking) { nextFrame.firstFrameAError = row.frameTime-testCase.region.start; nextFrame = null; }
    }
    if (row.event === 'seeking') {
      if (pending) anomalies.push({ type: 'overlapping-observed-seeking', at: row.at });
      pending = { before: previous, begin: row, initial: firstSeek }; firstSeek = false;
    }
    if (row.event === 'seeked' && pending) {
      if (!pending.initial) {
        const before = pending.before;
        const loop = { number: loops.length+1, observedAt: row.at,
          boundaryPosition: before?.position ?? null,
          boundarySampleAt: before?.at ?? null,
          boundaryError: before && before.position >= testCase.region.end ? before.position-testCase.region.end : null,
          postSeekAError: row.position-testCase.region.start, firstFrameAError: null,
          observedSeekSeconds: row.at-pending.begin.at,
          backward: before ? row.position < before.position : null };
        loops.push(loop); nextFrame = loop;
      }
      pending = null;
    }
    if (!row.seeking && !['seeking','seeked'].includes(row.event)) previous = row;
    if (row.error) anomalies.push({ type: 'media-error', at: row.at, error: row.error });
  }
  const final = records.at(-1);
  const expectedReturns = testCase.mode === 'finite' ? testCase.repeat-1 : null;
  const unexpectedSeeks = expectedReturns === null ? null : Math.max(0,loops.length-expectedReturns);
  const incompleteReturns = expectedReturns === null ? null : Math.max(0,expectedReturns-loops.length);
  const terminal = final?.paused && final.position >= testCase.region.end;
  const enough = loops.length === expectedReturns && terminal;
  const hidden = records.some(r=>r.visible !== 'visible');
  // Never call an ambiguous browser trace a timing pass.
  const functional = testCase.scenario ? 'INDETERMINATE — scenario trace requires review' :
    reason === 'cancelled' ? 'INDETERMINATE — cancelled' :
    anomalies.length || unexpectedSeeks || reason === 'unexpected-stop' || reason === 'setup-failed' ? 'FAIL' :
    reason === 'natural-stop' && enough && !hidden ? 'DEV OBSERVED PASS — count/terminal behavior only' :
    'INDETERMINATE — insufficient or interrupted evidence';
  return { schema: 1, case: testCase, environment, reason, functional,
    timing: 'MEASURED — NO ACCEPTANCE THRESHOLD', device: 'NOT VERIFIED', pwa: 'NOT VERIFIED',
    observedReturns: loops.length, observedCompletedPasses: terminal ? loops.length+1 : null,
    missingExpectedReturns: incompleteReturns, excessObservedReturns: unexpectedSeeks,
    confirmedDuplicateCommands: null, missedLoops: null,
    note: 'Browser events cannot prove absence of duplicate commands or audible continuity. Missing returns are not automatically missed loops. Boundary samples are pre-seek observations, not exact crossing times.',
    coverage: { hidden, frameGaps, unresolvedSeek: !!pending, unavailableBoundaries: loops.filter(l=>l.boundaryError===null).length },
    measurements: { boundaryError: stats(loops.map(l=>l.boundaryError).filter(x=>x!==null)),
      postSeekAError: stats(loops.map(l=>l.postSeekAError)), firstFrameAError: stats(loops.map(l=>l.firstFrameAError).filter(x=>x!==null)) },
    unexpectedStop: reason === 'unexpected-stop', loops, anomalies, ledger, records };
}
