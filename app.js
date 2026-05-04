const STORAGE_KEY = "c2-vocab-progress-v1";
const phrases = Array.isArray(window.C2_PHRASES) ? window.C2_PHRASES : [];

const state = {
  category: "Todas",
  sessionSize: 20,
  mode: "practice",
  queue: [],
  index: 0,
  answers: {},
  streak: 0,
};

const elements = {
  category: document.querySelector("#category-select"),
  sessionSize: document.querySelector("#session-size"),
  modeButtons: [...document.querySelectorAll(".segment")],
  newSession: document.querySelector("#new-session"),
  resetProgress: document.querySelector("#reset-progress"),
  bankCount: document.querySelector("#bank-count"),
  correct: document.querySelector("#score-correct"),
  total: document.querySelector("#score-total"),
  streak: document.querySelector("#score-streak"),
  position: document.querySelector("#question-position"),
  count: document.querySelector("#question-count"),
  progress: document.querySelector("#session-progress"),
  promptCategory: document.querySelector("#prompt-category"),
  promptText: document.querySelector("#prompt-text"),
  hint: document.querySelector("#hint-button"),
  form: document.querySelector("#answer-form"),
  input: document.querySelector("#answer-input"),
  feedback: document.querySelector("#feedback"),
  prev: document.querySelector("#prev-question"),
  next: document.querySelector("#next-question"),
};

function normalise(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function save() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      category: state.category,
      sessionSize: state.sessionSize,
      mode: state.mode,
      queue: state.queue,
      index: state.index,
      answers: state.answers,
      streak: state.streak,
    }),
  );
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.queue)) return false;
    Object.assign(state, saved);
    return state.queue.length > 0;
  } catch {
    return false;
  }
}

function buildCategories() {
  const categories = [...new Set(phrases.map((item) => item.c))].sort();
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    elements.category.appendChild(option);
  }
  elements.bankCount.textContent = phrases.length.toString();
}

function createSession() {
  const filtered =
    state.category === "Todas"
      ? phrases
      : phrases.filter((item) => item.c === state.category);
  state.queue = shuffle(filtered)
    .slice(0, Math.min(state.sessionSize, filtered.length))
    .map((item) => phrases.indexOf(item));
  state.index = 0;
  state.answers = {};
  state.streak = 0;
  save();
  render();
}

function currentItem() {
  return phrases[state.queue[state.index]];
}

function renderPromptText(item) {
  elements.promptText.textContent = "";
  const parts = item.f.split(item.s);

  if (parts.length === 1) {
    elements.promptText.textContent = item.f;
    return;
  }

  elements.promptText.append(document.createTextNode(parts[0]));
  const target = document.createElement("span");
  target.className = "target";
  target.textContent = item.s;
  elements.promptText.append(target);
  elements.promptText.append(document.createTextNode(parts.slice(1).join(item.s)));
}

function renderFeedback(answer) {
  elements.feedback.className = "feedback";

  if (!answer) {
    elements.feedback.textContent = "Sustituye la expresión subrayada por una alternativa de registro C2.";
    return;
  }

  const item = currentItem();
  if (answer.result === "correct") {
    elements.feedback.classList.add("correct");
    elements.feedback.textContent = `Correcto: ${item.p}.`;
  } else if (answer.result === "close") {
    elements.feedback.classList.add("close");
    elements.feedback.textContent = `Casi. La opción esperada es "${item.p}".`;
  } else {
    elements.feedback.classList.add("wrong");
    elements.feedback.textContent = `Respuesta esperada: ${item.p}.`;
  }
}

function renderScores() {
  const answered = Object.values(state.answers);
  const correct = answered.filter((answer) => answer.result === "correct").length;
  elements.correct.textContent = correct.toString();
  elements.total.textContent = answered.length.toString();
  elements.streak.textContent = state.streak.toString();
}

function renderControls() {
  elements.category.value = state.category;
  elements.sessionSize.value = state.sessionSize.toString();
  for (const button of elements.modeButtons) {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  }
}

function render() {
  if (!phrases.length) {
    elements.promptText.textContent = "No se han podido cargar las frases.";
    return;
  }

  if (!state.queue.length) createSession();

  const item = currentItem();
  const key = state.queue[state.index];
  const answer = state.answers[key];
  const progress = ((state.index + 1) / state.queue.length) * 100;

  elements.position.textContent = (state.index + 1).toString();
  elements.count.textContent = state.queue.length.toString();
  elements.progress.value = progress;
  elements.promptCategory.textContent = item.c;
  elements.input.value = answer?.value || "";
  elements.input.disabled = Boolean(answer && state.mode === "practice");
  elements.form.querySelector("button").disabled = elements.input.disabled;
  elements.prev.disabled = state.index === 0;
  elements.next.disabled = state.index === state.queue.length - 1;

  renderPromptText(item);
  renderFeedback(answer);
  renderScores();
  renderControls();

  if (!elements.input.disabled) {
    elements.input.focus();
  }
}

function checkAnswer(value) {
  const item = currentItem();
  const expected = normalise(item.p);
  const received = normalise(value);

  if (!received) return;

  let result = "wrong";
  if (received === expected || received === expected.replace(/^(el|la|los|las)\s+/, "")) {
    result = "correct";
    state.streak += 1;
  } else if (expected.includes(received) && received.length >= 4) {
    result = "close";
    state.streak = 0;
  } else {
    state.streak = 0;
  }

  state.answers[state.queue[state.index]] = { value, result };
  save();
  render();
}

function showHint() {
  const item = currentItem();
  const hint = item.p.length <= 4 ? item.p[0] : `${item.p.slice(0, 3)}...`;
  elements.feedback.className = "feedback";
  elements.feedback.textContent = `Pista: empieza por "${hint}".`;
}

function goTo(offset) {
  state.index = Math.max(0, Math.min(state.queue.length - 1, state.index + offset));
  save();
  render();
}

function bindEvents() {
  elements.category.addEventListener("change", () => {
    state.category = elements.category.value;
    createSession();
  });

  elements.sessionSize.addEventListener("change", () => {
    state.sessionSize = Number(elements.sessionSize.value);
    createSession();
  });

  for (const button of elements.modeButtons) {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      save();
      render();
    });
  }

  elements.newSession.addEventListener("click", createSession);
  elements.resetProgress.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    state.answers = {};
    state.streak = 0;
    createSession();
  });
  elements.hint.addEventListener("click", showHint);
  elements.prev.addEventListener("click", () => goTo(-1));
  elements.next.addEventListener("click", () => goTo(1));
  elements.form.addEventListener("submit", (event) => {
    event.preventDefault();
    checkAnswer(elements.input.value);
  });
}

buildCategories();
bindEvents();
if (!load()) createSession();
render();
