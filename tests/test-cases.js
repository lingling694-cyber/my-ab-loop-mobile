const base = { region: { start: 10, end: 14 }, repeat: 50, mode: 'finite', tolerancePolicy: { kind: 'measure-only' }, actions: [] };
export const CASES = [
  ...[1,3,50].map(repeat=>({...base,id:'dev-smoke-'+repeat,region:{start:1,end:2},speed:1,repeat})),
  ...[0.25,0.5,0.75,1,1.5,2].map(speed => ({ ...base, id: 'matrix-'+speed, speed })),
  { ...base, id: 'short-region', region: { start: 10, end: 11 }, speed: 1 },
  { ...base, id: 'pause-resume', speed: 1, actions: [{ at: 3, command: 'pause' }, { at: 5, command: 'play' }] },
  { ...base, id: 'speed-change', speed: 1, actions: [{ at: 3, command: 'rate', value: 0.5 }, { at: 8, command: 'rate', value: 2 }] },
  { ...base, id: 'rapid-speed', speed: 1, actions: [0.25,2,0.5,1.5,0.75,1].map((value,i) => ({ at: 2+i*0.1, command: 'rate', value })) },
  { ...base, id: 'edit-region', speed: 1, scenario: true, stopAfter: 8, actions: [{ at: 2, command: 'endpoint', key: 'end', value: 13 }] },
  { ...base, id: 'repeated-a', speed: 1, scenario: true, stopAfter: 8, actions: [2,2.1,2.2].map(at => ({ at, command: 'endpoint', key: 'start', value: 10 })) },
  { ...base, id: 'repeated-b', speed: 1, scenario: true, stopAfter: 8, actions: [2,2.1,2.2].map(at => ({ at, command: 'endpoint', key: 'end', value: 14 })) },
  { ...base, id: 'replacement', speed: 1, scenario: true, stopAfter: 8, actions: [{ at: 2, command: 'replace' }] },
  { ...base, id: 'infinite', speed: 1, mode: 'infinite', scenario: true, stopAfter: 30 }
];
