import { generateSequence } from './sequence-generator.js';
import { BLOCK } from '../utils/constants.js';

function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Correct number of trials
  const seq = generateSequence(2, 22);
  if (seq.totalTrials === 22) {
    console.log('Test 1 PASS: Should have 22 trials');
    passed++;
  } else {
    console.log(`Test 1 FAIL: Expected 22 trials, got ${seq.totalTrials}`);
    failed++;
  }

  // Test 2: Match count scales with trial count (~20% of eligible positions)
  const expectedMatches = Math.round((22 - 2) * BLOCK.MATCH_RATE);
  if (seq.matchPositions.length === expectedMatches) {
    console.log(`Test 2 PASS: Has ${seq.matchPositions.length} matches (expected ${expectedMatches})`);
    passed++;
  } else {
    console.log(`Test 2 FAIL: Expected ${expectedMatches} matches, got ${seq.matchPositions.length}`);
    failed++;
  }

  // Test 3: Matches are actually matches
  let matchesCorrect = true;
  for (const pos of seq.matchPositions) {
    if (seq.letters[pos] !== seq.letters[pos - seq.n]) {
      console.log(`Test 3 FAIL: Position ${pos} should match position ${pos - seq.n}`);
      matchesCorrect = false;
      break;
    }
  }
  if (matchesCorrect) {
    console.log('Test 3 PASS: All match positions correctly match');
    passed++;
  } else {
    failed++;
  }

  // Test 4: Non-matches don't accidentally match
  let nonMatchesCorrect = true;
  for (let i = seq.n; i < seq.totalTrials; i++) {
    if (!seq.matchPositions.includes(i)) {
      if (seq.letters[i] === seq.letters[i - seq.n]) {
        console.log(`Test 4 FAIL: Position ${i} should NOT match position ${i - seq.n}`);
        nonMatchesCorrect = false;
        break;
      }
    }
  }
  if (nonMatchesCorrect) {
    console.log('Test 4 PASS: Non-match positions correctly do not match');
    passed++;
  } else {
    failed++;
  }

  // Test 5: Custom trial count works
  const seq10 = generateSequence(2, 10);
  if (seq10.totalTrials === 10) {
    console.log('Test 5 PASS: Custom trial count (10) works');
    passed++;
  } else {
    console.log(`Test 5 FAIL: Expected 10 trials, got ${seq10.totalTrials}`);
    failed++;
  }

  // Test 6: Match count scales for large trial counts (100 trials, 3-back)
  const seq100 = generateSequence(3, 100);
  const expected100 = Math.round((100 - 3) * BLOCK.MATCH_RATE);
  if (seq100.matchPositions.length === expected100) {
    console.log(`Test 6 PASS: 100-trial 3-back has ${seq100.matchPositions.length} matches (expected ${expected100})`);
    passed++;
  } else {
    console.log(`Test 6 FAIL: Expected ${expected100} matches for 100 trials, got ${seq100.matchPositions.length}`);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('All tests passed!');
  }

  return failed === 0;
}

runTests();
