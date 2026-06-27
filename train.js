'use strict';

// ── Train State ───────────────────────────────────────────────────────────────
const train = {
  wordList: null,
  wordArray: null,
  dict: 'csw',
  invalidWords: [],

  bingo: {
    word: null, shuffled: null, allValid: [],
    started: false, startTime: null, timerInterval: null,
    elapsed: 0, elapsedInterval: null,
    mode: 'untimed', difficulty: 'common',
    revealed: false, streak: 0, userInput: '',
  },

  daily: {
    word: null, shuffled: null,
    startTime: null, timerInterval: null,
    solved: false, attempts: 0, elapsed: 0,
  },

  con: {
    word: null, isValid: null, answered: false,
    streak: 0, correct: 0, total: 0,
    timerInterval: null, timeLeft: 10,
  },

  hook: {
    word: null, frontHooks: [], backHooks: [],
    revealed: false, total: 0,
  },

  flash: {
    category: null,
    cards: [], cardIndex: 0,
    revealed: false,
    knewIt: 0, didntKnow: 0,
    missedCards: [],
    reviewing: false,
  },

  stats: {
    bingoSolved: 0, bingoBestStreak: 0, bingoBestTime: null,
    conCorrect: 0, conTotal: 0, conBestStreak: 0,
    hookTotal: 0,
    flashSessions: 0,
    dailySolved: [],
    lastActive: null,
  },
};

// ── Common bingo stems (valid 7-letter words) ─────────────────────────────────
const COMMON_BINGOS = [
  'SATIRE','SENIOR','SORTIE','RETINA','RETAIN','ENTAIL','TAENIA',
  'ARISEN','SERIAL','ANTLER','RENTAL','ALIENS','ALINES','SALINE',
  'OILERS','REOILS','STRAIN','TRAINS','INSTAR','ALERTS','ALTERS',
  'ARTELS','CANERS','CRANES','NACRES','RANCES','CASTER','CATERS',
  'TRINES','NITERS','INERTS','INSERT','SINTER','STONER','TENORS',
  'TONERS','NOTERS','CASTLE','CLEATS','ECLATS','DETAIL','DILATE',
  'TINSEL','ENLIST','LISTEN','SILENT','INLETS','SORTED','STRODE',
  'STORED','UNITED','UNTIED','DENIALS','NAILED','GAINED','SAILOR',
  'MERINO','IRONED','DINERO','NEROLI','DANCER','LANCER','BESTIR',
  'TRIBES','TOKERS','TOWERS','RATION','AORIST','CARETS','REACTS',
  'CRATES','TRACES','MASTER','STREAM','TAMERS','REMAST','ARMETS',
  'MATERS','RAMETS','OATERS','OSETRA','ORNATE','ATONER','REASON',
  'SENORA','TRONAS','TORANS','TOLANE','LANOSE','LOANER','RELOAN',
  'NEURAL','UNREAL','URINAL','URINALS','INSULAR','RATINE','RETAIN',
  'TIRANE','ANTIRE','TRIVIA','NAEVI','NAEVUS','VENIAL','DENIAL',
  'GENIAL','FLAMEN','YEOMAN','YEOMEN','LEMONS','SOLEMN','MELONS',
  'SNOREL','LOANER','ELOANS','STEARIN','NASTIER','ANTSIER','RETAINS',
  'TRAINED','DETRAIN','PAINTER','CERTAIN','TACRINE','CISTERN',
  'CANISTER','CLARINET','RELATION','SENORITA','NOTARIES',
];

// ── Letter frequency scores for difficulty ────────────────────────────────────
const LETTER_FREQ = {
  A:9,E:13,I:8,O:8,U:3,L:4,S:6,T:6,R:6,N:7,
  D:4,G:3,B:2,C:3,M:2,P:2,F:2,H:2,W:2,Y:2,
  K:1,V:1,X:1,Q:0.5,J:0.5,Z:0.5
};

function wordDifficulty(word) {
  // Score based on letter rarity and length
  const score = word.split('').reduce((s,l) => s + (LETTER_FREQ[l] || 1), 0) / word.length;
  if (score >= 6) return 'easy';
  if (score >= 4.5) return 'medium';
  if (score >= 3) return 'hard';
  return 'veryhard';
}

function difficultyLabel(d) {
  return { easy:'Easy 🟢', medium:'Medium 🟡', hard:'Hard 🟠', veryhard:'Very Hard 🔴' }[d];
}

// ── Motivational messages ─────────────────────────────────────────────────────
const MESSAGES = {
  daily: {
    perfect: [ // <10s, 1 attempt
      "That was absurd. Are you even human? 🤖",
      "Sub-10 seconds again?! You're a menace at the board 😤",
      "At this point just go win a tournament already 🏆",
      "Okay we need to make these harder. You're too good 👀",
      "Lightning fast. Your opponents don't stand a chance ⚡",
    ],
    fast: [ // <30s, 1 attempt
      "First try, fast time. That's a proper Scrabble brain 🧠",
      "Clean and clinical. Love to see it ✨",
      "You made that look easy 💪",
      "One and done. Efficient as always 🎯",
      "That's the kind of speed that wins tournaments 🏅",
    ],
    good: [ // 1-2 attempts or <60s
      "Solid solve. You're getting sharper 📈",
      "Good work — that one wasn't easy 👏",
      "Nice! Keep that streak going 🔥",
      "That's the stuff. Consistency wins games 💡",
      "Well done. See you tomorrow? 📅",
    ],
    struggled: [ // 3+ attempts or >60s
      "Got there in the end — that's what counts 💪",
      "Tricky one today. You stuck with it though 🤝",
      "Every tough solve makes the next one easier 📚",
      "That one had most players stumped too. Don't sweat it 😅",
      "Progress isn't always pretty but you got it done 🎯",
    ],
    streak: [ // streak milestones
      "3 days in a row! Building a habit 🌱",
      "5 day streak! You're on a roll 🔥",
      "7 days straight! One full week of puzzles 🗓️",
      "10 days! This is getting impressive 💥",
      "2 weeks straight! Committed player right here 👑",
      "30 days! A full month. Legendary 🏆",
    ],
  }
};

function getMotivationalMessage(elapsed, attempts, streak) {
  const msgs = MESSAGES.daily;
  // Check streak milestones first
  const milestones = [3,5,7,10,14,30];
  if (milestones.includes(streak)) {
    const idx = milestones.indexOf(streak);
    return msgs.streak[idx];
  }
  // Base on performance
  const pool = elapsed < 10 && attempts === 1 ? msgs.perfect
    : elapsed < 30 && attempts === 1 ? msgs.fast
    : attempts <= 2 || elapsed < 60 ? msgs.good
    : msgs.struggled;

  // Use day index to vary message so same performance doesn't repeat
  const dayIdx = getDaysSinceEpoch();
  return pool[dayIdx % pool.length];
}

// ── Utilities ─────────────────────────────────────────────────────────────────
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
  const sevens = wordArr.filter(w => w.length === 7);
  return sevens[seed % sevens.length];
}

function wordScore(word) {
  const vals = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
  return word.split('').reduce((s,l) => s + (vals[l] || 0), 0);
}

function getHooks(word) {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const front = alpha.filter(l => train.wordList.has(l + word));
  const back = alpha.filter(l => train.wordList.has(word + l));
  return { front, back };
}

function isLikelyPlural(word) {
  if (!word.endsWith('S')) return false;
  const base = word.slice(0, -1);
  return train.wordList && train.wordList.has(base);
}

// ── Load resources ────────────────────────────────────────────────────────────
async function loadTrainWords(dict) {
  const key = dict || train.dict;
  if (!train.wordList) {
    train.wordList = await loadWordList(key);
    train.wordArray = [...train.wordList];
  }
  return train.wordList;
}

async function loadInvalidWords() {
  if (train.invalidWords.length > 0) return;
  try {
    const res = await fetch('/words/invalid_words.json');
    train.invalidWords = await res.json();
  } catch(e) { train.invalidWords = []; }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function saveTrainStats() {
  localStorage.setItem('lc_train_stats', JSON.stringify(train.stats));
}
function loadTrainStats() {
  try {
    const s = JSON.parse(localStorage.getItem('lc_train_stats'));
    if (s) Object.assign(train.stats, s);
  } catch(e) {}
}

function getDailyStreak() {
  if (!train.stats.dailySolved.length) return 0;
  const today = getDaysSinceEpoch();
  let streak = 0, day = today;
  while (train.stats.dailySolved.includes(day)) { streak++; day--; }
  return streak;
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showTrainSection(section) {
  document.querySelectorAll('.train-section').forEach(s => s.style.display = 'none');
  document.getElementById(`train-${section}`).style.display = 'flex';
  if (section === 'home') renderTrainHome();
  if (section === 'bingo') renderBingoUI();
  if (section === 'daily') initDaily();
  if (section === 'con') initCon();
  if (section === 'hook') renderHookUI();
  if (section === 'flash') renderFlashHome();
  if (section === 'stats') renderStats();
}
function trainBack() { showTrainSection('home'); }

// ── Train Home ────────────────────────────────────────────────────────────────
function renderTrainHome() {
  const todayIdx = getDaysSinceEpoch();
  const solvedToday = train.stats.dailySolved.includes(todayIdx);
  const el = document.getElementById('daily-status');
  if (el) {
    el.textContent = solvedToday ? '✓ Completed today' : 'New puzzle available';
    el.style.color = solvedToday ? '#4ADE80' : '#F5A623';
  }
  const conAcc = train.stats.conTotal > 0
    ? Math.round((train.stats.conCorrect / train.stats.conTotal) * 100) : 0;
  const qs = document.getElementById('train-quick-stats');
  if (qs) qs.innerHTML = `
    <div class="qs-item"><div class="qs-val">${train.stats.bingoSolved}</div><div class="qs-label">Bingos solved</div></div>
    <div class="qs-item"><div class="qs-val">${train.stats.bingoBestStreak}</div><div class="qs-label">Best streak</div></div>
    <div class="qs-item"><div class="qs-val">${conAcc}%</div><div class="qs-label">C-or-Not accuracy</div></div>
    <div class="qs-item"><div class="qs-val">${getDailyStreak()}</div><div class="qs-label">Daily streak</div></div>`;
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
  return `<div class="dict-pick-row dict-pick-${feature}">
    <button class="dict-pick-btn${train.dict==='csw'?' selected':''}" data-dict="csw"
      onclick="setTrainDict('csw','${feature}')">Collins CSW24</button>
    <button class="dict-pick-btn${train.dict==='nwl'?' selected':''}" data-dict="nwl"
      onclick="setTrainDict('nwl','${feature}')">NWL2023</button>
  </div>`;
}

// ── BINGO TRAINER ─────────────────────────────────────────────────────────────
async function newBingoWord() {
  await loadTrainWords();
  const btn = document.getElementById('bingo-start-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }

  const pool = train.bingo.difficulty === 'common'
    ? COMMON_BINGOS.filter(w => w.length === 7 && train.wordList.has(w))
    : train.wordArray.filter(w => w.length === 7);

  const word = pool[Math.floor(Math.random() * pool.length)];

  // Find ALL valid anagrams of this word
  const letters = word.split('').sort().join('');
  const allValid = train.wordArray.filter(w => {
    if (w.length !== 7) return false;
    return w.split('').sort().join('') === letters;
  });

  train.bingo.word = word;
  train.bingo.allValid = allValid;
  train.bingo.shuffled = shuffle(word.split('')).join('');
  while (train.bingo.shuffled === word) {
    train.bingo.shuffled = shuffle(word.split('')).join('');
  }
  train.bingo.revealed = false;
  train.bingo.started = false;
  train.bingo.elapsed = 0;
  train.bingo.userInput = '';
  clearInterval(train.bingo.timerInterval);
  clearInterval(train.bingo.elapsedInterval);
  renderBingoCard();
}

function startBingoTimer() {
  if (train.bingo.started) return;
  train.bingo.started = true;
  train.bingo.startTime = Date.now();
  train.bingo.elapsedInterval = setInterval(() => {
    train.bingo.elapsed = ((Date.now() - train.bingo.startTime) / 1000).toFixed(1);
    const el = document.getElementById('bingo-timer');
    if (el) el.textContent = train.bingo.elapsed + 's';
  }, 100);
}

function checkBingoAnswer() {
  const input = document.getElementById('bingo-input');
  if (!input) return;
  const guess = input.value.trim().toUpperCase();
  if (!guess) return;

  if (!train.bingo.started) startBingoTimer();

  if (train.bingo.allValid.includes(guess)) {
    // Correct!
    clearInterval(train.bingo.elapsedInterval);
    const elapsed = train.bingo.elapsed;
    train.bingo.revealed = true;
    train.bingo.streak++;
    train.stats.bingoSolved++;
    train.stats.bingoBestStreak = Math.max(train.stats.bingoBestStreak, train.bingo.streak);
    if (!train.stats.bingoBestTime || parseFloat(elapsed) < train.stats.bingoBestTime) {
      train.stats.bingoBestTime = parseFloat(elapsed);
    }
    saveTrainStats();
    renderBingoResult(true, guess, elapsed);
  } else if (train.wordList.has(guess)) {
    // Valid word but wrong length/letters
    const fb = document.getElementById('bingo-feedback');
    if (fb) { fb.textContent = `${guess} is valid but not from these letters. Try again!`; fb.style.color = '#F5A623'; }
    input.value = '';
  } else {
    const fb = document.getElementById('bingo-feedback');
    if (fb) { fb.textContent = `${guess} is not a valid word. Try again!`; fb.style.color = '#E05252'; }
    input.value = '';
  }
}

function revealBingo() {
  clearInterval(train.bingo.elapsedInterval);
  train.bingo.revealed = true;
  train.bingo.streak = 0;
  train.stats.bingoBestStreak = Math.max(train.stats.bingoBestStreak, 0);
  saveTrainStats();
  renderBingoResult(false, null, train.bingo.elapsed);
}

function renderBingoResult(correct, guess, elapsed) {
  const card = document.getElementById('bingo-card-inner');
  if (!card) return;
  const hooks = getHooks(train.bingo.allValid[0]);
  const allValidList = train.bingo.allValid.join(', ');

  card.innerHTML = `
    <div class="bingo-result-word" style="color:${correct?'#4ADE80':'#E05252'}">
      ${correct ? guess : train.bingo.allValid[0]}
    </div>
    ${train.bingo.allValid.length > 1 ? `<div class="bingo-also">Also valid: ${train.bingo.allValid.filter(w=>w!==guess).join(', ')}</div>` : ''}
    ${elapsed > 0 ? `<div class="bingo-solve-time">${correct ? '✓ Solved' : 'Revealed'} in ${elapsed}s</div>` : ''}
    <div class="bingo-streak">Streak: ${train.bingo.streak}</div>
    ${hooks.front.length > 0 || hooks.back.length > 0 ? `
      <div class="hook-results" style="margin-top:12px;text-align:left">
        ${hooks.front.length > 0 ? `
          <div class="hook-section-label">Front hooks</div>
          <div class="hook-letters" style="margin-bottom:8px">
            ${hooks.front.map(l=>`<span class="hook-letter front">${l}+${train.bingo.allValid[0]}</span>`).join('')}
          </div>` : ''}
        ${hooks.back.length > 0 ? `
          <div class="hook-section-label">Back hooks</div>
          <div class="hook-letters">
            ${hooks.back.map(l=>`<span class="hook-letter back">${train.bingo.allValid[0]}+${l}</span>`).join('')}
          </div>` : ''}
      </div>` : '<div class="bingo-solve-time">No hooks for this word</div>'}
    <div class="bingo-actions" style="margin-top:16px">
      <button class="bingo-next-btn" onclick="newBingoWord()">Next word →</button>
    </div>`;
}

function skipBingo() {
  train.bingo.streak = 0;
  clearInterval(train.bingo.elapsedInterval);
  saveTrainStats();
  newBingoWord();
}

function renderBingoUI() {
  const container = document.getElementById('bingo-content');
  if (!container) return;
  container.innerHTML = `
    ${renderDictPicker('bingo')}
    <div class="diff-row">
      <button class="diff-btn${train.bingo.difficulty==='common'?' selected':''}"
        onclick="train.bingo.difficulty='common';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">Common words</button>
      <button class="diff-btn${train.bingo.difficulty==='full'?' selected':''}"
        onclick="train.bingo.difficulty='full';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">Full dictionary</button>
    </div>
    <div class="diff-row">
      <button class="diff-btn${train.bingo.mode==='untimed'?' selected':''}"
        onclick="train.bingo.mode='untimed';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">Untimed</button>
      <button class="diff-btn${train.bingo.mode==='timed'?' selected':''}"
        onclick="train.bingo.mode='timed';this.parentNode.querySelectorAll('.diff-btn').forEach(b=>b.classList.remove('selected'));this.classList.add('selected')">Timed</button>
    </div>
    <button class="train-start-btn" id="bingo-start-btn" onclick="newBingoWord()">New word</button>
    <div id="bingo-card-wrap"></div>`;
}

function renderBingoCard() {
  const wrap = document.getElementById('bingo-card-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="bingo-card">
      <div class="bingo-label">Find the valid 7-letter word · ${train.bingo.allValid.length > 1 ? 'Multiple answers possible' : ''}</div>
      <div class="bingo-letters-row">${train.bingo.shuffled.split('').map(l=>`<span class="bingo-tile">${l}</span>`).join('')}</div>
      ${train.bingo.mode==='timed'?`<div class="bingo-timer" id="bingo-timer">0.0s</div>`:''}
      <div id="bingo-card-inner">
        <input type="text" id="bingo-input" class="word-input" placeholder="Type your answer..."
          autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"
          maxlength="15" style="text-transform:uppercase;margin-bottom:8px"
          onkeydown="if(event.key==='Enter'){if(!train.bingo.started)startBingoTimer();checkBingoAnswer();}"
          oninput="if(!train.bingo.started&&this.value.length>0)startBingoTimer()"/>
        <div id="bingo-feedback" style="font-size:13px;min-height:20px;margin-bottom:8px"></div>
        <div class="bingo-streak">Streak: ${train.bingo.streak}</div>
        <div class="bingo-actions">
          <button class="bingo-reveal-btn" onclick="revealBingo()">Give up — reveal answer</button>
          <button class="bingo-skip-btn" onclick="skipBingo()">Skip (resets streak)</button>
        </div>
      </div>
    </div>`;

  // Auto-focus input
  setTimeout(() => document.getElementById('bingo-input')?.focus(), 100);
  const btn = document.getElementById('bingo-start-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'New word'; }
}

// ── DAILY PUZZLE ──────────────────────────────────────────────────────────────
async function initDaily() {
  await loadTrainWords();
  const todayIdx = getDaysSinceEpoch();
  const word = getDailyWord(train.wordArray);
  const diff = wordDifficulty(word);
  train.daily.word = word;
  let sh = shuffle(word.split('')).join('');
  while (sh === word) sh = shuffle(word.split('')).join('');
  train.daily.shuffled = sh;
  train.daily.solved = train.stats.dailySolved.includes(todayIdx);
  train.daily.attempts = 0;
  train.daily.elapsed = 0;
  train.daily.startTime = Date.now();
  clearInterval(train.daily.timerInterval);

  if (!train.daily.solved) {
    train.daily.timerInterval = setInterval(() => {
      train.daily.elapsed = Math.floor((Date.now() - train.daily.startTime) / 1000);
      const el = document.getElementById('daily-elapsed');
      if (el) {
        const m = Math.floor(train.daily.elapsed/60);
        const s = train.daily.elapsed%60;
        el.textContent = m+':'+String(s).padStart(2,'0');
      }
    }, 1000);
  }
  renderDailyUI(diff);
}

function checkDailyAnswer() {
  const input = document.getElementById('daily-input');
  if (!input || train.daily.solved) return;
  const guess = input.value.trim().toUpperCase();
  if (!guess) return;
  train.daily.attempts++;

  // Find all valid anagrams of daily word
  const letters = train.daily.word.split('').sort().join('');
  const isValidAnagram = train.wordList.has(guess) &&
    guess.length === train.daily.word.length &&
    guess.split('').sort().join('') === letters;

  if (isValidAnagram) {
    clearInterval(train.daily.timerInterval);
    train.daily.solved = true;
    const todayIdx = getDaysSinceEpoch();
    if (!train.stats.dailySolved.includes(todayIdx)) {
      train.stats.dailySolved.push(todayIdx);
      if (train.stats.dailySolved.length > 365) train.stats.dailySolved.shift();
    }
    saveTrainStats();
    renderDailyUI(wordDifficulty(train.daily.word));
  } else {
    const fb = document.getElementById('daily-feedback');
    if (fb) {
      fb.textContent = train.wordList.has(guess)
        ? `${guess} is valid but not the answer. Try again!`
        : `${guess} is not a valid Scrabble word. Try again!`;
      fb.style.color = '#E05252';
    }
    input.value = '';
  }
}

function giveUpDaily() {
  clearInterval(train.daily.timerInterval);
  train.daily.solved = true;
  train.daily.attempts = 99; // signal gave up
  renderDailyUI(wordDifficulty(train.daily.word));
}

function generateShareCard() {
  const todayIdx = getDaysSinceEpoch();
  const s = train.daily.elapsed;
  const timeStr = Math.floor(s/60)+'m '+String(s%60).padStart(2,'0')+'s';
  const date = new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const diff = wordDifficulty(train.daily.word);
  const diffEmoji = {easy:'🟢',medium:'🟡',hard:'🟠',veryhard:'🔴'}[diff];
  const text = `LexiClock Daily Puzzle #${todayIdx} ${diffEmoji}\n⏱ ${timeStr} · ${train.daily.attempts} attempt${train.daily.attempts!==1?'s':''}\n🔥 ${getDailyStreak()} day streak\n\nlexiclock.app`;
  if (navigator.share) navigator.share({text});
  else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(()=>{
      const btn = document.getElementById('daily-share-btn');
      if (btn){btn.textContent='✓ Copied!';setTimeout(()=>btn.textContent='📤 Share result',2000);}
    });
  }
}

function renderDailyUI(diff) {
  const container = document.getElementById('daily-content');
  if (!container) return;
  const todayNum = getDaysSinceEpoch();
  const date = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  const streak = getDailyStreak();
  const gaveUp = train.daily.attempts === 99;

  container.innerHTML = `
    <div class="daily-header">
      <div class="daily-num">Puzzle #${todayNum}</div>
      <div class="daily-date">${date}</div>
      <div class="daily-diff-tag diff-${diff}">${difficultyLabel(diff)}</div>
    </div>
    <div class="bingo-card">
      <div class="bingo-label">Unscramble the 7-letter word</div>
      <div class="bingo-letters-row">${train.daily.shuffled.split('').map(l=>`<span class="bingo-tile">${l}</span>`).join('')}</div>
      ${train.daily.solved ? `
        <div class="daily-solved-word" style="color:${gaveUp?'#E05252':'#4ADE80'}">${train.daily.word}</div>
        ${!gaveUp ? `
          <div class="daily-motivation">${getMotivationalMessage(train.daily.elapsed, train.daily.attempts, streak)}</div>
          <div class="daily-meta">⏱ ${Math.floor(train.daily.elapsed/60)}:${String(train.daily.elapsed%60).padStart(2,'0')} · ${train.daily.attempts} attempt${train.daily.attempts!==1?'s':''} · 🔥 ${streak} day streak</div>
          <button class="train-start-btn" id="daily-share-btn" onclick="generateShareCard()">📤 Share result</button>
        ` : `<div class="daily-motivation" style="color:var(--muted)">Better luck tomorrow. The word was ${train.daily.word}.</div>`}
        <div class="daily-solved-msg">Come back tomorrow for a new puzzle.</div>
      ` : `
        <div class="daily-timer-row">
          <div class="daily-elapsed" id="daily-elapsed">0:00</div>
          <div class="daily-attempts-count" id="daily-attempts">Attempts: 0</div>
        </div>
        <input type="text" id="daily-input" class="word-input" placeholder="Type your answer..."
          autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false"
          maxlength="7" style="text-transform:uppercase"
          onkeydown="if(event.key==='Enter')checkDailyAnswer()"
          oninput="document.getElementById('daily-attempts').textContent='Attempts: ${train.daily.attempts}'"/>
        <div id="daily-feedback" style="font-size:13px;min-height:20px;margin:6px 0"></div>
        <button class="train-start-btn" onclick="checkDailyAnswer();document.getElementById('daily-attempts').textContent='Attempts: '+train.daily.attempts">Check answer</button>
        <button class="bingo-skip-btn" onclick="giveUpDaily()">Give up — reveal answer</button>
      `}
    </div>`;
}

// ── CHALLENGE OR NOT ──────────────────────────────────────────────────────────
async function initCon() {
  await loadTrainWords();
  await loadInvalidWords();
  train.con.answered = false;
  newConWord();
}

function newConWord() {
  clearInterval(train.con.timerInterval);
  train.con.answered = false;
  train.con.timeLeft = 10;

  const useValid = Math.random() > 0.45; // slight bias toward valid

  if (useValid) {
    // Pick a believable 2-7 letter word
    const candidates = train.wordArray.filter(w => w.length >= 2 && w.length <= 7);
    train.con.word = candidates[Math.floor(Math.random() * candidates.length)];
    train.con.isValid = true;
  } else {
    // Use our curated invalid words list — these look like real words
    if (train.invalidWords.length > 0 && Math.random() > 0.3) {
      // Use curated invalid word
      train.con.word = train.invalidWords[Math.floor(Math.random() * train.invalidWords.length)];
      train.con.isValid = false;
    } else {
      // Generate a plausible-looking fake by corrupting a real word's pattern
      let attempts = 0;
      let fakeWord = '';
      while (attempts < 20) {
        const candidates = train.wordArray.filter(w => w.length >= 3 && w.length <= 7);
        const base = candidates[Math.floor(Math.random() * candidates.length)];
        const letters = base.split('');
        // Swap or change one letter in middle position
        const pos = Math.floor(letters.length / 2);
        const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
        const vowels = 'AEIOU'.split('');
        const isVowelPos = vowels.includes(letters[pos]);
        const pool = isVowelPos ? consonants : vowels;
        letters[pos] = pool[Math.floor(Math.random() * pool.length)];
        fakeWord = letters.join('');
        if (!train.wordList.has(fakeWord) && fakeWord.length >= 3) break;
        attempts++;
      }
      if (fakeWord && !train.wordList.has(fakeWord)) {
        train.con.word = fakeWord;
        train.con.isValid = false;
      } else {
        // Fallback to curated list
        train.con.word = train.invalidWords[Math.floor(Math.random() * train.invalidWords.length)] || 'BLORFT';
        train.con.isValid = false;
      }
    }
  }

  renderConUI();

  // Countdown timer
  train.con.timerInterval = setInterval(() => {
    train.con.timeLeft--;
    const el = document.getElementById('con-timer');
    if (el) { el.textContent = train.con.timeLeft+'s'; el.style.color = train.con.timeLeft<=3?'#E05252':'#F5A623'; }
    if (train.con.timeLeft <= 0) { clearInterval(train.con.timerInterval); answerCon(null); }
  }, 1000);
}

function answerCon(answer) {
  if (train.con.answered) return;
  clearInterval(train.con.timerInterval);
  train.con.answered = true;
  train.con.total++;
  train.stats.conTotal++;

  const correct = answer !== null && (answer === train.con.isValid);
  if (correct) {
    train.con.correct++;
    train.con.streak++;
    train.stats.conCorrect++;
    train.stats.conBestStreak = Math.max(train.stats.conBestStreak, train.con.streak);
  } else {
    train.con.streak = 0;
  }
  saveTrainStats();

  const fb = document.getElementById('con-feedback');
  const wordEl = document.getElementById('con-word');
  if (fb) {
    if (answer === null) { fb.textContent="⏱ Time's up!"; fb.style.color='#E05252'; }
    else if (correct) { fb.textContent='✓ Correct!'; fb.style.color='#4ADE80'; }
    else { fb.textContent=`✗ It's ${train.con.isValid?'VALID':'NOT VALID'}`; fb.style.color='#E05252'; }
  }
  if (wordEl) wordEl.style.color = train.con.isValid ? '#4ADE80' : '#E05252';

  const acc = train.stats.conTotal > 0 ? Math.round((train.stats.conCorrect/train.stats.conTotal)*100) : 0;
  const statsEl = document.getElementById('con-stats');
  if (statsEl) statsEl.textContent = `Streak: ${train.con.streak} · Accuracy: ${acc}%`;

  const actions = document.getElementById('con-actions');
  if (actions) actions.innerHTML = `<button class="train-start-btn" style="margin-top:12px" onclick="newConWord()">Next word →</button>`;
}

function renderConUI() {
  const container = document.getElementById('con-content');
  if (!container) return;
  const acc = train.stats.conTotal > 0 ? Math.round((train.stats.conCorrect/train.stats.conTotal)*100) : 0;
  container.innerHTML = `
    ${renderDictPicker('con')}
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
async function newHookWord() {
  await loadTrainWords();
  train.hook.revealed = false;
  train.hook.total++;
  train.stats.hookTotal = (train.stats.hookTotal || 0) + 1;

  // Pick 2-5 letter word, exclude likely plurals
  let word, attempts = 0;
  do {
    const candidates = train.wordArray.filter(w => w.length >= 2 && w.length <= 5);
    word = candidates[Math.floor(Math.random() * candidates.length)];
    attempts++;
  } while (isLikelyPlural(word) && attempts < 30);

  train.hook.word = word;
  const h = getHooks(word);
  train.hook.frontHooks = h.front;
  train.hook.backHooks = h.back;
  saveTrainStats();
  renderHookUI();
}

function revealHooks() {
  train.hook.revealed = true;
  renderHookUI();
}

function renderHookUI() {
  const container = document.getElementById('hook-content');
  if (!container) return;
  container.innerHTML = `
    ${renderDictPicker('hook')}
    <div class="hook-card">
      ${train.hook.word ? `
        <div class="hook-word-label">Word</div>
        <div class="hook-word">${train.hook.word}</div>
        <div class="hook-question">What letters can go before or after this word?</div>
        ${train.hook.revealed ? `
          <div class="hook-results">
            <div class="hook-section">
              <div class="hook-section-label">Front hooks (${train.hook.frontHooks.length})</div>
              <div class="hook-letters">${train.hook.frontHooks.length
                ? train.hook.frontHooks.map(l=>`<span class="hook-letter front">${l}+${train.hook.word}</span>`).join('')
                : '<span class="hook-none">None</span>'}</div>
            </div>
            <div class="hook-section" style="margin-top:12px">
              <div class="hook-section-label">Back hooks (${train.hook.backHooks.length})</div>
              <div class="hook-letters">${train.hook.backHooks.length
                ? train.hook.backHooks.map(l=>`<span class="hook-letter back">${train.hook.word}+${l}</span>`).join('')
                : '<span class="hook-none">None</span>'}</div>
            </div>
          </div>
          <button class="train-start-btn" style="margin-top:16px" onclick="newHookWord()">Next word →</button>
        ` : `
          <div class="bingo-actions" style="margin-top:16px">
            <button class="bingo-reveal-btn" onclick="revealHooks()">Reveal hooks</button>
            <button class="bingo-skip-btn" onclick="newHookWord()">Skip</button>
          </div>
        `}
      ` : `<button class="train-start-btn" onclick="newHookWord()">Start</button>`}
    </div>`;
}

// ── FLASHCARDS ────────────────────────────────────────────────────────────────
const FLASH_CATEGORIES = [
  { id: 'two', label: '2-letter words', desc: 'All valid 2-letter words', icon: '2️⃣',
    filter: w => w.length === 2 },
  { id: 'qunou', label: 'Q without U', desc: 'Play your Q without a U', icon: '🔡',
    filter: w => w.includes('Q') && !w.includes('U') && w.length <= 7 },
  { id: 'zwords', label: 'Z words (2-4)', desc: 'Short high-value Z words', icon: '⚡',
    filter: w => w.includes('Z') && w.length <= 4 },
  { id: 'jwords', label: 'J words (2-4)', desc: 'Short high-value J words', icon: '🎯',
    filter: w => w.includes('J') && w.length <= 4 },
  { id: 'xwords', label: 'X words (2-4)', desc: 'Short high-value X words', icon: '✖️',
    filter: w => w.includes('X') && w.length <= 4 },
  { id: 'voweldump', label: 'Vowel dumps', desc: '3-4 letter words with 3+ vowels', icon: '🔵',
    filter: w => w.length <= 4 && w.split('').filter(l=>'AEIOU'.includes(l)).length >= 3 },
  { id: 'bingostems', label: 'Bingo stems', desc: 'Common 6-letter bingo stems', icon: '🎰',
    filter: w => w.length === 6 && COMMON_BINGOS.some(b => b.startsWith(w.slice(0,5))) },
];

async function startFlashCategory(catId) {
  await loadTrainWords();
  const cat = FLASH_CATEGORIES.find(c => c.id === catId);
  if (!cat) return;

  const words = train.wordArray.filter(cat.filter);
  const shuffled = shuffle(words).slice(0, 50); // cap at 50 cards per session

  train.flash.category = cat;
  train.flash.cards = shuffled;
  train.flash.cardIndex = 0;
  train.flash.revealed = false;
  train.flash.knewIt = 0;
  train.flash.didntKnow = 0;
  train.flash.missedCards = [];
  train.flash.reviewing = false;
  train.stats.flashSessions++;
  saveTrainStats();

  renderFlashCard();
}

function renderFlashHome() {
  const container = document.getElementById('flash-content');
  if (!container) return;
  container.innerHTML = `
    ${renderDictPicker('flash')}
    <div class="flash-categories">
      ${FLASH_CATEGORIES.map(cat => `
        <div class="flash-cat-card" onclick="startFlashCategory('${cat.id}')">
          <div class="flash-cat-icon">${cat.icon}</div>
          <div class="flash-cat-info">
            <div class="flash-cat-title">${cat.label}</div>
            <div class="flash-cat-desc">${cat.desc}</div>
          </div>
          <i class="ti ti-chevron-right" style="color:var(--muted);flex-shrink:0"></i>
        </div>`).join('')}
    </div>`;
}

function renderFlashCard() {
  const container = document.getElementById('flash-content');
  if (!container) return;

  const cards = train.flash.reviewing ? train.flash.missedCards : train.flash.cards;
  const idx = train.flash.cardIndex;

  if (idx >= cards.length) {
    // Session complete
    if (!train.flash.reviewing && train.flash.missedCards.length > 0) {
      container.innerHTML = `
        <div class="flash-complete">
          <div class="flash-complete-icon">🔄</div>
          <div class="flash-complete-title">Round complete!</div>
          <div class="flash-complete-sub">
            Knew: ${train.flash.knewIt} · Missed: ${train.flash.missedCards.length}
          </div>
          <button class="train-start-btn" onclick="
            train.flash.reviewing=true;
            train.flash.cardIndex=0;
            train.flash.revealed=false;
            renderFlashCard();">Review missed words (${train.flash.missedCards.length})</button>
          <button class="bingo-skip-btn" onclick="renderFlashHome()">← Back to categories</button>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="flash-complete">
          <div class="flash-complete-icon">🎉</div>
          <div class="flash-complete-title">${train.flash.reviewing ? 'All caught up!' : 'Perfect round!'}</div>
          <div class="flash-complete-sub">You went through all ${train.flash.cards.length} cards in "${train.flash.category.label}"</div>
          <button class="train-start-btn" onclick="startFlashCategory('${train.flash.category.id}')">Study again</button>
          <button class="bingo-skip-btn" onclick="renderFlashHome()">← Back to categories</button>
        </div>`;
    }
    return;
  }

  const word = cards[idx];
  const hooks = getHooks(word);
  const pts = wordScore(word);
  train.flash.revealed = false;

  const total = cards.length;
  const progress = Math.round((idx / total) * 100);

  container.innerHTML = `
    <div class="flash-progress"><div class="flash-progress-bar" style="width:${progress}%"></div></div>
    <div class="flash-progress-label">${idx+1} / ${total} · ${train.flash.category.label}${train.flash.reviewing?' (Review)':''}</div>
    <div class="flash-card" id="flash-card-inner" onclick="revealFlashCard()">
      <div class="flash-card-word">${word}</div>
      <div class="flash-card-pts">${pts} pts</div>
      <div class="flash-card-reveal-hint" id="flash-hint">Tap to reveal hooks</div>
      <div id="flash-hooks" style="display:none">
        <div class="hook-results" style="margin-top:12px">
          <div class="hook-section-label">Front hooks (${hooks.front.length})</div>
          <div class="hook-letters" style="margin-bottom:10px">${hooks.front.length
            ? hooks.front.map(l=>`<span class="hook-letter front">${l}+${word}</span>`).join('')
            : '<span class="hook-none">None</span>'}</div>
          <div class="hook-section-label">Back hooks (${hooks.back.length})</div>
          <div class="hook-letters">${hooks.back.length
            ? hooks.back.map(l=>`<span class="hook-letter back">${word}+${l}</span>`).join('')
            : '<span class="hook-none">None</span>'}</div>
        </div>
      </div>
    </div>
    <div class="flash-actions" id="flash-actions" style="display:none">
      <button class="flash-btn knew" onclick="nextFlashCard(true)">✓ Knew it</button>
      <button class="flash-btn didnt" onclick="nextFlashCard(false)">✗ Didn't know</button>
    </div>
    <button class="bingo-skip-btn" style="margin-top:8px" onclick="renderFlashHome()">← Back to categories</button>`;
}

function revealFlashCard() {
  if (train.flash.revealed) return;
  train.flash.revealed = true;
  const hooks = document.getElementById('flash-hooks');
  const hint = document.getElementById('flash-hint');
  const actions = document.getElementById('flash-actions');
  if (hooks) hooks.style.display = 'block';
  if (hint) hint.style.display = 'none';
  if (actions) actions.style.display = 'flex';
}

function nextFlashCard(knew) {
  const cards = train.flash.reviewing ? train.flash.missedCards : train.flash.cards;
  if (knew) { train.flash.knewIt++; }
  else {
    train.flash.didntKnow++;
    if (!train.flash.reviewing) train.flash.missedCards.push(cards[train.flash.cardIndex]);
  }
  train.flash.cardIndex++;
  train.flash.revealed = false;
  saveTrainStats();
  renderFlashCard();
}

// ── STATS ─────────────────────────────────────────────────────────────────────
function renderStats() {
  const container = document.getElementById('stats-content');
  if (!container) return;
  const conAcc = train.stats.conTotal > 0
    ? Math.round((train.stats.conCorrect/train.stats.conTotal)*100) : 0;

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stats-card">
        <div class="stats-icon">🔤</div>
        <div class="stats-title">Bingo Trainer</div>
        <div class="stats-row"><span>Total solved</span><span>${train.stats.bingoSolved}</span></div>
        <div class="stats-row"><span>Best streak</span><span>${train.stats.bingoBestStreak}</span></div>
        <div class="stats-row"><span>Best time</span><span>${train.stats.bingoBestTime?train.stats.bingoBestTime+'s':'—'}</span></div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">📅</div>
        <div class="stats-title">Daily Puzzle</div>
        <div class="stats-row"><span>Total solved</span><span>${train.stats.dailySolved.length}</span></div>
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
        <div class="stats-row"><span>Total played</span><span>${train.stats.hookTotal||0}</span></div>
      </div>
      <div class="stats-card">
        <div class="stats-icon">🃏</div>
        <div class="stats-title">Flashcards</div>
        <div class="stats-row"><span>Sessions</span><span>${train.stats.flashSessions||0}</span></div>
      </div>
    </div>
    <button class="bingo-skip-btn" style="margin-top:16px;color:#E05252;border-color:#E05252"
      onclick="if(confirm('Reset all training stats?')){
        Object.assign(train.stats,{bingoSolved:0,bingoBestStreak:0,bingoBestTime:null,
        conCorrect:0,conTotal:0,conBestStreak:0,hookTotal:0,flashSessions:0,dailySolved:[],lastActive:null});
        saveTrainStats();renderStats();}">Reset stats</button>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initTrain() {
  loadTrainStats();
  loadTrainWords().catch(()=>{});
  loadInvalidWords().catch(()=>{});
}
