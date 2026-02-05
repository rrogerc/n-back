# Audio N-Back PWA - Ralph-Friendly Implementation Plan

## Project Overview
An audio-only n-back working memory training PWA designed for "pocket use" - train while walking with phone in pocket, headphones, and a ring clicker for input.

## Tech Stack
- **Framework**: Vanilla JS + ES Modules (minimal bundle size)
- **Build**: Vite + vite-plugin-pwa
- **Audio**: Pre-recorded MP3s + Web Audio API
- **Storage**: IndexedDB for session history

---

## Ralph Loop Tasks

Each task below is self-contained with explicit verification and stopping conditions.

---

### Task 1: Project Scaffolding

**Goal**: Initialize Vite project with PWA plugin and folder structure.

**Steps**:
1. Run `npm create vite@latest . -- --template vanilla`
2. Install dependencies: `npm install vite-plugin-pwa workbox-window`
3. Create folder structure:
   ```
   src/
     main.js
     audio/
     game/
     input/
     ui/
     storage/
     utils/
   public/
     audio/
       letters/
       feedback/
   ```
4. Configure `vite.config.js` with PWA plugin
5. Create basic `manifest.json`

**Verification**:
```bash
npm run dev
# Then check: curl -s http://localhost:5173 | grep -q "<!DOCTYPE html" && echo "PASS" || echo "FAIL"
```

**Stop when**: `npm run dev` starts without errors AND `npm run build` succeeds.

---

### Task 2: Audio Manager Module

**Goal**: Create audio system that handles preloading, playback, iOS unlock, and MediaSession.

**Files to create**:
- `src/audio/audio-manager.js`
- `src/utils/constants.js`

**Key functionality**:
```javascript
// audio-manager.js exports:
class AudioManager {
  async init()           // Create AudioContext, preload audio
  async unlock()         // Must be called from user gesture (iOS requirement)
  play(name)             // Play a sound by name
  setupMediaSession()    // Lock screen integration
}
```

**Constants** (`src/utils/constants.js`):
```javascript
export const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
export const TIMING = { ISI: 3000, RESPONSE_WINDOW: 2500 };
export const BLOCK = { BASE_TRIALS: 20, GUARANTEED_MATCHES: 6 };
export const ADAPTIVE = { INCREASE_THRESHOLD: 0.85, DECREASE_THRESHOLD: 0.70, MIN_N: 1, MAX_N: 9 };
```

**Verification**:
```bash
# Create test file that imports and instantiates AudioManager
node --experimental-vm-modules -e "import('./src/audio/audio-manager.js').then(m => console.log('PASS: AudioManager exports correctly'))"
npm run build && echo "PASS: Build succeeds"
```

**Stop when**: Module imports without errors AND build succeeds.

---

### Task 3: Audio File Generation

**Goal**: Generate real letter audio files using macOS say command + ffmpeg.

**Prerequisites**:
```bash
# Install ffmpeg via Homebrew (if not already installed)
brew install ffmpeg
```

**Files to create**:
- `public/audio/letters/c.mp3` through `t.mp3` (8 files)
- `public/audio/feedback/hit.mp3`
- `public/audio/feedback/miss.mp3`
- `public/audio/feedback/false-alarm.mp3`
- `public/audio/feedback/block-complete.mp3`
- `public/audio/feedback/level-up.mp3`
- `public/audio/silent-loop.mp3`

**Approach**: Use macOS `say` command with Samantha voice + ffmpeg:
```bash
# Create directories
mkdir -p public/audio/letters public/audio/feedback

# Generate letter audio files (using Samantha voice for clarity)
for letter in C H K L Q R S T; do
  say -v Samantha "$letter" -o "/tmp/${letter,,}.aiff"
  ffmpeg -i "/tmp/${letter,,}.aiff" -acodec libmp3lame -q:a 2 -y "public/audio/letters/${letter,,}.mp3"
done

# Generate feedback sounds (using system sounds or synthesized)
say -v Samantha "correct" -o /tmp/hit.aiff
ffmpeg -i /tmp/hit.aiff -acodec libmp3lame -q:a 2 -y public/audio/feedback/hit.mp3

say -v Samantha "miss" -o /tmp/miss.aiff
ffmpeg -i /tmp/miss.aiff -acodec libmp3lame -q:a 2 -y public/audio/feedback/miss.mp3

say -v Samantha "wrong" -o /tmp/false-alarm.aiff
ffmpeg -i /tmp/false-alarm.aiff -acodec libmp3lame -q:a 2 -y public/audio/feedback/false-alarm.mp3

say -v Samantha "block complete" -o /tmp/block-complete.aiff
ffmpeg -i /tmp/block-complete.aiff -acodec libmp3lame -q:a 2 -y public/audio/feedback/block-complete.mp3

say -v Samantha "level up" -o /tmp/level-up.aiff
ffmpeg -i /tmp/level-up.aiff -acodec libmp3lame -q:a 2 -y public/audio/feedback/level-up.mp3

# Generate 1-second silent loop for iOS background audio session
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame -y public/audio/silent-loop.mp3
```

**Verification**:
```bash
ls public/audio/letters/*.mp3 | wc -l | grep -q "8" && echo "PASS: 8 letter files" || echo "FAIL"
ls public/audio/feedback/*.mp3 | wc -l | grep -q "5" && echo "PASS: 5 feedback files" || echo "FAIL"
ls public/audio/silent-loop.mp3 && echo "PASS: silent loop exists" || echo "FAIL"
# Test one file plays
afplay public/audio/letters/c.mp3 && echo "PASS: audio plays" || echo "FAIL"
```

**Stop when**: All 14 audio files exist AND `afplay` successfully plays a test file.

---

### Task 4: Input Manager Module

**Goal**: Unified input handling for touch, click, keyboard (Space, Enter, PageDown), and gamepad.

**File to create**: `src/input/input-manager.js`

**Key functionality**:
```javascript
class InputManager extends EventTarget {
  init()                  // Attach all event listeners
  handleInput(event)      // Debounced input processing
  on(event, handler)      // Subscribe to 'press' events
  off(event, handler)     // Unsubscribe
}
```

**Supported inputs**:
- Touch anywhere on document
- Mouse click anywhere
- Keyboard: Space, Enter, PageDown, ArrowRight
- Gamepad buttons (for ring clickers that appear as gamepad)

**Verification**:
```bash
npm run build && echo "PASS: Build succeeds with InputManager"
```

**Stop when**: Module exports correctly AND build succeeds.

---

### Task 5: Sequence Generator

**Goal**: Generate n-back sequences with guaranteed matches using research-backed parameters.

**File to create**: `src/game/sequence-generator.js`

**Key functionality**:
```javascript
export function generateSequence(n, baseTrials = 20, guaranteedMatches = 6) {
  // Returns: { letters: string[], matchPositions: number[], n, totalTrials }
}
```

**Algorithm**:
1. Total trials = baseTrials + n (the 20+n formula)
2. Randomly select `guaranteedMatches` positions >= n for matches
3. For match positions: copy letter from position i-n
4. For non-match positions: random letter that doesn't accidentally match

**Verification** (create test file `src/game/sequence-generator.test.js`):
```javascript
import { generateSequence } from './sequence-generator.js';

function runTests() {
  // Test 1: Correct number of trials
  const seq = generateSequence(2, 20, 6);
  console.assert(seq.totalTrials === 22, 'Should have 22 trials for n=2');

  // Test 2: Correct number of matches
  console.assert(seq.matchPositions.length === 6, 'Should have 6 matches');

  // Test 3: Matches are actually matches
  for (const pos of seq.matchPositions) {
    console.assert(seq.letters[pos] === seq.letters[pos - seq.n], `Position ${pos} should match position ${pos - seq.n}`);
  }

  // Test 4: Non-matches don't accidentally match
  for (let i = seq.n; i < seq.totalTrials; i++) {
    if (!seq.matchPositions.includes(i)) {
      console.assert(seq.letters[i] !== seq.letters[i - seq.n], `Position ${i} should NOT match`);
    }
  }

  console.log('All tests passed!');
}
runTests();
```

**Verification**:
```bash
node --experimental-vm-modules src/game/sequence-generator.test.js
```

**Stop when**: All 4 test assertions pass.

---

### Task 6: Scorer Module

**Goal**: Track hits, misses, false alarms, and calculate accuracy.

**File to create**: `src/game/scorer.js`

**Key functionality**:
```javascript
export class Scorer {
  constructor()
  recordTrial(userPressed, wasMatch)  // Record one trial result
  getResults()  // Returns { hits, misses, falseAlarms, correctRejections, accuracy }
  reset()
}

export function calculateNextLevel(currentN, accuracy) {
  // >85% -> increase, <70% -> decrease, else maintain
}
```

**Verification** (create test file):
```javascript
// Test: 5 hits, 1 miss, 2 false alarms out of 6 matches, 16 non-matches
// accuracy = (5/6 + 14/16) / 2 = (0.833 + 0.875) / 2 = 0.854
```

**Stop when**: Scorer calculates accuracy correctly for test cases AND `calculateNextLevel` returns correct level adjustments.

---

### Task 7: Game Engine

**Goal**: Main game loop that orchestrates audio, input, and scoring.

**File to create**: `src/game/game-engine.js`

**Key functionality**:
```javascript
class GameEngine {
  constructor(audioManager, inputManager)
  async startBlock(n)     // Run one block of trials
  pause()
  resume()
  stop()
  getState()              // 'idle' | 'playing' | 'paused' | 'complete'
}
```

**Game loop per trial**:
1. Play letter audio
2. Wait for response (up to RESPONSE_WINDOW)
3. Score the trial
4. Play feedback sound
5. Wait remaining ISI time
6. Repeat

**Verification**:
```bash
npm run build && echo "PASS: GameEngine builds"
```

**Stop when**: GameEngine integrates with AudioManager, InputManager, and Scorer without build errors.

---

### Task 8: Storage Module

**Goal**: Persist session history and settings using IndexedDB.

**File to create**: `src/storage/storage.js`

**Key functionality**:
```javascript
class Storage {
  async init()                          // Open IndexedDB
  async saveSession(sessionData)        // Save completed session
  async getSessions(limit = 10)         // Get recent sessions
  async getSettings()                   // Get user settings
  async saveSettings(settings)          // Save user settings
  async getBestLevel()                  // Get highest n level achieved
}
```

**Verification**:
```bash
npm run build && echo "PASS: Storage module builds"
```

**Stop when**: Module exports correctly AND build succeeds.

---

### Task 9: UI Screens

**Goal**: Create minimal UI screens (start, game, results).

**Files to create**:
- `src/ui/screens/start-screen.js`
- `src/ui/screens/game-screen.js`
- `src/ui/screens/results-screen.js`
- `src/ui/renderer.js`

**Start screen features**:
- N-level selector (1-9)
- Start button (triggers audio unlock)
- Display current/best level

**Game screen features**:
- Minimal visual (progress indicator)
- Entire screen is tap zone
- Pause button

**Results screen features**:
- Accuracy, hits, misses, false alarms
- Level change indicator
- Continue / End buttons

**Verification**:
```bash
npm run dev
# Manual check: screens render and navigate correctly
npm run build && echo "PASS: UI builds"
```

**Stop when**: All 3 screens render AND navigation between them works AND build succeeds.

---

### Task 10: Main App Integration

**Goal**: Wire everything together in main.js and index.html.

**Files to modify/create**:
- `src/main.js` - App initialization and screen routing
- `index.html` - Basic HTML structure with viewport meta tags
- `src/styles.css` - Minimal dark theme styles

**Integration checklist**:
1. Initialize AudioManager
2. Initialize InputManager
3. Initialize Storage
4. Initialize GameEngine
5. Render start screen
6. Handle screen transitions
7. Audio unlock on first user interaction

**Verification**:
```bash
npm run build
npm run preview
# App should load, show start screen, and be interactive
```

**Stop when**: App loads, shows start screen, AND user can start a game session.

---

### Task 11: PWA Configuration

**Goal**: Complete PWA setup for installability and offline support.

**Files to create/modify**:
- `vite.config.js` - Full PWA plugin config
- `public/manifest.json` - Complete manifest
- PWA icons (can be placeholder colored squares)

**PWA requirements**:
- `display: standalone`
- Icons: 192x192 and 512x512
- Service worker caches all assets
- Offline support

**Verification**:
```bash
npm run build
npx serve dist  # or npm run preview
# Check in Chrome DevTools > Application > Manifest
# Check in Chrome DevTools > Application > Service Workers
# Lighthouse PWA audit should pass installability checks
```

**Stop when**: Lighthouse PWA audit shows app is installable AND works offline.

---

### Task 12: iOS Audio Handling

**Goal**: Implement iOS-specific audio workarounds for pocket use.

**Modifications to** `src/audio/audio-manager.js`:

1. **Audio unlock on user gesture**:
   - Resume AudioContext
   - Play silent buffer
   - Start HTML5 audio element for MediaSession

2. **Silent audio loop**:
   - Keep audio session alive when screen is off
   - Use HTML5 Audio element (not Web Audio) for this

3. **MediaSession API**:
   - Set metadata (title, artwork)
   - Handle play/pause actions

**Verification**:
```bash
npm run build
# Test on iOS Safari (or iOS Simulator):
# 1. Install PWA
# 2. Start game
# 3. Lock screen
# 4. Audio should continue playing
```

**Stop when**: Audio plays correctly with screen locked on iOS (manual test required).

---

### Task 13: End-to-End Testing

**Goal**: Verify complete user flow works.

**Test scenarios**:
1. Fresh install -> start game -> complete block -> see results -> continue
2. Adaptive difficulty: get >85% accuracy -> level increases
3. Adaptive difficulty: get <70% accuracy -> level decreases
4. Session history persists after app restart
5. Works offline after first load
6. Ring clicker / keyboard input works during game

**Verification**:
```bash
npm run build
npm run preview
# Run through each scenario manually
# All scenarios should work as expected
```

**Stop when**: All 6 test scenarios pass.

---

## File Structure Summary

```
n-back/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── manifest.json
│   ├── audio/
│   │   ├── letters/ (c.mp3, h.mp3, k.mp3, l.mp3, q.mp3, r.mp3, s.mp3, t.mp3)
│   │   ├── feedback/ (hit.mp3, miss.mp3, false-alarm.mp3, block-complete.mp3, level-up.mp3)
│   │   └── silent-loop.mp3
│   └── icons/ (icon-192.png, icon-512.png)
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── audio/
│   │   └── audio-manager.js
│   ├── game/
│   │   ├── game-engine.js
│   │   ├── sequence-generator.js
│   │   ├── sequence-generator.test.js
│   │   └── scorer.js
│   ├── input/
│   │   └── input-manager.js
│   ├── storage/
│   │   └── storage.js
│   ├── ui/
│   │   ├── renderer.js
│   │   └── screens/
│   │       ├── start-screen.js
│   │       ├── game-screen.js
│   │       └── results-screen.js
│   └── utils/
│       └── constants.js
```

---

## Ralph Loop Execution Order

Run tasks in this order. Each task has clear stopping conditions.

```
Task 1: Project Scaffolding      -> STOP when: npm run dev && npm run build succeed
Task 2: Audio Manager Module     -> STOP when: module imports && build succeeds
Task 3: Audio File Generation     -> STOP when: all 14 MP3 files exist && afplay test passes
Task 4: Input Manager Module     -> STOP when: module imports && build succeeds
Task 5: Sequence Generator       -> STOP when: all 4 test assertions pass
Task 6: Scorer Module            -> STOP when: accuracy calculation tests pass
Task 7: Game Engine              -> STOP when: build succeeds with all integrations
Task 8: Storage Module           -> STOP when: module imports && build succeeds
Task 9: UI Screens               -> STOP when: all 3 screens render && build succeeds
Task 10: Main App Integration    -> STOP when: app loads and is interactive
Task 11: PWA Configuration       -> STOP when: Lighthouse installability passes
Task 12: iOS Audio Handling      -> STOP when: audio plays with screen locked (manual)
Task 13: End-to-End Testing      -> STOP when: all 6 scenarios pass (manual)
```

---

## Notes for Audio Files

Audio files are generated using macOS `say` command (Samantha voice) + ffmpeg.

The 8 letters (C, H, K, L, Q, R, S, T) were chosen for acoustic distinctness in n-back research - they have distinct phonetic properties that make them easy to distinguish even at fast presentation rates.

**Future improvement**: Replace with professional TTS (ElevenLabs) or human recordings for better audio quality if desired.

---

## Input Device Compatibility

| Device | How it works | Input event |
|--------|--------------|-------------|
| Ring clicker | Bluetooth HID keyboard | `keydown` (usually Enter or Space) |
| Wireless presenter | USB/Bluetooth HID | `keydown` (PageDown, ArrowRight) |
| Mouse/trackpad | Click | `click` |
| Screen tap | Touch | `touchstart` |
| Gamepad | Gamepad API | Button press polling |

All inputs are captured by InputManager and unified into a single 'press' event.

