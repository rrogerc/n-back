import { LETTERS } from '../utils/constants.js';

/**
 * AudioManager handles audio preloading, playback, iOS unlock, and MediaSession
 */
export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.buffers = new Map();
    this.silentAudio = null;
    this.unlocked = false;
    this.gainNode = null;
  }

  /**
   * Initialize the audio system - create AudioContext and set up elements.
   * Starts preloading audio files in the background.
   * Call this early (on app init), not on user gesture.
   */
  async init() {
    // Create AudioContext (will be in suspended state until user gesture)
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create a gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    // Set up silent audio element BEFORE preloading so unlock() can use it immediately
    this.silentAudio = new Audio('/audio/silent-loop.mp3');
    this.silentAudio.loop = true;
    this.silentAudio.volume = 0.01; // Nearly silent but keeps session alive
    this.silentAudio.playsInline = true; // Required for iOS

    // Preload all audio files (this is the slow part)
    await this.preloadAudio();
  }

  /**
   * Preload all audio files into buffers
   */
  async preloadAudio() {
    const audioFiles = [
      // Letter audio files
      ...LETTERS.map(letter => ({
        name: `letter-${letter.toLowerCase()}`,
        path: `/audio/letters/${letter.toLowerCase()}.mp3`
      })),
      // Feedback audio files
      { name: 'hit', path: '/audio/feedback/hit.mp3' },
      { name: 'miss', path: '/audio/feedback/miss.mp3' },
      { name: 'false-alarm', path: '/audio/feedback/false-alarm.mp3' },
      { name: 'block-complete', path: '/audio/feedback/block-complete.mp3' },
      { name: 'level-up', path: '/audio/feedback/level-up.mp3' }
    ];

    const loadPromises = audioFiles.map(async ({ name, path }) => {
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load audio: ${path}`, error);
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Unlock audio - must be called from user gesture (iOS requirement)
   * This is critical for iOS Safari which requires user interaction before audio can play
   */
  async unlock() {
    if (this.unlocked) return;

    // Resume AudioContext if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Play a silent buffer to fully unlock Web Audio API
    // This is necessary for iOS to allow subsequent audio playback
    const silentBuffer = this.audioContext.createBuffer(1, 1, 22050);
    const source = this.audioContext.createBufferSource();
    source.buffer = silentBuffer;
    source.connect(this.audioContext.destination);
    source.start(0);

    // Start the silent HTML5 audio element for iOS background session
    // This keeps the audio session alive when the screen is locked
    try {
      await this.silentAudio.play();
    } catch (error) {
      console.warn('Could not start silent audio loop:', error);
    }

    // Handle visibility changes - resume audio context when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleVisibilityChange();
      }
    });

    // Handle iOS app becoming active
    window.addEventListener('focus', () => {
      this.handleVisibilityChange();
    });

    this.unlocked = true;
  }

  /**
   * Handle visibility change - resume audio if needed
   */
  async handleVisibilityChange() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Could not resume AudioContext:', error);
      }
    }

    // Ensure silent audio is still playing
    if (this.silentAudio && this.silentAudio.paused && this.unlocked) {
      try {
        await this.silentAudio.play();
      } catch (error) {
        console.warn('Could not resume silent audio:', error);
      }
    }
  }

  /**
   * Play a sound by name
   * @param {string} name - Name of the sound to play (e.g., 'letter-c', 'hit')
   */
  play(name) {
    const buffer = this.buffers.get(name);
    if (!buffer) {
      console.warn(`Audio buffer not found: ${name}`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.gainNode);
    source.start(0);
  }

  /**
   * Play a letter by the letter character
   * @param {string} letter - Letter to play (e.g., 'C', 'H')
   */
  playLetter(letter) {
    this.play(`letter-${letter.toLowerCase()}`);
  }

  /**
   * Set up MediaSession for lock screen integration
   * This enables media controls on the lock screen on iOS
   */
  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'N-Back Training',
      artist: 'Audio N-Back',
      album: 'Working Memory Training',
      artwork: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    // Set playback state
    navigator.mediaSession.playbackState = 'playing';

    navigator.mediaSession.setActionHandler('play', () => {
      // Emit event that game should resume
      window.dispatchEvent(new CustomEvent('mediasession-play'));
      navigator.mediaSession.playbackState = 'playing';
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      // Emit event that game should pause
      window.dispatchEvent(new CustomEvent('mediasession-pause'));
      navigator.mediaSession.playbackState = 'paused';
    });

    // Handle seek (ignore but prevent default behavior)
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);
    navigator.mediaSession.setActionHandler('seekto', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);
  }

  /**
   * Set the volume
   * @param {number} volume - Volume from 0 to 1
   */
  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Stop the silent audio loop
   */
  stopSilentLoop() {
    if (this.silentAudio) {
      this.silentAudio.pause();
      this.silentAudio.currentTime = 0;
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
