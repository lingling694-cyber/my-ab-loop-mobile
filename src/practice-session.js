export class PracticeSession {
  constructor(state) { this.state = state; }
  configure(mode, target) {
    if (!['finite', 'infinite'].includes(mode) || (mode === 'finite' && (!Number.isSafeInteger(target) || target < 1)))
      throw new Error('有限模式需要正整数完成次数。');
    this.state.patch({ mode, target: mode === 'finite' ? target : null, completed: 0 });
  }
  completePass() {
    const s = this.state.get(), completed = s.completed + 1;
    this.state.patch({ completed });
    return s.mode === 'finite' && completed >= s.target;
  }
}
