import { Scorer, calculateNextLevel } from './scorer.js';

function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Scorer calculates accuracy correctly
  // Scenario: 5 hits, 1 miss, 2 false alarms out of 6 matches, 16 non-matches
  // Hit rate = 5/6 = 0.833...
  // Correct rejection rate = 14/16 = 0.875
  // Accuracy = (0.833... + 0.875) / 2 = 0.854...
  const scorer = new Scorer();

  // Record 5 hits (match + pressed)
  for (let i = 0; i < 5; i++) {
    scorer.recordTrial(true, true);
  }

  // Record 1 miss (match + not pressed)
  scorer.recordTrial(false, true);

  // Record 2 false alarms (non-match + pressed)
  for (let i = 0; i < 2; i++) {
    scorer.recordTrial(true, false);
  }

  // Record 14 correct rejections (non-match + not pressed)
  for (let i = 0; i < 14; i++) {
    scorer.recordTrial(false, false);
  }

  const results = scorer.getResults();

  if (results.hits === 5) {
    console.log('Test 1a PASS: Hits count is correct');
    passed++;
  } else {
    console.log(`Test 1a FAIL: Expected 5 hits, got ${results.hits}`);
    failed++;
  }

  if (results.misses === 1) {
    console.log('Test 1b PASS: Misses count is correct');
    passed++;
  } else {
    console.log(`Test 1b FAIL: Expected 1 miss, got ${results.misses}`);
    failed++;
  }

  if (results.falseAlarms === 2) {
    console.log('Test 1c PASS: False alarms count is correct');
    passed++;
  } else {
    console.log(`Test 1c FAIL: Expected 2 false alarms, got ${results.falseAlarms}`);
    failed++;
  }

  if (results.correctRejections === 14) {
    console.log('Test 1d PASS: Correct rejections count is correct');
    passed++;
  } else {
    console.log(`Test 1d FAIL: Expected 14 correct rejections, got ${results.correctRejections}`);
    failed++;
  }

  // Check accuracy calculation
  const expectedAccuracy = ((5/6) + (14/16)) / 2;
  if (Math.abs(results.accuracy - expectedAccuracy) < 0.001) {
    console.log(`Test 1e PASS: Accuracy is correct (~${expectedAccuracy.toFixed(3)})`);
    passed++;
  } else {
    console.log(`Test 1e FAIL: Expected accuracy ~${expectedAccuracy.toFixed(3)}, got ${results.accuracy.toFixed(3)}`);
    failed++;
  }

  // Test 2: calculateNextLevel increases level at >85%
  const levelUp = calculateNextLevel(2, 0.86);
  if (levelUp === 3) {
    console.log('Test 2 PASS: Level increases at >85% accuracy');
    passed++;
  } else {
    console.log(`Test 2 FAIL: Expected level 3, got ${levelUp}`);
    failed++;
  }

  // Test 3: calculateNextLevel decreases level at <70%
  const levelDown = calculateNextLevel(2, 0.65);
  if (levelDown === 1) {
    console.log('Test 3 PASS: Level decreases at <70% accuracy');
    passed++;
  } else {
    console.log(`Test 3 FAIL: Expected level 1, got ${levelDown}`);
    failed++;
  }

  // Test 4: calculateNextLevel maintains level between 70-85%
  const levelSame = calculateNextLevel(2, 0.77);
  if (levelSame === 2) {
    console.log('Test 4 PASS: Level maintains between 70-85% accuracy');
    passed++;
  } else {
    console.log(`Test 4 FAIL: Expected level 2, got ${levelSame}`);
    failed++;
  }

  // Test 5: calculateNextLevel respects MIN_N
  const atMin = calculateNextLevel(1, 0.50);
  if (atMin === 1) {
    console.log('Test 5 PASS: Level does not go below MIN_N (1)');
    passed++;
  } else {
    console.log(`Test 5 FAIL: Expected level 1 (min), got ${atMin}`);
    failed++;
  }

  // Test 6: calculateNextLevel respects MAX_N
  const atMax = calculateNextLevel(9, 0.95);
  if (atMax === 9) {
    console.log('Test 6 PASS: Level does not go above MAX_N (9)');
    passed++;
  } else {
    console.log(`Test 6 FAIL: Expected level 9 (max), got ${atMax}`);
    failed++;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('All tests passed!');
  }

  return failed === 0;
}

runTests();
