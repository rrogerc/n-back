/**
 * InputManager provides unified input handling for touch, click, keyboard, and gamepad
 */
export class InputManager extends EventTarget {
  constructor() {
    super();
    this.lastInputTime = 0;
    this.debounceMs = 200; // Prevent double-triggers
    this.gamepadPollingId = null;
    this.enabled = true;
  }

  /**
   * Initialize input listeners
   */
  init() {
    // Touch input (for mobile)
    document.addEventListener('touchstart', (e) => this.handleInput(e), { passive: false });

    // Mouse click
    document.addEventListener('click', (e) => this.handleInput(e));

    // Keyboard input (Space, Enter, PageDown, ArrowRight)
    document.addEventListener('keydown', (e) => {
      if (['Space', 'Enter', 'PageDown', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
        this.handleInput(e);
      }
    });

    // Start gamepad polling
    this.startGamepadPolling();
  }

  /**
   * Handle an input event with debouncing
   * @param {Event} event - The input event
   */
  handleInput(event) {
    if (!this.enabled) return;

    const now = Date.now();
    if (now - this.lastInputTime < this.debounceMs) {
      return; // Debounce
    }
    this.lastInputTime = now;

    // Prevent default on touch to avoid scrolling
    if (event.type === 'touchstart') {
      event.preventDefault();
    }

    // Dispatch unified 'press' event
    this.dispatchEvent(new CustomEvent('press', {
      detail: {
        type: event.type,
        timestamp: now
      }
    }));
  }

  /**
   * Start polling for gamepad button presses
   * Useful for ring clickers that appear as gamepad devices
   */
  startGamepadPolling() {
    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          for (const button of gamepad.buttons) {
            if (button.pressed) {
              this.handleInput({ type: 'gamepad' });
              break;
            }
          }
        }
      }
      this.gamepadPollingId = requestAnimationFrame(pollGamepads);
    };

    // Start polling when gamepad is connected
    window.addEventListener('gamepadconnected', () => {
      if (!this.gamepadPollingId) {
        pollGamepads();
      }
    });

    window.addEventListener('gamepaddisconnected', () => {
      if (this.gamepadPollingId) {
        cancelAnimationFrame(this.gamepadPollingId);
        this.gamepadPollingId = null;
      }
    });
  }

  /**
   * Subscribe to 'press' events
   * @param {string} eventName - Event name (typically 'press')
   * @param {Function} handler - Event handler
   */
  on(eventName, handler) {
    this.addEventListener(eventName, handler);
  }

  /**
   * Unsubscribe from events
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   */
  off(eventName, handler) {
    this.removeEventListener(eventName, handler);
  }

  /**
   * Enable input handling
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable input handling
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.gamepadPollingId) {
      cancelAnimationFrame(this.gamepadPollingId);
    }
  }
}

// Export singleton instance
export const inputManager = new InputManager();
