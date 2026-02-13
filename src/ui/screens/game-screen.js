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
          <button class="pause-btn" id="pause-btn" aria-label="Pause">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/>
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/>
            </svg>
          </button>
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

    // Subtle pulse on the ring
    const ring = document.querySelector('.progress-ring');
    if (ring) {
      ring.classList.add('pulse');
      setTimeout(() => ring.classList.remove('pulse'), 150);
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
          <div class="pause-icon">
            <div class="bar"></div>
            <div class="bar"></div>
          </div>
          <h2>Paused</h2>
          <button class="resume-btn" id="resume-btn">Resume</button>
          <button class="exit-btn" id="exit-btn">Exit</button>
        </div>
      `;
      content.appendChild(overlay);

      document.getElementById('resume-btn').addEventListener('click', () => {
        this.hidePaused(() => {
          if (onResume) onResume();
        });
      });

      document.getElementById('exit-btn').addEventListener('click', () => {
        this.hidePaused(() => {
          if (this.onExit) this.onExit();
        });
      });
    }
  }

  /**
   * Hide paused overlay with animation
   * @param {function} [callback] - Called after overlay is removed
   */
  hidePaused(callback) {
    const overlay = document.getElementById('paused-overlay');
    if (overlay) {
      overlay.classList.add('exiting');
      const done = () => {
        if (overlay.parentNode) overlay.remove();
        if (callback) callback();
      };
      overlay.addEventListener('animationend', done, { once: true });
      // Fallback in case animationend doesn't fire
      setTimeout(done, 250);
    } else {
      if (callback) callback();
    }
  }

  /**
   * Show visual feedback that a tap was registered
   */
  showTapFeedback() {
    const screen = document.querySelector('.game-screen');
    if (!screen) return;
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    screen.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  /**
   * Reset tap feedback for the next trial
   */
  resetTapFeedback() {
    // Ripples self-remove on animationend; nothing to reset
  }
}
