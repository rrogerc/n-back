import { LETTERS, BLOCK } from '../utils/constants.js';

/**
 * Generate an n-back sequence with guaranteed matches
 * @param {number} n - The n-back level
 * @param {number} totalTrials - Total number of trials
 * @param {number} matchRate - Fraction of eligible positions that are matches (default ~30%)
 * @returns {{ letters: string[], matchPositions: number[], n: number, totalTrials: number }}
 */
export function generateSequence(n, totalTrials = 20, matchRate = BLOCK.MATCH_RATE) {
  // Ensure we have at least n+1 trials
  totalTrials = Math.max(totalTrials, n + 1);

  const letters = new Array(totalTrials).fill(null);
  const matchPositions = [];

  // Scale match count with trial count (~30% of eligible positions)
  const maxPossibleMatches = totalTrials - n;
  const actualGuaranteedMatches = Math.max(1, Math.round(maxPossibleMatches * matchRate));

  // Step 1: Randomly select positions for guaranteed matches (must be >= n)
  const possibleMatchPositions = [];
  for (let i = n; i < totalTrials; i++) {
    possibleMatchPositions.push(i);
  }

  // Shuffle and pick first 'actualGuaranteedMatches' positions
  shuffleArray(possibleMatchPositions);
  for (let i = 0; i < actualGuaranteedMatches && i < possibleMatchPositions.length; i++) {
    matchPositions.push(possibleMatchPositions[i]);
  }
  matchPositions.sort((a, b) => a - b);

  // Step 2: Fill in the first n positions with random letters
  for (let i = 0; i < n; i++) {
    letters[i] = randomLetter();
  }

  // Step 3: Fill remaining positions
  for (let i = n; i < totalTrials; i++) {
    if (matchPositions.includes(i)) {
      // This is a match position - copy from n positions back
      letters[i] = letters[i - n];
    } else {
      // This is a non-match position - pick a letter that doesn't match
      letters[i] = randomNonMatchingLetter(letters[i - n]);
    }
  }

  return {
    letters,
    matchPositions,
    n,
    totalTrials
  };
}

/**
 * Get a random letter from the LETTERS array
 * @returns {string}
 */
function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

/**
 * Get a random letter that is different from the given letter
 * @param {string} excludeLetter - Letter to exclude
 * @returns {string}
 */
function randomNonMatchingLetter(excludeLetter) {
  const filtered = LETTERS.filter(l => l !== excludeLetter);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Fisher-Yates shuffle
 * @param {Array} array - Array to shuffle in place
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
