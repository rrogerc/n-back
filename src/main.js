import './styles.css';
import { AudioManager } from './audio/audio-manager.js';
import { InputManager } from './input/input-manager.js';
import { GameEngine } from './game/game-engine.js';
import { Storage } from './storage/storage.js';
import { Renderer } from './ui/renderer.js';
import { StartScreen } from './ui/screens/start-screen.js';
import { GameScreen } from './ui/screens/game-screen.js';
import { ResultsScreen } from './ui/screens/results-screen.js';

/**
 * Main application class
 */
class App {
  constructor() {
    this.audioManager = new AudioManager();
    this.inputManager = new InputManager();
    this.storage = new Storage();
    this.gameEngine = null;
    this.renderer = null;
    this.gameScreen = null;
    this.audioUnlocked = false;
    this.currentTrialCount = 20;
    this.wakeLock = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    // Initialize storage
    await this.storage.init();

    // Initialize renderer
    const container = document.getElementById('app');
    this.renderer = new Renderer(container);

    // Initialize input manager
    this.inputManager.init();

    // Set up audio context and elements (sync, no preloading yet).
    // Preloading happens after unlock() in startGame() so the
    // AudioContext is running — iOS silently fails decodeAudioData
    // on a suspended context.
    this.audioManager.init();

    // Show start screen
    await this.showStartScreen();

  }

  /**
   * Show the start screen
   */
  async showStartScreen() {
    const lastN = await this.storage.getLastLevel();

    const startScreen = new StartScreen({
      currentN: lastN,
      trialCount: this.currentTrialCount,
      onStart: async (n, trialCount) => {
        this.currentTrialCount = trialCount;
        await this.startGame(n, trialCount);
      }
    });

    await this.renderer.render(startScreen);
  }

  /**
   * Start the game
   * @param {number} n - N-back level
   * @param {number} trialCount - Number of trials
   */
  async startGame(n, trialCount = 20) {
    // Unlock audio on first user interaction (must happen in gesture context).
    // AudioContext + silentAudio were created synchronously when init() started,
    // so unlock() can use them immediately without waiting for preload.
    if (!this.audioUnlocked) {
      await this.audioManager.unlock();
      this.audioManager.setupMediaSession();
      this.audioUnlocked = true;
    }

    // Keep screen awake during gameplay
    await this.acquireWakeLock();

    // Create game engine
    this.gameEngine = new GameEngine(this.audioManager, this.inputManager);

    // Show game screen IMMEDIATELY — don't block on audio preload
    this.gameScreen = new GameScreen({
      n: n,
      totalTrials: trialCount,
      onPause: () => this.pauseGame(),
      onExit: () => this.exitGame()
    });

    await this.renderer.render(this.gameScreen);

    // Listen for game events
    this.gameEngine.addEventListener('trialStart', (e) => {
      this.gameScreen.updateProgress(e.detail.trialIndex, e.detail.totalTrials);
      this.gameScreen.resetTapFeedback();
    });

    // Show tap feedback when user presses during gameplay
    this._tapFeedbackHandler = () => {
      if (this.gameEngine && this.gameEngine.getState() === 'playing') {
        this.gameScreen.showTapFeedback();
      }
    };
    this.inputManager.on('press', this._tapFeedbackHandler);

    // Preload audio buffers (no-op if already loaded).
    // Must happen after unlock() so the AudioContext is running.
    await this.audioManager.preload();

    // Start the block
    const result = await this.gameEngine.startBlock(n, trialCount);

    // Clean up tap feedback listener and wake lock
    this.inputManager.off('press', this._tapFeedbackHandler);
    this.releaseWakeLock();

    if (result) {
      // Save session
      await this.storage.saveSession({
        n: n,
        trialCount: trialCount,
        ...result.results,
        nextLevel: result.nextLevel
      });

      // Show results screen
      await this.showResultsScreen(result.results, n, result.nextLevel, trialCount);
    }
  }

  /**
   * Pause the game
   */
  pauseGame() {
    if (this.gameEngine) {
      this.gameEngine.pause();
      this.gameScreen.showPaused(() => {
        this.gameEngine.resume();
      });
    }
  }

  /**
   * Exit the game (from pause menu)
   */
  exitGame() {
    if (this.gameEngine) {
      this.gameEngine.stop();
    }
    this.releaseWakeLock();
    this.showStartScreen();
  }

  /**
   * Show results screen
   * @param {object} results - Game results
   * @param {number} currentN - Current N level
   * @param {number} nextLevel - Next N level
   * @param {number} trialCount - Number of trials used
   */
  async showResultsScreen(results, currentN, nextLevel, trialCount) {
    const resultsScreen = new ResultsScreen({
      results: results,
      currentN: currentN,
      nextLevel: nextLevel,
      onContinue: async (n) => {
        await this.startGame(n, trialCount);
      },
      onEnd: async () => {
        await this.showStartScreen();
      }
    });

    await this.renderer.render(resultsScreen);
  }

  /**
   * Acquire a screen wake lock to prevent the display from sleeping
   */
  async acquireWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch (err) {
      console.warn('Wake lock failed:', err);
    }
  }

  /**
   * Release the screen wake lock
   */
  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
  }
}

// Start the app
const app = new App();
app.init().catch(console.error);
