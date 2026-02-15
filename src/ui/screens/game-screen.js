import { TIMING } from '../../utils/constants.js';

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

    // Timer state
    this._timerStart = 0;
    this._pausedDuration = 0;
    this._trialStart = 0;
    this._trialPausedDuration = 0;
    this._lastElapsed = 0;
    this._lastTrialElapsed = 0;
    this._rafId = null;
    this._timerRunning = false;
    this._hideTimeout = null;
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
            <div class="game-center">
              <span class="game-timer" id="game-timer">00:00.00</span>
              <div class="progress-ring">
                <svg viewBox="0 0 100 100">
                  <circle class="progress-bg" cx="50" cy="50" r="45" />
                  <circle class="trial-arc" id="trial-arc" cx="50" cy="50" r="49" />
                  <circle class="progress-fill" id="progress-circle" cx="50" cy="50" r="45" />
                </svg>
                <div class="spinner-orbit" id="spinner-orbit">
                  <div class="spinner-dot"></div>
                </div>
                <span class="trial-counter" id="trial-counter">0/${this.totalTrials}</span>
              </div>
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

  // ── Timer & trial arc ──────────────────────────

  startTimer() {
    this._timerStart = Date.now();
    this._pausedDuration = 0;
    this._lastElapsed = 0;
    this._lastTrialElapsed = 0;
    this._timerRunning = true;
    this._tick();
  }

  pauseTimer() {
    this._timerRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  resumeTimer() {
    // Restore start times from the last displayed values so the timer
    // picks up exactly where the screen froze — no drift from the gap
    // between the last rAF frame and when pauseTimer() was called.
    const now = Date.now();
    this._timerStart = now - this._lastElapsed;
    this._trialStart = now - this._lastTrialElapsed;
    this._pausedDuration = 0;
    this._trialPausedDuration = 0;
    this._timerRunning = true;
    this._tick();
  }

  stopTimer() {
    this._timerRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  resetTrialArc() {
    this._trialStart = Date.now();
    this._trialPausedDuration = 0;
    this._lastTrialElapsed = 0;
  }

  _tick() {
    if (!this._timerRunning) return;
    const now = Date.now();
    this._lastElapsed = now - this._timerStart - this._pausedDuration;
    this._lastTrialElapsed = now - this._trialStart - this._trialPausedDuration;
    this._updateTimerDisplay();
    this._updateTrialArc();
    this._rafId = requestAnimationFrame(() => this._tick());
  }

  _updateTimerDisplay() {
    const ms = Math.max(0, this._lastElapsed);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);

    const el = document.getElementById('game-timer');
    if (el) {
      el.textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    }
  }

  _updateTrialArc() {
    const progress = Math.min(1, Math.max(0, this._lastTrialElapsed / TIMING.ISI));
    const circumference = 2 * Math.PI * 49;

    const arc = document.getElementById('trial-arc');
    if (arc) {
      arc.style.strokeDashoffset = circumference * (1 - progress);
    }

    const orbit = document.getElementById('spinner-orbit');
    if (orbit) {
      orbit.style.transform = `rotate(${progress * 360}deg)`;
    }
  }

  cleanup() {
    this.stopTimer();
  }

  // ── Pause overlay ──────────────────────────────

  /**
   * Show paused overlay with resume and exit options
   * @param {function} onResume - Callback when resume is pressed
   */
  showPaused(onResume) {
    // Clean up any leftover overlay / pending hide timeout
    this._cleanupOverlay();

    const screen = document.querySelector('.game-screen');
    if (screen) {
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
      // Prevent touch/click events from bubbling to the document-level
      // InputManager handlers. Without this, the non-passive touchstart
      // listener on document interferes with click generation on iOS PWA.
      overlay.addEventListener('touchstart', (e) => e.stopPropagation());
      overlay.addEventListener('click', (e) => e.stopPropagation());

      screen.appendChild(overlay);

      // Attach listeners directly to the elements we just created,
      // avoiding getElementById which can find stale duplicates.
      const resumeBtn = overlay.querySelector('.resume-btn');
      const exitBtn = overlay.querySelector('.exit-btn');

      resumeBtn.addEventListener('click', () => {
        this.hidePaused(() => {
          if (onResume) onResume();
        });
      });

      exitBtn.addEventListener('click', () => {
        this.hidePaused(() => {
          if (this.onExit) this.onExit();
        });
      });
    }
  }

  /**
   * Remove any existing overlay and clear pending hide timeout
   */
  _cleanupOverlay() {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
    const existing = document.getElementById('paused-overlay');
    if (existing) existing.remove();
  }

  /**
   * Hide paused overlay with animation
   * @param {function} [callback] - Called after overlay is removed
   */
  hidePaused(callback) {
    const overlay = document.getElementById('paused-overlay');
    if (overlay) {
      overlay.classList.add('exiting');
      let called = false;
      const done = () => {
        if (called) return;
        called = true;
        this._hideTimeout = null;
        if (overlay.parentNode) overlay.remove();
        if (callback) callback();
      };
      overlay.addEventListener('animationend', done, { once: true });
      this._hideTimeout = setTimeout(done, 250);
    } else {
      if (callback) callback();
    }
  }

  // ── Tap feedback ───────────────────────────────

  /**
   * Show visual feedback that a tap was registered
   */
  showTapFeedback() {
    const screen = document.querySelector('.game-screen');
    if (!screen) return;
    screen.classList.add('pressed');
  }

  /**
   * Reset tap feedback for the next trial
   */
  resetTapFeedback() {
    const screen = document.querySelector('.game-screen');
    if (!screen) return;
    screen.classList.remove('pressed');
  }
}
