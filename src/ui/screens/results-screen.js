/**
 * Results screen - shows accuracy, hits, misses, false alarms
 */
export class ResultsScreen {
  /**
   * @param {object} options
   * @param {object} options.results - Results from scorer
   * @param {number} options.currentN - Current N level
   * @param {number} options.nextLevel - Next N level
   * @param {boolean} options.feedbackOff - Hide detailed stats
   * @param {function} options.onContinue - Callback when continue is pressed
   * @param {function} options.onEnd - Callback when end is pressed
   */
  constructor({ results, currentN, nextLevel, feedbackOff = false, onContinue, onEnd }) {
    this.results = results;
    this.currentN = currentN;
    this.nextLevel = nextLevel;
    this.feedbackOff = feedbackOff;
    this.onContinue = onContinue;
    this.onEnd = onEnd;
  }

  render() {
    const levelChange = this.nextLevel - this.currentN;
    let levelMessage = '';

    if (levelChange > 0) {
      levelMessage = `<span class="level-up">Level Up! Now ${this.nextLevel}-back</span>`;
    } else if (levelChange < 0) {
      levelMessage = `<span class="level-down">Level Down. Now ${this.nextLevel}-back</span>`;
    } else {
      levelMessage = `<span class="level-same">Staying at ${this.nextLevel}-back</span>`;
    }

    if (this.feedbackOff) {
      const totalTrials = this.results.hits + this.results.misses
        + this.results.falseAlarms + this.results.correctRejections;

      return `
        <div class="screen results-screen">
          <h2>Block Complete</h2>

          <div class="completion-summary">
            <span class="completion-count">${totalTrials}</span>
            <span class="completion-label">Trials Completed</span>
          </div>

          <div class="level-change">
            ${levelMessage}
          </div>

          <div class="results-actions">
            <button class="continue-btn" id="continue-btn">Continue Training</button>
            <button class="end-btn" id="end-btn">End Session</button>
          </div>
        </div>
      `;
    }

    const accuracy = Math.round(this.results.accuracy * 100);
    const accuracyColor = accuracy >= 85 ? 'var(--success)' : accuracy >= 70 ? 'var(--accent)' : 'var(--error)';

    return `
      <div class="screen results-screen">
        <h2>Block Complete</h2>

        <div class="accuracy-display">
          <span class="accuracy-value" style="color: ${accuracyColor}">${accuracy}%</span>
          <span class="accuracy-label">Accuracy</span>
        </div>

        <div class="level-change">
          ${levelMessage}
        </div>

        <div class="stats-grid">
          <div class="stat">
            <span class="stat-value hit">${this.results.hits}</span>
            <span class="stat-label">Hits</span>
          </div>
          <div class="stat">
            <span class="stat-value miss">${this.results.misses}</span>
            <span class="stat-label">Misses</span>
          </div>
          <div class="stat">
            <span class="stat-value false-alarm">${this.results.falseAlarms}</span>
            <span class="stat-label">False Alarms</span>
          </div>
          <div class="stat">
            <span class="stat-value correct-rejection">${this.results.correctRejections}</span>
            <span class="stat-label">Correct Rejections</span>
          </div>
        </div>

        <div class="results-actions">
          <button class="continue-btn" id="continue-btn">Continue Training</button>
          <button class="end-btn" id="end-btn">End Session</button>
        </div>
      </div>
    `;
  }

  init() {
    const continueBtn = document.getElementById('continue-btn');
    const endBtn = document.getElementById('end-btn');

    continueBtn.addEventListener('click', () => {
      if (this.onContinue) {
        this.onContinue(this.nextLevel);
      }
    });

    endBtn.addEventListener('click', () => {
      if (this.onEnd) {
        this.onEnd();
      }
    });
  }
}
