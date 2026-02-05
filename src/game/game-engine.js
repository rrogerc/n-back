import { generateSequence } from './sequence-generator.js';
import { Scorer, calculateNextLevel } from './scorer.js';
import { TIMING } from '../utils/constants.js';

/**
 * GameEngine orchestrates audio, input, and scoring for the n-back game
 */
export class GameEngine extends EventTarget {
  /**
   * @param {import('../audio/audio-manager.js').AudioManager} audioManager
   * @param {import('../input/input-manager.js').InputManager} inputManager
   */
  constructor(audioManager, inputManager) {
    super();
    this.audioManager = audioManager;
    this.inputManager = inputManager;
    this.scorer = new Scorer();

    this.state = 'idle'; // 'idle' | 'playing' | 'paused' | 'complete'
    this.currentN = 2;
    this.sequence = null;
    this.currentTrial = 0;
    this.userPressed = false;
    this.trialTimeout = null;
    this.isiTimeout = null;

    this._onPress = this._onPress.bind(this);
  }

  /**
   * Start a block of trials
   * @param {number} n - The n-back level
   * @param {number} trialCount - Number of trials (default 20)
   * @returns {Promise<{results: object, nextLevel: number}>}
   */
  async startBlock(n, trialCount = 20) {
    this.currentN = n;
    this.trialCount = trialCount;
    this.sequence = generateSequence(n, trialCount);
    this.scorer.reset();
    this.currentTrial = 0;
    this.state = 'playing';

    // Listen for user input
    this.inputManager.on('press', this._onPress);
    this.inputManager.enable();

    // Emit block start event
    this.dispatchEvent(new CustomEvent('blockStart', {
      detail: { n, totalTrials: this.sequence.totalTrials }
    }));

    // Run through all trials
    for (this.currentTrial = 0; this.currentTrial < this.sequence.totalTrials; this.currentTrial++) {
      if (this.state === 'idle') break; // Game was stopped

      // Wait if paused
      while (this.state === 'paused') {
        await this.sleep(100);
      }

      if (this.state === 'idle') break;

      await this.runTrial(this.currentTrial);
    }

    // Clean up
    this.inputManager.off('press', this._onPress);

    if (this.state !== 'idle') {
      this.state = 'complete';

      // Get results and calculate next level
      const results = this.scorer.getResults();
      const nextLevel = calculateNextLevel(this.currentN, results.accuracy);

      // Play block complete sound
      this.audioManager.play('block-complete');

      // Play level up sound if level increased
      if (nextLevel > this.currentN) {
        await this.sleep(1000);
        this.audioManager.play('level-up');
      }

      // Emit block complete event
      this.dispatchEvent(new CustomEvent('blockComplete', {
        detail: { results, nextLevel, currentN: this.currentN }
      }));

      return { results, nextLevel };
    }

    return null;
  }

  /**
   * Run a single trial
   * @param {number} trialIndex - Index of the trial
   */
  async runTrial(trialIndex) {
    const letter = this.sequence.letters[trialIndex];
    const isMatch = this.sequence.matchPositions.includes(trialIndex);
    this.userPressed = false;

    // Emit trial start event
    this.dispatchEvent(new CustomEvent('trialStart', {
      detail: {
        trialIndex,
        totalTrials: this.sequence.totalTrials,
        isMatch
      }
    }));

    // Play the letter audio
    this.audioManager.playLetter(letter);

    // Wait for response window
    await this.sleep(TIMING.RESPONSE_WINDOW);

    // Score the trial
    this.scorer.recordTrial(this.userPressed, isMatch);

    // Play feedback sound
    if (isMatch && this.userPressed) {
      this.audioManager.play('hit');
    } else if (isMatch && !this.userPressed) {
      this.audioManager.play('miss');
    } else if (!isMatch && this.userPressed) {
      this.audioManager.play('false-alarm');
    }
    // No sound for correct rejection (silence is golden)

    // Emit trial end event
    this.dispatchEvent(new CustomEvent('trialEnd', {
      detail: {
        trialIndex,
        userPressed: this.userPressed,
        wasMatch: isMatch,
        correct: (isMatch && this.userPressed) || (!isMatch && !this.userPressed)
      }
    }));

    // Wait remaining ISI time
    const remainingTime = TIMING.ISI - TIMING.RESPONSE_WINDOW;
    if (remainingTime > 0) {
      await this.sleep(remainingTime);
    }
  }

  /**
   * Handle user press during a trial
   */
  _onPress() {
    if (this.state === 'playing') {
      this.userPressed = true;
    }
  }

  /**
   * Pause the game
   */
  pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.dispatchEvent(new CustomEvent('paused'));
    }
  }

  /**
   * Resume the game
   */
  resume() {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.dispatchEvent(new CustomEvent('resumed'));
    }
  }

  /**
   * Stop the game
   */
  stop() {
    this.state = 'idle';
    this.inputManager.off('press', this._onPress);
    if (this.trialTimeout) {
      clearTimeout(this.trialTimeout);
      this.trialTimeout = null;
    }
    if (this.isiTimeout) {
      clearTimeout(this.isiTimeout);
      this.isiTimeout = null;
    }
    this.dispatchEvent(new CustomEvent('stopped'));
  }

  /**
   * Get current game state
   * @returns {'idle' | 'playing' | 'paused' | 'complete'}
   */
  getState() {
    return this.state;
  }

  /**
   * Get current progress
   * @returns {{ currentTrial: number, totalTrials: number, n: number }}
   */
  getProgress() {
    return {
      currentTrial: this.currentTrial,
      totalTrials: this.sequence ? this.sequence.totalTrials : 0,
      n: this.currentN
    };
  }

  /**
   * Sleep helper
   * @param {number} ms
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
