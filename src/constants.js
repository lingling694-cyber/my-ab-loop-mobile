export const CONFIG = Object.freeze({ version: '0.1.0', minRate: 0.25, maxRate: 2, rateStep: 0.05, initialRate: 1, uiIntervalSeconds: 0.2 });
export const secondsNow = () => performance.now() / 1000;
