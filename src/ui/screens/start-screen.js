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
   * @param {import('../../storage/storage.js').Storage} options.storage - Storage instance
   */
  constructor({ currentN, trialCount = 20, onStart, storage }) {
    this.currentN = currentN;
    this.onStart = onStart;
    this.selectedN = currentN;
    this.selectedTrialCount = trialCount;
    this.storage = storage;
    this._settingsOpen = false;
    this._hideTimeout = null;
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
        <button class="settings-btn" id="settings-btn" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>

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
    const settingsBtn = document.getElementById('settings-btn');

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

    // Space/Enter to start (unless typing in an input or settings open)
    this._keyHandler = (e) => {
      if (this._settingsOpen) return;
      if (e.code === 'Space' && document.activeElement !== trialInput) {
        e.preventDefault();
        doStart();
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // Settings button
    settingsBtn.addEventListener('click', () => {
      this.showSettings();
    });
  }

  // ── Settings overlay ──────────────────────────

  async showSettings() {
    this._cleanupSettingsOverlay();
    this._settingsOpen = true;

    const settings = await this.storage.getSettings();

    const screen = document.querySelector('.start-screen');
    if (!screen) return;

    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';
    overlay.innerHTML = `
      <div class="settings-panel">
        <div class="settings-header">
          <h2>Settings</h2>
          <button class="settings-close-btn" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <div class="settings-list">
          <div class="settings-item">
            <div class="settings-item-info">
              <span class="settings-item-label">Feedback Sounds</span>
              <span class="settings-item-description">Play sounds on misses and false alarms</span>
            </div>
            <button class="toggle-switch ${settings.feedbackSoundsEnabled ? 'active' : ''}" data-key="feedbackSoundsEnabled" role="switch" aria-checked="${settings.feedbackSoundsEnabled}">
              <span class="toggle-knob"></span>
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <span class="settings-item-label">Vibration</span>
              <span class="settings-item-description">Haptic feedback on responses</span>
            </div>
            <button class="toggle-switch ${settings.vibrationEnabled ? 'active' : ''}" data-key="vibrationEnabled" role="switch" aria-checked="${settings.vibrationEnabled}">
              <span class="toggle-knob"></span>
            </button>
          </div>

          <div class="settings-item">
            <div class="settings-item-info">
              <span class="settings-item-label">Adaptive Difficulty</span>
              <span class="settings-item-description">Auto-adjust level based on performance</span>
            </div>
            <button class="toggle-switch ${settings.adaptiveDifficulty ? 'active' : ''}" data-key="adaptiveDifficulty" role="switch" aria-checked="${settings.adaptiveDifficulty}">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>

        <div class="settings-version">v1.0</div>
      </div>
    `;

    // Prevent events from reaching InputManager
    overlay.addEventListener('touchstart', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());

    screen.appendChild(overlay);

    // Close button
    overlay.querySelector('.settings-close-btn').addEventListener('click', () => {
      this.hideSettings();
    });

    // Toggle switches — persist immediately
    overlay.querySelectorAll('.toggle-switch').forEach(toggle => {
      toggle.addEventListener('click', async () => {
        const key = toggle.dataset.key;
        const isActive = toggle.classList.toggle('active');
        toggle.setAttribute('aria-checked', isActive);

        const current = await this.storage.getSettings();
        current[key] = isActive;
        await this.storage.saveSettings(current);
      });
    });
  }

  hideSettings(callback) {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.classList.add('exiting');
      let called = false;
      const done = () => {
        if (called) return;
        called = true;
        this._hideTimeout = null;
        this._settingsOpen = false;
        if (overlay.parentNode) overlay.remove();
        if (callback) callback();
      };
      overlay.addEventListener('animationend', done, { once: true });
      this._hideTimeout = setTimeout(done, 250);
    } else {
      this._settingsOpen = false;
      if (callback) callback();
    }
  }

  _cleanupSettingsOverlay() {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
    const existing = document.getElementById('settings-overlay');
    if (existing) existing.remove();
  }

  cleanup() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
    this._cleanupSettingsOverlay();
  }
}
