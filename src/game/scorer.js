import { ADAPTIVE } from '../utils/constants.js';

/**
 * Scorer tracks hits, misses, false alarms, and calculates accuracy
 */
export class Scorer {
  constructor() {
    this.reset();
  }

  /**
   * Record the result of one trial
   * @param {boolean} userPressed - Whether the user pressed during this trial
   * @param {boolean} wasMatch - Whether this trial was a match
   */
  recordTrial(userPressed, wasMatch) {
    if (wasMatch) {
      this.totalMatches++;
      if (userPressed) {
        this.hits++;
      } else {
        this.misses++;
      }
    } else {
      this.totalNonMatches++;
      if (userPressed) {
        this.falseAlarms++;
      } else {
        this.correctRejections++;
      }
    }
  }

  /**
   * Get the results of the current block
   * @returns {{ hits: number, misses: number, falseAlarms: number, correctRejections: number, accuracy: number, hitRate: number, correctRejectionRate: number }}
   */
  getResults() {
    // Hit rate = hits / total matches
    const hitRate = this.totalMatches > 0 ? this.hits / this.totalMatches : 0;

    // Correct rejection rate = correct rejections / total non-matches
    const correctRejectionRate = this.totalNonMatches > 0
      ? this.correctRejections / this.totalNonMatches
      : 0;

    // Overall accuracy = average of hit rate and correct rejection rate
    const accuracy = (hitRate + correctRejectionRate) / 2;

    return {
      hits: this.hits,
      misses: this.misses,
      falseAlarms: this.falseAlarms,
      correctRejections: this.correctRejections,
      accuracy,
      hitRate,
      correctRejectionRate
    };
  }

  /**
   * Reset all counters
   */
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.falseAlarms = 0;
    this.correctRejections = 0;
    this.totalMatches = 0;
    this.totalNonMatches = 0;
  }
}

/**
 * Calculate the next n-back level based on accuracy
 * @param {number} currentN - Current n-back level
 * @param {number} accuracy - Accuracy from 0 to 1
 * @returns {number} - Next n-back level
 */
export function calculateNextLevel(currentN, accuracy) {
  if (accuracy >= ADAPTIVE.INCREASE_THRESHOLD) {
    return Math.min(currentN + 1, ADAPTIVE.MAX_N);
  } else if (accuracy < ADAPTIVE.DECREASE_THRESHOLD) {
    return Math.max(currentN - 1, ADAPTIVE.MIN_N);
  }
  return currentN;
}
