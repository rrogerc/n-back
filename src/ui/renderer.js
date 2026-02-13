/**
 * Simple renderer for managing screen transitions
 */
export class Renderer {
  constructor(container) {
    this.container = container;
    this.currentScreen = null;
  }

  /**
   * Render a screen with fade transition
   * @param {object} screen - Screen object with render method
   */
  async render(screen) {
    // Cleanup previous screen if it has a cleanup method
    if (this.currentScreen && this.currentScreen.cleanup) {
      this.currentScreen.cleanup();
    }

    // Animate out old content if present
    const oldScreen = this.container.querySelector('.screen');
    if (oldScreen) {
      oldScreen.classList.add('screen-exit');
      await new Promise(resolve => {
        oldScreen.addEventListener('animationend', resolve, { once: true });
        // Fallback timeout
        setTimeout(resolve, 300);
      });
    }

    // Clear container
    this.container.innerHTML = '';

    // Render new screen
    this.currentScreen = screen;
    const content = screen.render();
    if (typeof content === 'string') {
      this.container.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.container.appendChild(content);
    }

    // Call init if screen has it
    if (screen.init) {
      screen.init();
    }
  }

  /**
   * Get the container element
   * @returns {HTMLElement}
   */
  getContainer() {
    return this.container;
  }
}
