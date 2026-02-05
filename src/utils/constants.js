export const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];

export const TIMING = {
  ISI: 3000,           // Inter-stimulus interval in ms
  RESPONSE_WINDOW: 2500 // Time allowed for response in ms
};

export const BLOCK = {
  BASE_TRIALS: 20,     // Base number of trials per block
  GUARANTEED_MATCHES: 6 // Number of guaranteed matches per block
};

export const ADAPTIVE = {
  INCREASE_THRESHOLD: 0.85, // Accuracy above this -> increase N
  DECREASE_THRESHOLD: 0.70, // Accuracy below this -> decrease N
  MIN_N: 1,
  MAX_N: 9
};
