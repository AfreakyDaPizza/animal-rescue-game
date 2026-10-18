// 問答：撞到障礙物或者俾 Boss 捉到，遊戲停住，答完先可以繼續
// IQ 夠高會幫你刪走錯嘅答案

import { QUESTIONS } from './data/questions.js';
import { VOCAB } from './data/vocab.js'; // 📚 學校生字題
import { VOCAB_CHANCE } from './data/balance.js';
import { short } from './format.js';
import { BOSSES } from './data/balance.js';
import { state } from './state.js';
import { play } from './sound.js';

const $ = (id) => document.getElementById(id);
const recent = []; // 最近問過嘅題目，避免一直重複

let current = null; // { resolve, correct, choices, answered, openedAt }
const INPUT_DELAY = 800; // 彈出嚟頭 0.8 秒唔收掣，避免逃走時撳住嘅掣即刻答咗

export const isQuizOpen = () => current !== null;

function pickQuestion(biome, hard) {
  let pool = QUESTIONS.filter((q) => q.biome === biome && !!q.hard === hard);
  if (Math.random() < VOCAB_CHANCE) pool = VOCAB.filter((q) => !!q.hard === hard).map((q) => ({ ...q, vocab: true, key: q.q })); // 有時問學校生字題
  if (!pool.length) pool = QUESTIONS.filter((q) => !!q.hard === hard); // 新生態區（例如 Biome 7）未有題目：用全部
  const fresh = pool.filter((q) => !recent.includes(q.key ?? q));
  if (fresh.length) pool = fresh;
  const q = pool[Math.floor(Math.random() * pool.length)];
  recent.push(q.key ?? q);
  if (recent.length > 12) recent.shift();
  return q;
}

const shuffle = (list) => list.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

// IQ 幫手：夠呢個生態區建議 IQ 刪 1 個錯答案，夠 3 倍刪 2 個
function wrongAnswersToRemove(biome) {
  const needed = BOSSES[biome].iq;
  if (state.iq >= needed * 3) return 2;
  if (state.iq >= needed) return 1;
  return 0;
}

// 問一條問題，答完（撳 Continue）先 resolve(true/false)
export function askQuestion({ title, biome, hard = false }) {
  const q = pickQuestion(biome, hard);
  const correct = q.answers[0];
  const removeCount = wrongAnswersToRemove(biome);
  const wrong = shuffle(q.answers.slice(1)).slice(removeCount);
  const choices = shuffle([correct, ...wrong]);

  $('quiz-title').textContent = q.vocab ? `📚 Word Power! ${title}` : title;
  $('quiz-question').textContent = q.q;
  $('quiz-iq').textContent = removeCount
    ? `🧠 Your IQ (${short(Math.floor(state.iq))}) removed ${removeCount} wrong answer${removeCount > 1 ? 's' : ''}!`
    : `🧠 Tip: train IQ to ${short(BOSSES[biome].iq)} at the Student Table to get help here.`;
  $('quiz-result').hidden = true;
  $('quiz-continue').hidden = true;

  const list = $('quiz-answers');
  list.innerHTML = '';
  choices.forEach((text, i) => {
    const button = document.createElement('button');
    button.innerHTML = `<kbd>${i + 1}</kbd> ${text}`;
    button.addEventListener('click', () => answer(i));
    list.appendChild(button);
  });

  $('quiz').hidden = false;
  return new Promise((resolve) => {
    current = { resolve, correct, choices, answered: null, openedAt: performance.now() };
  });
}

const tooSoon = () => performance.now() - current.openedAt < INPUT_DELAY;

function answer(i) {
  if (!current || current.answered !== null || tooSoon()) return;
  const isRight = current.choices[i] === current.correct;
  current.answered = isRight;
  play(isRight ? 'right' : 'wrong');
  [...$('quiz-answers').children].forEach((button, j) => {
    button.disabled = true;
    if (current.choices[j] === current.correct) button.classList.add('right');
    else if (j === i) button.classList.add('wrong');
  });
  const result = $('quiz-result');
  result.hidden = false;
  result.className = isRight ? 'right' : 'wrong';
  result.textContent = isRight ? '✅ Correct! Great job!' : `❌ Not quite. The answer was: ${current.correct}`;
  $('quiz-continue').hidden = false;
}

// 撳 Continue：收埋視窗，話返俾遊戲知答啱定錯
export function finishQuiz() {
  if (!current || current.answered === null || tooSoon()) return false;
  const { resolve, answered } = current;
  current = null;
  $('quiz').hidden = true;
  resolve(answered);
  return true;
}

// 1–4 揀答案（Enter 繼續喺 main.js）
window.addEventListener('keydown', (e) => {
  if (!current) return;
  const n = Number(e.key);
  if (n >= 1 && n <= current.choices.length) answer(n - 1);
});
