import { ADAPTIVE, TIMING } from '../../utils/constants.js';

/**
 * Start screen with N-level selector, trial count input, and start button
 */
export class StartScreen {
  /**
   * @param {object} options
   * @param {number} options.currentN - Current N level
   * @param {number} options.trialCount - Number of trials (default 20)
   * @param {function} options.onStart - Callback when start is pressed (n, trialCount)
   */
  constructor({ currentN, trialCount = 20, onStart }) {
    this.currentN = currentN;
    this.onStart = onStart;
    this.selectedN = currentN;
    this.selectedTrialCount = trialCount;
  }

  /**
   * Calculate duration in seconds
   */
  getDurationText(trialCount) {
    const totalSeconds = Math.round(trialCount * TIMING.ISI / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  render() {
    const duration = this.getDurationText(this.selectedTrialCount);

    return `
      <div class="screen start-screen">
        <h1>N-Back</h1>
        <p class="subtitle">Audio Working Memory Training</p>

        <div class="level-selector">
          <label>Level:</label>
          <div class="level-controls">
            <button class="level-btn" id="decrease-n">-</button>
            <span class="level-value" id="n-value">${this.selectedN}</span>
            <button class="level-btn" id="increase-n">+</button>
          </div>
        </div>

        <div class="trial-input-group">
          <label for="trial-count">Trials:</label>
          <input type="number" id="trial-count" min="5" max="1000" value="${this.selectedTrialCount}" />
        </div>

        <p class="duration-estimate" id="duration-estimate">Duration: ~${duration}</p>

        <button class="start-btn" id="start-btn">
          Start Training
        </button>

        <div class="instructions">
          <p id="instructions-text">Press when current letter matches ${this.selectedN} back</p>
          <p class="hint">Tap anywhere or use Space/Enter</p>
        </div>
      </div>
    `;
  }

  init() {
    const decreaseBtn = document.getElementById('decrease-n');
    const increaseBtn = document.getElementById('increase-n');
    const nValue = document.getElementById('n-value');
    const trialInput = document.getElementById('trial-count');
    const durationEstimate = document.getElementById('duration-estimate');
    const startBtn = document.getElementById('start-btn');
    const instructions = document.getElementById('instructions-text');

    // N level controls
    decreaseBtn.addEventListener('click', () => {
      if (this.selectedN > ADAPTIVE.MIN_N) {
        this.selectedN--;
        nValue.textContent = this.selectedN;
        instructions.textContent = `Press when current letter matches ${this.selectedN} back`;
      }
    });

    increaseBtn.addEventListener('click', () => {
      if (this.selectedN < ADAPTIVE.MAX_N) {
        this.selectedN++;
        nValue.textContent = this.selectedN;
        instructions.textContent = `Press when current letter matches ${this.selectedN} back`;
      }
    });

    // Trial count input
    trialInput.addEventListener('input', () => {
      let value = parseInt(trialInput.value, 10);
      if (!isNaN(value)) {
        value = Math.max(5, Math.min(1000, value));
        this.selectedTrialCount = value;
        durationEstimate.textContent = `Duration: ~${this.getDurationText(value)}`;
      }
    });

    // Start button
    const doStart = () => {
      // Ensure valid trial count
      let trialCount = parseInt(trialInput.value, 10);
      if (isNaN(trialCount) || trialCount < 5) trialCount = 20;
      trialCount = Math.min(1000, trialCount);

      if (this.onStart) {
        this.onStart(this.selectedN, trialCount);
      }
    };

    startBtn.addEventListener('click', doStart);

    // Space/Enter to start (unless typing in an input)
    this._keyHandler = (e) => {
      if (e.code === 'Space' && document.activeElement !== trialInput) {
        e.preventDefault();
        doStart();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  cleanup() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }
}
