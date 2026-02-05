/**
 * Game screen - minimal visual with progress indicator
 * The entire screen acts as a tap zone
 */
export class GameScreen {
  /**
   * @param {object} options
   * @param {number} options.n - Current N level
   * @param {number} options.totalTrials - Total trials in block
   * @param {function} options.onPause - Callback when pause is pressed
   * @param {function} options.onExit - Callback when exit is pressed from pause menu
   */
  constructor({ n, totalTrials, onPause, onExit }) {
    this.n = n;
    this.totalTrials = totalTrials;
    this.currentTrial = 0;
    this.onPause = onPause;
    this.onExit = onExit;
  }

  render() {
    return `
      <div class="screen game-screen">
        <div class="game-header">
          <span class="level-indicator">${this.n}-back</span>
          <button class="pause-btn" id="pause-btn">II</button>
        </div>

        <div class="game-content">
          <div class="tap-zone">
            <div class="progress-ring">
              <svg viewBox="0 0 100 100">
                <circle class="progress-bg" cx="50" cy="50" r="45" />
                <circle class="progress-fill" id="progress-circle" cx="50" cy="50" r="45" />
              </svg>
              <span class="trial-counter" id="trial-counter">0/${this.totalTrials}</span>
            </div>
          </div>
        </div>

        <div class="game-footer">
          <p class="game-hint">Tap anywhere for match</p>
        </div>
      </div>
    `;
  }

  init() {
    const pauseBtn = document.getElementById('pause-btn');
    pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onPause) {
        this.onPause();
      }
    });
  }

  /**
   * Update the trial progress display
   * @param {number} current - Current trial number
   * @param {number} total - Total trials
   */
  updateProgress(current, total) {
    this.currentTrial = current;
    const counter = document.getElementById('trial-counter');
    const circle = document.getElementById('progress-circle');

    if (counter) {
      counter.textContent = `${current + 1}/${total}`;
    }

    if (circle) {
      const progress = (current + 1) / total;
      const circumference = 2 * Math.PI * 45;
      const offset = circumference * (1 - progress);
      circle.style.strokeDasharray = circumference;
      circle.style.strokeDashoffset = offset;
    }
  }

  /**
   * Show paused overlay with resume and exit options
   * @param {function} onResume - Callback when resume is pressed
   */
  showPaused(onResume) {
    const content = document.querySelector('.game-content');
    if (content) {
      const overlay = document.createElement('div');
      overlay.className = 'paused-overlay';
      overlay.id = 'paused-overlay';
      overlay.innerHTML = `
        <div class="paused-message">
          <h2>Paused</h2>
          <button class="resume-btn" id="resume-btn">Resume</button>
          <button class="exit-btn" id="exit-btn">Exit</button>
        </div>
      `;
      content.appendChild(overlay);

      // Set up event handlers
      document.getElementById('resume-btn').addEventListener('click', () => {
        this.hidePaused();
        if (onResume) onResume();
      });

      document.getElementById('exit-btn').addEventListener('click', () => {
        this.hidePaused();
        if (this.onExit) this.onExit();
      });
    }
  }

  /**
   * Hide paused overlay
   */
  hidePaused() {
    const overlay = document.getElementById('paused-overlay');
    if (overlay) {
      overlay.remove();
    }
  }
}
