'use strict';

// ── Train State ───────────────────────────────────────────────────────────────
const train = {
  wordList: null,
  wordArray: null,
  dict: 'csw',

  // Bingo trainer
  bingo: {
    word: null,
    shuffled: null,
    started: false,
    startTime: null,
    timerInterval: null,
    mode: 'untimed', // 'timed' | 'untimed'
    difficulty: 'common', // 'common' | 'full'
    revealed: false,
    streak: 0,
    bestTime: null,
  },

  // Daily puzzle
  daily: {
    word: null,
    shuffled: null,
    startTime: null,
    timerInterval: null,
    solved: false,
    revealed: false,
    attempts: 0,
  },

  // Challenge or not
  con: {
    word: null,
    isValid: null,
    answered: false,
    correct: 0,
    total: 0,
    streak: 0,
    timerInterval: null,
    timeLeft: 10,
  },

  // Hook trainer
  hook: {
    word: null,
    frontHooks: [],
    backHooks: [],
    revealed: false,
    correct: 0,
    total: 0,
  },

  // Flashcards
  flash: {
    decks: [],
    currentDeck: null,
    currentCard: null,
    cardIndex: 0,
    revealed: false,
    editing: false,
  },

  // Stats
  stats: {
    bingoSessions: 0,
    bingoSolved: 0,
    bingoStreak: 0,
    bingoBestStreak: 0,
    conCorrect: 0,
    conTotal: 0,
    conStreak: 0,
    conBestStreak: 0,
    hookCorrect: 0,
    hookTotal: 0,
    dailySolved: [],
    lastActive: null,
  },
};

// ── Common bingo words (high probability 7-letter words) ──────────────────────
const COMMON_BINGOS = [
  'SATIRE','SENIOR','SORTIE','TONIER','NORITE','ORIENT','IRONES',
  'RETINA','RETAIN','RETINA','ENTAIL','TAENIA','TINEAL','TENAIL',
  'ARISEN','SERIAL','SERAIL','NAILER','RENAIL','LINEAR','NAILER',
  'ANTLER','LEARNT','RENTAL','RENAL','ALIENS','ALINES','SALINE',
  'ELAINS','LIANES','SENIOR','NOSIER','IRONES','OILERS','REOILS',
  'SAILOR','ARIOSE','ORAISE','Serbia','RABIES','BRAISE','BAIRES',
  'ISOMER','MOIRES','RIMOSE','ETAMIN','MATINS','MERINO','MORINE',
  'IRONED','DINERO','RONDEL','LENDER','REOILED','NEROLI','OILIER',
  'STRAIN','TRAINS','ANTRIS','INSTAR','SANTIR','TAINTS','TANIST',
  'ALERTS','ALTERS','ARTELS','ESTRAL','LASTER','LASTRE','RASTLE',
  'CANERS','CASERN','CRANES','NACRES','RANCES','CASTER','CATERS',
  'DANCER','LANCER','CANCER','CARNET','NECTAR','RECANT','TANREC',
  'TRINES','SNITER','NITRES','NITERS','INERTS','INSERT','SINTER',
  'INTERS','BESTIR','BISTER','BISTRE','BITERS','TRIBES','TIBERS',
  'STONER','TENORS','TONERS','NOTERS','HONEST','HORNET','THROES',
  'OTHERS','TOKERS','STROBE','BOREST','BOTERS','SORBET','BESTOW',
  'TOWERS','TOWSER','WORSET','RATION','OARIST','AORIST','ARIOST',
  'CASTLE','CLEATS','SCLATE','ECLATS','LACEST','TALCES','CASTLE',
  'DERAIL','REDIAL','RELAID','DETAIL','DILATE','TAILED','DETAIN',
  'GAINED','NADINE','NAILED','DENIAL','SNAILED','ALINED','DENIAL',
  'TINSEL','ENLIST','LISTEN','SILENT','INLETS','ELINTS','LITTEN',
  'PALTER','PLATER','REPLAN','PLANER','PLANET','PLATEN','LEAPT',
  'MISEAT','SAMITE','SEMITA','TAMISE','MEATUS','AMUSIE','MISATE',
  'PIANOS','OPINES','ALPINE','PINEAL','PENIAL','PAEONS','AEON',
  'SINGLE','INGLES','LENSING','LINGER','LINGLE','SINGLY','TINGLE',
  'SORTED','STRODE','DOTERS','STORED','DESPOT','PEDOTS','POSTED',
  'ENDURE','INURED','RUINED','UNDIES','DUNITE','UNITED','UNTIED',
];

// ── Utility ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getDaysSinceEpoch() {
  return Math.floor(Date.now() / 86400000);
}

function getDailyWord(wordArr) {
  const seed = getDaysSinceEpoch();
  // Filter 7-letter words for daily puzzle
  const sevens = wordArr.filter(w => w.length === 7);
  return sevens[seed % sevens.length];
}

// ── Load word list ────────────────────────────────────────────────────────────
async function loadTrainWords(dict) {
  const key = dict || train.dict;
  train.wordList = await loadWordList(key);
  train.wordArray = [...train.wordList];
  return train.wordList;
}

// ── Stats persistence ─────────────────────────────────────────────────────────
function saveTrainStats() {
  localStorage.setItem('lc_train_stats', JSON.stringify(train.stats));
}

function loadTrainStats() {
  try {
    const s = JSON.parse(localStorage.getItem('lc_train_stats'));
    if (s) Object.assign(train.stats, s);
  } catch(e) {}
}

// ── Flashcard persistence ─────────────────────────────────────────────────────
function saveDecks() {
  localStorage.setItem('lc_flash_decks', JSON.stringify(train.flash.decks));
}

function loadDecks() {
  try {
    const d = JSON.parse(localStorage.getItem('lc_flash_decks'));
    if (d) train.flash.decks = d;
  } catch(e) {}
}

// ── Navigation within Train ───────────────────────────────────────────────────
function showTrainSection(section) {
  document.querySelectorAll('.train-section').forEach(s => s.style.display = 'none');
  document.getElementById(`train-${section}`).style.display = 'flex';
  if (section === 'home') renderTrainHome();
  if (section === 'bingo') initBingo();
  if (section === 'daily') initDaily();
  if (section === 'con') initCon();
  if (section === 'hook') initHook();
  if (section === 'flash') renderFlashHome();
  if (section === 'stats') renderStats();
}

function trainBack() { showTrainSection('home'); }

// ── Train Home ────────────────────────────────────────────────────────────────
function renderTrainHome() {
  // Update daily puzzle status
  const todayIdx = getDaysSinceEpoch();
  const solvedToday = train.stats.dailySolved.includes(todayIdx);
  const dailyStatus = document.getElementById('daily-status');
  if (dailyStatus) {
    dailyStatus.textContent = solvedToday ? '✓ Completed today' : 'New puzzle available';
    dailyStatus.style.color = solvedToday ? '#4ADE80' : '#F5A623';
  }

  // Update quick stats
  const conAcc = train.stats.conTotal > 0
    ? Math.round((train.stats.conCorrect / train.stats.conTotal) * 100) : 0;
  const el = document.getElementById('train-quick-stats');
  if (el) {
    el.innerHTML = `
      <div class="qs-item"><div class="qs-val">${train.stats.bingoSolved}</div><div class="qs-label">Bingos solved</div></div>
      <div class="qs-item"><div class="qs-val">${train.stats.bingoBestStreak}</div><div class="qs-label">Best streak</div></div>
      <div class="qs-item"><div class="qs-val">${conAcc}%</div><div class="qs-label">C-or-Not accuracy</div></div>
      <div class="qs-item"><div class="qs-val">${train.stats.dailySolved.length}</div><div class="qs-label">Daily puzzles</div></div>
    `;
  }
}

// ── Dict picker ───────────────────────────────────────────────────────────────
function setTrainDict(dict, feature) {
  train.dict = dict;
  train.wordList = null;
  train.wordArray = null;
  document.querySelectorAll(`.dict-pick-${feature} .dict-pick-btn`).forEach(b => {
    b.classList.toggle('selected', b.dataset.dict === dict);
  });
}

function renderDictPicker(feature) {
  return `
    <div class="dict-pick-row dict-pick-${feature}">
      <button class="dict-pick-btn${train.dict === 'csw' ? ' selected' : ''}" data-dict="csw"
        onclick="setTrainDict('csw','${feature}')">Collins CSW24</button>
      <button class="dict-pick-btn${train.dict === 'nwl' ? ' selected' : ''}" data-dict="nwl"
        onclick="setTrainDict('nwl','${feature}')">NWL2023</button>
    </div>`;
}

// ── BINGO TRAINER ─────────────────────────────────────────────────────────────
function initBingo() {
  train.bingo.revealed = false;
  train.bingo.started = false;
  renderBingoUI();
}

async function newBingoWord() {
  await loadTrainWords();
  const pool = train.bingo.difficulty === 'common'
    ? COMMON_BINGOS.filter(w => train.wordList.has(w))
    : train.wordArray.filter(w => w.length === 7);

  const word = pool[Math.floor(Math.random() * pool.length)];
  train.bingo.word = word;
  train.bingo.shuffled = shuffle(word.split('')).join('');
  // Make sure shuffle isn't the same as the word
  while (train.bingo.shuffled === word) {
    train.bingo.shuffled = shuffle(word.split('')).join('');
  }
  train.bingo.revealed = false;
  train.bingo.started = false;
  clearInterval(train.bingo.timerInterval);
  renderBingoUI();
}

function startBingoTimer() {
  if (train.bingo.mode !== 'timed') return;
  train.bingo.startTime = Date.now();
  train.bingo.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - train.bingo.startTime) / 1000);
    const el = document.getElementById('bingo-timer');
    if (el) el.textContent = elapsed + 's';
  }, 100);
}

function revealBingo() {
  if (!train.bingo.word) return;
  clearInterval(train.bingo.timerInterval);
  const elapsed = train.bingo.startTime
    ? ((Date.now() - train.bingo.startTime) / 1000).toFixed(1) : null;

  train.bingo.revealed = true;
  train.bingo.streak++;
  train.stats.bingoSolved++;
  train.stats.bingoStreak = train.bingo.streak;
  if (train.bingo.streak > train.stats.bingoBestStreak) {
    train.stats.bingoBestStreak = train.bingo.streak;
  }
  if (!train.stats.bingoBestTime || (elapsed && parseFloat(elapsed) < train.stats.bingoBestTime)) {
    train.stats.bingoBestTime = parseFloat(elapsed);
  }
  saveTrainStats();

  const wordEl = document.getElementById('bingo-word');
  if (wordEl) {
    wordEl.textContent = train.bingo.word;
    wordEl.style.color = '#4ADE80';
  }
  const timeEl = document.getElementById('bingo-solve-time');
  if (timeEl && elapsed) timeEl.textContent = `Solved in ${elapsed}s`;

  document.getElementById('bingo-reveal-btn').style.display = 'none';
  document.getElementById('bingo-next-btn').style.display = 'flex';
  document.getElementById('bingo-streak').textContent = `Streak: ${train.bingo.streak}`;
}

function skipBingo() {
  train.bingo.streak = 0;
  train.stats.bingoStreak = 0;
  saveTrainStats();
  newBingoWord();
}

function renderBingoUI() {
  const container = document.getElementById('bingo-content');
  if (!container) return;

  const dictPicker = renderDictPicker('bingo');
  const diffBtns = `
    <div class="diff-row">
      <button class="diff-btn${train.bingo.difficulty === 'common' ? ' selected' : ''}"
        onclick="train.bingo.difficulty='common';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">
        Common words</button>
      <button class="diff-btn${train.bingo.difficulty === 'full' ? ' selected' : ''}"
        onclick="train.bingo.difficulty='full';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">
        Full dictionary</button>
    </div>`;

  const modeBtns = `
    <div class="diff-row">
      <button class="diff-btn${train.bingo.mode === 'untimed' ? ' selected' : ''}"
        onclick="train.bingo.mode='untimed';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">
        Untimed</button>
      <button class="diff-btn${train.bingo.mode === 'timed' ? ' selected' : ''}"
        onclick="train.bingo.mode='timed';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">
        Timed</button>
    </div>`;

  container.innerHTML = `
    ${dictPicker}
    ${diffBtns}
    ${modeBtns}
    <button class="train-start-btn" onclick="newBingoWord()">
      ${train.bingo.word ? 'New word' : 'Start'}
    </button>
    ${train.bingo.word ? `
      <div class="bingo-card">
        <div class="bingo-label">Unscramble the 7-letter word</div>
        <div class="bingo-letters">${train.bingo.shuffled.split('').join(' ')}</div>
        <div class="bingo-word" id="bingo-word" style="color:transparent">
          ${train.bingo.word}
        </div>
        <div class="bingo-solve-time" id="bingo-solve-time"></div>
        <div class="bingo-streak" id="bingo-streak">Streak: ${train.bingo.streak}</div>
        ${train.bingo.mode === 'timed' ? `<div class="bingo-timer" id="bingo-timer">0s</div>` : ''}
        <div class="bingo-actions">
          <button class="bingo-reveal-btn" id="bingo-reveal-btn"
            onclick="if(!train.bingo.started){train.bingo.started=true;startBingoTimer();}revealBingo()">
            ${train.bingo.mode === 'timed' && !train.bingo.started ? 'Start + Reveal' : 'Reveal answer'}
          </button>
          <button class="bingo-next-btn" id="bingo-next-btn" style="display:none" onclick="newBingoWord()">
            Next word →
          </button>
          <button class="bingo-skip-btn" onclick="skipBingo()">Skip (resets streak)</button>
        </div>
      </div>
    ` : ''}`;
}

// ── DAILY PUZZLE ──────────────────────────────────────────────────────────────
async function initDaily() {
  await loadTrainWords();
  const todayIdx = getDaysSinceEpoch();
  const word = getDailyWord(train.wordArray);
  train.daily.word = word;
  train.daily.shuffled = shuffle(word.split('')).join('');
  while (train.daily.shuffled === word) {
    train.daily.shuffled = shuffle(word.split('')).join('');
  }
  train.daily.solved = train.stats.dailySolved.includes(todayIdx);
  train.daily.revealed = train.daily.solved;
  train.daily.startTime = Date.now();
  train.daily.attempts = 0;
  renderDailyUI();

  if (!train.daily.solved) {
    train.daily.timerInterval = setInterval(() => {
      const el = document.getElementById('daily-elapsed');
      if (el && !train.daily.solved) {
        const s = Math.floor((Date.now() - train.daily.startTime) / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        el.textContent = m + ':' + String(sec).padStart(2,'0');
      }
    }, 1000);
  }
}

function checkDailyAnswer() {
  const input = document.getElementById('daily-input');
  if (!input) return;
  const guess = input.value.trim().toUpperCase();
  train.daily.attempts++;

  if (guess === train.daily.word) {
    solveDailyPuzzle();
  } else {
    const fb = document.getElementById('daily-feedback');
    if (fb) {
      fb.textContent = train.wordList.has(guess)
        ? `${guess} is valid but not the answer. Try again!`
        : `${guess} is not a valid word. Try again!`;
      fb.style.color = '#E05252';
    }
    input.value = '';
  }
}

function solveDailyPuzzle() {
  clearInterval(train.daily.timerInterval);
  const todayIdx = getDaysSinceEpoch();
  if (!train.stats.dailySolved.includes(todayIdx)) {
    train.stats.dailySolved.push(todayIdx);
    // Keep only last 365
    if (train.stats.dailySolved.length > 365) train.stats.dailySolved.shift();
  }
  train.daily.solved = true;
  train.daily.revealed = true;
  saveTrainStats();
  renderDailyUI();
}

function generateShareCard() {
  const todayIdx = getDaysSinceEpoch();
  const elapsed = Math.floor((Date.now() - train.daily.startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
  const date = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });

  const text = `LexiClock Daily Puzzle #${todayIdx}\n🟩 Solved in ${timeStr}\n${train.daily.attempts} attempt${train.daily.attempts !== 1 ? 's' : ''}\n📅 ${date}\n\nlexiclock.app`;

  if (navigator.share) {
    navigator.share({ text });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('daily-share-btn');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '📤 Share result', 2000); }
    });
  }
}

function renderDailyUI() {
  const container = document.getElementById('daily-content');
  if (!container) return;

  const todayNum = getDaysSinceEpoch();
  const date = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });

  container.innerHTML = `
    <div class="daily-header">
      <div class="daily-num">Puzzle #${todayNum}</div>
      <div class="daily-date">${date}</div>
    </div>
    <div class="bingo-card">
      <div class="bingo-label">Unscramble the 7-letter word</div>
      <div class="bingo-letters">${train.daily.shuffled.split('').join(' ')}</div>
      ${train.daily.solved ? `
        <div class="daily-solved-word">${train.daily.word}</div>
        <div class="daily-solved-msg">🎉 Solved! Come back tomorrow for a new puzzle.</div>
        <div class="daily-elapsed">Time: <span id="daily-elapsed">${
          (() => {
            const s = Math.floor((Date.now() - train.daily.startTime) / 1000);
            return Math.floor(s/60) + ':' + String(s%60).padStart(2,'0');
          })()
        }</span> · ${train.daily.attempts} attempt${train.daily.attempts !== 1 ? 's' : ''}</div>
        <button class="train-start-btn" id="daily-share-btn" onclick="generateShareCard()">📤 Share result</button>
      ` : `
        <div class="daily-elapsed" id="daily-elapsed">0:00</div>
        <input type="text" id="daily-input" class="word-input" placeholder="Type your answer..."
          autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"
          maxlength="7" style="text-transform:uppercase"
          onkeydown="if(event.key==='Enter')checkDailyAnswer()"/>
        <div class="daily-feedback" id="daily-feedback"></div>
        <button class="train-start-btn" onclick="checkDailyAnswer()">Check answer</button>
        <button class="bingo-skip-btn" onclick="
          train.daily.revealed=true;
          clearInterval(train.daily.timerInterval);
          document.getElementById('daily-content').querySelector('.bingo-letters').insertAdjacentHTML('afterend',
            '<div class=\\'daily-solved-word\\'>' + train.daily.word + '</div>');">
          Give up (reveal answer)
        </button>
      `}
    </div>
  `;
}

// ── CHALLENGE OR NOT ──────────────────────────────────────────────────────────
async function initCon() {
  await loadTrainWords();
  train.con.answered = false;
  newConWord();
}

function newConWord() {
  clearInterval(train.con.timerInterval);
  train.con.answered = false;
  train.con.timeLeft = 10;

  // 50% valid, 50% invalid — for invalid, take a valid word and corrupt it
  const useValid = Math.random() > 0.5;
  if (useValid) {
    const idx = Math.floor(Math.random() * train.wordArray.length);
    // Bias toward shorter words (2-7 letters) — these come up in real games
    const shorts = train.wordArray.filter(w => w.length >= 2 && w.length <= 7);
    train.con.word = shorts[Math.floor(Math.random() * shorts.length)];
    train.con.isValid = true;
  } else {
    // Take a valid word and swap one letter
    const shorts = train.wordArray.filter(w => w.length >= 3 && w.length <= 7);
    let base = shorts[Math.floor(Math.random() * shorts.length)];
    let fake = base.split('');
    const pos = Math.floor(Math.random() * fake.length);
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let newLetter = alpha[Math.floor(Math.random() * 26)];
    while (newLetter === fake[pos]) newLetter = alpha[Math.floor(Math.random() * 26)];
    fake[pos] = newLetter;
    const fakeWord = fake.join('');
    // Only use if it's genuinely not in the word list
    if (!train.wordList.has(fakeWord)) {
      train.con.word = fakeWord;
      train.con.isValid = false;
    } else {
      // Fall back to a valid word
      train.con.word = base;
      train.con.isValid = true;
    }
  }

  renderConUI();

  // Start countdown
  train.con.timerInterval = setInterval(() => {
    train.con.timeLeft--;
    const el = document.getElementById('con-timer');
    if (el) {
      el.textContent = train.con.timeLeft + 's';
      el.style.color = train.con.timeLeft <= 3 ? '#E05252' : '#F5A623';
    }
    if (train.con.timeLeft <= 0) {
      clearInterval(train.con.timerInterval);
      answerCon(null); // time's up = wrong
    }
  }, 1000);
}

function answerCon(answer) {
  if (train.con.answered) return;
  clearInterval(train.con.timerInterval);
  train.con.answered = true;
  train.con.total++;
  train.stats.conTotal++;

  const correct = answer === null ? false : (answer === train.con.isValid);
  if (correct) {
    train.con.correct++;
    train.con.streak++;
    train.stats.conCorrect++;
    train.stats.conStreak = train.con.streak;
    if (train.con.streak > train.stats.conBestStreak) {
      train.stats.conBestStreak = train.con.streak;
    }
  } else {
    train.con.streak = 0;
    train.stats.conStreak = 0;
  }
  saveTrainStats();

  const feedback = document.getElementById('con-feedback');
  const wordEl = document.getElementById('con-word');
  if (feedback) {
    if (answer === null) {
      feedback.textContent = "⏱ Time's up!";
      feedback.style.color = '#E05252';
    } else if (correct) {
      feedback.textContent = '✓ Correct!';
      feedback.style.color = '#4ADE80';
    } else {
      feedback.textContent = `✗ Wrong — it's ${train.con.isValid ? 'VALID' : 'NOT VALID'}`;
      feedback.style.color = '#E05252';
    }
  }
  if (wordEl) {
    wordEl.style.color = train.con.isValid ? '#4ADE80' : '#E05252';
  }

  const acc = train.stats.conTotal > 0
    ? Math.round((train.stats.conCorrect / train.stats.conTotal) * 100) : 0;
  const statsEl = document.getElementById('con-stats');
  if (statsEl) statsEl.textContent = `Streak: ${train.con.streak} · Accuracy: ${acc}%`;

  // Show next button
  const actions = document.getElementById('con-actions');
  if (actions) {
    actions.innerHTML = `<button class="train-start-btn" onclick="newConWord()">Next word →</button>`;
  }
}

function renderConUI() {
  const container = document.getElementById('con-content');
  if (!container) return;

  const dictPicker = renderDictPicker('con');
  const acc = train.stats.conTotal > 0
    ? Math.round((train.stats.conCorrect / train.stats.conTotal) * 100) : 0;

  container.innerHTML = `
    ${dictPicker}
    <div class="con-card">
      <div class="con-timer-row">
        <div class="con-timer" id="con-timer">${train.con.timeLeft}s</div>
        <div class="con-stats" id="con-stats">Streak: ${train.con.streak} · Accuracy: ${acc}%</div>
      </div>
      <div class="con-question">Is this a valid Scrabble word?</div>
      <div class="con-word" id="con-word">${train.con.word}</div>
      <div class="con-feedback" id="con-feedback"></div>
      <div class="con-actions" id="con-actions">
        <button class="con-btn valid" onclick="answerCon(true)">✓ Valid</button>
        <button class="con-btn invalid" onclick="answerCon(false)">✗ Not valid</button>
      </div>
    </div>`;
}

// ── HOOK TRAINER ──────────────────────────────────────────────────────────────
async function initHook() {
  await loadTrainWords();
  newHookWord();
}

function newHookWord() {
  train.hook.revealed = false;
  train.hook.total++;
  train.stats.hookTotal = (train.stats.hookTotal || 0) + 1;

  // Pick a random 2-5 letter word
  const candidates = train.wordArray.filter(w => w.length >= 2 && w.length <= 5);
  const word = candidates[Math.floor(Math.random() * candidates.length)];
  train.hook.word = word;

  // Find front hooks (letters that can be prepended)
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  train.hook.frontHooks = alpha.filter(l => train.wordList.has(l + word));
  train.hook.backHooks = alpha.filter(l => train.wordList.has(word + l));

  renderHookUI();
}

function revealHooks() {
  train.hook.revealed = true;
  renderHookUI();
}

function renderHookUI() {
  const container = document.getElementById('hook-content');
  if (!container) return;

  const dictPicker = renderDictPicker('hook');

  container.innerHTML = `
    ${dictPicker}
    <div class="hook-card">
      <div class="hook-word-label">Word</div>
      <div class="hook-word">${train.hook.word || '—'}</div>
      ${train.hook.word ? `
        <div class="hook-question">What letters can go before or after this word?</div>
        <div class="hook-hint">Front hooks + _ + Back hooks</div>
        ${train.hook.revealed ? `
          <div class="hook-results">
            <div class="hook-section">
              <div class="hook-section-label">Front hooks (${train.hook.frontHooks.length})</div>
              <div class="hook-letters">
                ${train.hook.frontHooks.length > 0
                  ? train.hook.frontHooks.map(l =>
                    `<span class="hook-letter front">${l}+${train.hook.word}</span>`).join('')
                  : '<span class="hook-none">None</span>'}
              </div>
            </div>
            <div class="hook-section">
              <div class="hook-section-label">Back hooks (${train.hook.backHooks.length})</div>
              <div class="hook-letters">
                ${train.hook.backHooks.length > 0
                  ? train.hook.backHooks.map(l =>
                    `<span class="hook-letter back">${train.hook.word}+${l}</span>`).join('')
                  : '<span class="hook-none">None</span>'}
              </div>
            </div>
          </div>
          <button class="train-start-btn" onclick="newHookWord()">Next word →</button>
        ` : `
          <button class="train-start-btn" onclick="revealHooks()">Reveal hooks</button>
          <button class="bingo-skip-btn" onclick="newHookWord()">Skip</button>
        `}
      ` : `<button class="train-start-btn" onclick="newHookWord()">Start</button>`}
    </div>`;
}

// ── FLASHCARDS ────────────────────────────────────────────────────────────────
function renderFlashHome() {
  const container = document.getElementById('flash-content');
  if (!container) return;

  if (train.flash.decks.length === 0) {
    container.innerHTML = `
      <div class="explore-empty" style="padding-top:40px">
        No decks yet. Create your first deck to start studying.
      </div>
      <button class="train-start-btn" onclick="showCreateDeck()">+ Create deck</button>`;
    return;
  }

  container.innerHTML = `
    <button class="train-start-btn" onclick="showCreateDeck()" style="margin-bottom:8px">+ New deck</button>
    <div class="flash-decks">
      ${train.flash.decks.map((deck, i) => `
        <div class="flash-deck-card">
          <div class="flash-deck-info">
            <div class="flash-deck-name">${deck.name}</div>
            <div class="flash-deck-count">${deck.cards.length} card${deck.cards.length !== 1 ? 's' : ''}</div>
          </div>
          <div class="flash-deck-actions">
            <button class="flash-action-btn study" onclick="startStudy(${i})">Study</button>
            <button class="flash-action-btn edit" onclick="editDeck(${i})">Edit</button>
            <button class="flash-action-btn del" onclick="deleteDeck(${i})">✕</button>
          </div>
        </div>`).join('')}
    </div>`;
}

function showCreateDeck() {
  const container = document.getElementById('flash-content');
  if (!container) return;
  container.innerHTML = `
    <div class="flash-create">
      <div class="sec-label">New deck</div>
      <input type="text" id="deck-name-input" class="word-input" placeholder="Deck name e.g. Q words, Z words..." maxlength="40"/>
      <div class="sec-label" style="margin-top:12px">Cards (one per line: WORD | Definition)</div>
      <textarea id="deck-cards-input" class="flash-textarea"
        placeholder="QI | Life force in Chinese philosophy&#10;ZAX | Tool for cutting roof slates&#10;ZOEAE | Larvae of certain crustaceans"></textarea>
      <button class="train-start-btn" onclick="createDeck()">Save deck</button>
      <button class="bingo-skip-btn" onclick="renderFlashHome()">Cancel</button>
    </div>`;
}

function createDeck() {
  const name = document.getElementById('deck-name-input')?.value.trim();
  const raw = document.getElementById('deck-cards-input')?.value.trim();
  if (!name || !raw) return;

  const cards = raw.split('\n')
    .map(line => {
      const parts = line.split('|');
      return parts.length >= 2
        ? { word: parts[0].trim().toUpperCase(), def: parts.slice(1).join('|').trim() }
        : null;
    })
    .filter(Boolean);

  if (cards.length === 0) return;

  train.flash.decks.push({ name, cards, created: Date.now() });
  saveDecks();
  renderFlashHome();
}

function deleteDeck(i) {
  if (confirm(`Delete "${train.flash.decks[i].name}"?`)) {
    train.flash.decks.splice(i, 1);
    saveDecks();
    renderFlashHome();
  }
}

function editDeck(i) {
  const deck = train.flash.decks[i];
  const container = document.getElementById('flash-content');
  if (!container) return;
  container.innerHTML = `
    <div class="flash-create">
      <div class="sec-label">Edit deck</div>
      <input type="text" id="deck-name-input" class="word-input" value="${deck.name}" maxlength="40"/>
      <div class="sec-label" style="margin-top:12px">Cards (WORD | Definition)</div>
      <textarea id="deck-cards-input" class="flash-textarea">${
        deck.cards.map(c => `${c.word} | ${c.def}`).join('\n')
      }</textarea>
      <button class="train-start-btn" onclick="
        train.flash.decks[${i}].name = document.getElementById('deck-name-input').value.trim();
        train.flash.decks[${i}].cards = document.getElementById('deck-cards-input').value.trim().split('\\n')
          .map(l=>{const p=l.split('|');return p.length>=2?{word:p[0].trim().toUpperCase(),def:p.slice(1).join('|').trim()}:null;})
          .filter(Boolean);
        saveDecks(); renderFlashHome();">Save changes</button>
      <button class="bingo-skip-btn" onclick="renderFlashHome()">Cancel</button>
    </div>`;
}

function startStudy(i) {
  const deck = train.flash.decks[i];
  train.flash.currentDeck = i;
  train.flash.cardIndex = 0;
  train.flash.revealed = false;
  const shuffled = shuffle(deck.cards);
  train.flash.decks[i]._studyOrder = shuffled;
  showFlashCard();
}

function showFlashCard() {
  const deck = train.flash.decks[train.flash.currentDeck];
  const cards = deck._studyOrder || deck.cards;
  const idx = train.flash.cardIndex;
  const container = document.getElementById('flash-content');
  if (!container) return;

  if (idx >= cards.length) {
    container.innerHTML = `
      <div class="flash-complete">
        <div class="flash-complete-icon">🎉</div>
        <div class="flash-complete-title">Deck complete!</div>
        <div class="flash-complete-sub">You've gone through all ${cards.length} cards in "${deck.name}"</div>
        <button class="train-start-btn" onclick="startStudy(${train.flash.currentDeck})">Study again</button>
        <button class="bingo-skip-btn" onclick="renderFlashHome()">Back to decks</button>
      </div>`;
    return;
  }

  const card = cards[idx];
  train.flash.revealed = false;

  container.innerHTML = `
    <div class="flash-progress">
      <div class="flash-progress-bar" style="width:${(idx/cards.length)*100}%"></div>
    </div>
    <div class="flash-progress-label">${idx + 1} / ${cards.length} · ${deck.name}</div>
    <div class="flash-card" onclick="revealFlashCard()">
      <div class="flash-card-word">${card.word}</div>
      <div class="flash-card-def" id="flash-def" style="display:none">${card.def}</div>
      <div class="flash-card-hint" id="flash-hint">Tap to reveal definition</div>
    </div>
    <div class="flash-actions" id="flash-actions" style="display:none">
      <button class="flash-btn knew" onclick="nextFlashCard(true)">✓ Knew it</button>
      <button class="flash-btn didnt" onclick="nextFlashCard(false)">✗ Didn't know</button>
    </div>
    <button class="bingo-skip-btn" style="margin-top:8px" onclick="renderFlashHome()">← Back to decks</button>`;
}

function revealFlashCard() {
  if (train.flash.revealed) return;
  train.flash.revealed = true;
  const def = document.getElementById('flash-def');
  const hint = document.getElementById('flash-hint');
  const actions = document.getElementById('flash-actions');
  if (def) def.style.display = 'block';
  if (hint) hint.style.display = 'none';
  if (actions) actions.style.display = 'flex';
}

function nextFlashCard(knew) {
  if (knew) train.stats.hookCorrect = (train.stats.hookCorrect || 0) + 1;
  train.flash.cardIndex++;
  saveTrainStats();
  showFlashCard();
}

// ── STATS DASHBOARD ───────────────────────────────────────────────────────────
function renderStats() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  const conAcc = train.stats.conTotal > 0
    ? Math.round((train.stats.conCorrect / train.stats.conTotal) * 100) : 0;
  const hookAcc = train.stats.hookTotal > 0
    ? Math.round(((train.stats.hookCorrect || 0) / train.stats.hookTotal) * 100) : 0;
  const daysActive = train.stats.dailySolved.length;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-icon">🔤</div>
        <div class="stats-title">Bingo Trainer</div>
        <div class="stats-row"><span>Solved</span><span>${train.stats.bingoSolved}</span></div>
        <div class="stats-row"><span>Best streak</span><span>${train.stats.bingoBestStreak}</span></div>
        <div class="stats-row"><span>Best time</span><span>${train.stats.bingoBestTime ? train.stats.bingoBestTime + 's' : '—'}</span></div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">📅</div>
        <div class="stats-title">Daily Puzzle</div>
        <div class="stats-row"><span>Total solved</span><span>${daysActive}</span></div>
        <div class="stats-row"><span>Current streak</span><span>${getDailyStreak()}</span></div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">⚡</div>
        <div class="stats-title">Challenge or Not</div>
        <div class="stats-row"><span>Accuracy</span><span>${conAcc}%</span></div>
        <div class="stats-row"><span>Total played</span><span>${train.stats.conTotal}</span></div>
        <div class="stats-row"><span>Best streak</span><span>${train.stats.conBestStreak}</span></div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">🪝</div>
        <div class="stats-title">Hook Trainer</div>
        <div class="stats-row"><span>Total played</span><span>${train.stats.hookTotal || 0}</span></div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">🃏</div>
        <div class="stats-title">Flashcards</div>
        <div class="stats-row"><span>Decks created</span><span>${train.flash.decks.length}</span></div>
        <div class="stats-row"><span>Total cards</span><span>${train.flash.decks.reduce((s,d)=>s+d.cards.length,0)}</span></div>
      </div>
    </div>
    <button class="bingo-skip-btn" style="margin-top:16px;color:#E05252;border-color:#E05252"
      onclick="if(confirm('Reset all training stats? This cannot be undone.')){
        train.stats={bingoSessions:0,bingoSolved:0,bingoStreak:0,bingoBestStreak:0,
        conCorrect:0,conTotal:0,conStreak:0,conBestStreak:0,hookCorrect:0,hookTotal:0,
        dailySolved:[],lastActive:null};saveTrainStats();renderStats();}">
      Reset stats
    </button>`;
}

function getDailyStreak() {
  if (train.stats.dailySolved.length === 0) return 0;
  const today = getDaysSinceEpoch();
  let streak = 0;
  let day = today;
  while (train.stats.dailySolved.includes(day)) {
    streak++;
    day--;
  }
  return streak;
}

// ── Init Train ────────────────────────────────────────────────────────────────
function initTrain() {
  loadTrainStats();
  loadDecks();
  // Preload word list in background
  loadTrainWords().catch(() => {});
}
