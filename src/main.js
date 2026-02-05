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

    // Show start screen
    await this.showStartScreen();

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.log('Service worker registration failed:', error);
      }
    }
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

    this.renderer.render(startScreen);
  }

  /**
   * Start the game
   * @param {number} n - N-back level
   * @param {number} trialCount - Number of trials
   */
  async startGame(n, trialCount = 20) {
    // Unlock audio on first user interaction
    if (!this.audioUnlocked) {
      await this.audioManager.init();
      await this.audioManager.unlock();
      this.audioManager.setupMediaSession();
      this.audioUnlocked = true;
    }

    // Create game engine
    this.gameEngine = new GameEngine(this.audioManager, this.inputManager);

    // Show game screen
    this.gameScreen = new GameScreen({
      n: n,
      totalTrials: trialCount,
      onPause: () => this.pauseGame(),
      onExit: () => this.exitGame()
    });

    this.renderer.render(this.gameScreen);

    // Listen for game events
    this.gameEngine.addEventListener('trialStart', (e) => {
      this.gameScreen.updateProgress(e.detail.trialIndex, e.detail.totalTrials);
    });

    // Start the block
    const result = await this.gameEngine.startBlock(n, trialCount);

    if (result) {
      // Save session
      await this.storage.saveSession({
        n: n,
        trialCount: trialCount,
        ...result.results,
        nextLevel: result.nextLevel
      });

      // Show results screen
      this.showResultsScreen(result.results, n, result.nextLevel, trialCount);
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
    this.showStartScreen();
  }

  /**
   * Show results screen
   * @param {object} results - Game results
   * @param {number} currentN - Current N level
   * @param {number} nextLevel - Next N level
   * @param {number} trialCount - Number of trials used
   */
  showResultsScreen(results, currentN, nextLevel, trialCount) {
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

    this.renderer.render(resultsScreen);
  }
}

// Start the app
const app = new App();
app.init().catch(console.error);
