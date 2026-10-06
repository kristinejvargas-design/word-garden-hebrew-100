(() => {
  const STORAGE_KEY = "first100-hebrew-progress-v1";
  const SEED_URL = "https://seedscroll.app/?utm_source=hebrew-word-garden&utm_medium=flashcard&utm_campaign=first-100";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = readProgress();
  let words = [];
  let index = 0;
  let quizWord = null;
  let quizAnswered = false;
  let quizScore = 0;
  let quizTotal = 0;
  let lastQuizId = "";

  function readProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* Keep this session usable if storage is unavailable. */ }
    updateProgress();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function seedWordURL(word) {
    return `${SEED_URL}&utm_content=${encodeURIComponent(word.strongs)}`;
  }

  function updateProgress() {
    const total = words.length || 100;
    const reviewed = words.filter(word => state[word.strongs] && state[word.strongs].reviewedAt).length;
    const now = Date.now();
    const due = words.filter(word => {
      const record = state[word.strongs];
      return !record || !record.reviewedAt || (record.due || 0) <= now;
    }).length;
    const fresh = words.filter(word => !state[word.strongs] || !state[word.strongs].reviewedAt).length;
    const count = $("#known-count");
    const fill = $("#progress-fill");
    const bar = $("#progress-track");
    if (count) count.textContent = String(reviewed);
    if (fill) fill.style.width = `${total ? (reviewed / total) * 100 : 0}%`;
    if (bar) bar.setAttribute("aria-valuenow", String(reviewed));
    const dueLabel = $("#due-count");
    if (dueLabel) dueLabel.textContent = fresh === total ? `${fresh} new` : fresh ? `${Math.max(0, due - fresh)} due · ${fresh} new` : due ? `${due} due` : "All caught up";
    const quizScore = $("#quiz-score");
    if (quizScore) quizScore.textContent = `${quizScoreCount()} correct`;
  }

  function quizScoreCount() { return quizTotal ? `${quizScore}/${quizTotal}` : "0"; }

  function recordFor(word) { return state[word.strongs] || null; }

  function showCard() {
    const word = words[index];
    if (!word) return;
    const record = recordFor(word);
    $("#card-position").textContent = `${String(index + 1).padStart(2, "0")} / ${String(words.length).padStart(2, "0")}`;
    $("#deck-label").textContent = !record ? "A NEW WORD" : (record.due || 0) <= Date.now() ? "READY TO GROW AGAIN" : "MEET ANOTHER WORD";
    $("#card-hebrew").textContent = word.hebrew;
    $("#card-transliteration").textContent = word.transliteration;
    $("#card-gloss").textContent = word.gloss;
    $("#card-strong").textContent = `STRONG’S ${word.strongs}`;
    $("#card-frequency").textContent = `${word.count.toLocaleString()} occurrences in the Hebrew Bible`;
    $("#card-verse").textContent = `“${word.example.text}”`;
    $("#card-reference").textContent = `KING JAMES VERSION · ${word.example.reference}`;
    $("#word-seed-link").href = seedWordURL(word);
    $("#card-front").hidden = false;
    $("#card-back").hidden = true;
    $("#rating-row").hidden = true;
    updateProgress();
  }

  function moveCard(direction) {
    if (!words.length) return;
    index = (index + direction + words.length) % words.length;
    showCard();
  }

  function revealCard() {
    if (!words.length) return;
    $("#card-front").hidden = true;
    $("#card-back").hidden = false;
    $("#rating-row").hidden = false;
    $("#announcer").textContent = `${words[index].gloss}. ${words[index].example.reference}.`;
  }

  function rateCard(rating) {
    const word = words[index];
    if (!word) return;
    const previous = state[word.strongs] || { reps: 0, interval: 0 };
    const reps = previous.reps || 0;
    const now = Date.now();
    let days;
    if (rating === "again") {
      state[word.strongs] = { reps: 0, interval: 0, due: now + 60000, reviewedAt: now };
    } else {
      if (rating === "hard") days = reps === 0 ? 1 : Math.max(1, Math.ceil((previous.interval || 1) * 1.2));
      else if (rating === "good") days = reps === 0 ? 3 : reps === 1 ? 6 : Math.max(7, Math.round((previous.interval || 3) * 2));
      else days = reps === 0 ? 5 : Math.max(8, Math.round((previous.interval || 5) * 2.5));
      state[word.strongs] = { reps: reps + 1, interval: days, due: now + days * 86400000, reviewedAt: now };
    }
    saveProgress();
    const dueSoon = words.findIndex((candidate, candidateIndex) => {
      if (candidateIndex === index) return false;
      const item = state[candidate.strongs];
      return !item || !item.reviewedAt || (item.due || 0) <= Date.now();
    });
    if (dueSoon >= 0) index = dueSoon;
    else if (words.length > 1) index = (index + 1) % words.length;
    showCard();
  }

  function setView(viewId) {
    $$(".practice-view").forEach(view => { view.hidden = view.id !== viewId; });
    $$(".mode-tab").forEach(tab => {
      const active = tab.dataset.view === viewId;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    if (viewId === "list-view") renderWordList($("#word-search").value);
    if (viewId === "quiz-view" && !quizWord) nextQuestion();
  }

  function plainGloss(gloss) {
    const cleaned = String(gloss || "").replace(/\s+/g, " ").trim();
    return cleaned.length > 160 ? `${cleaned.slice(0, 157).replace(/[ ,;:]+$/, "")}…` : cleaned;
  }

  function renderWordList(query = "") {
    const body = $("#word-rows");
    if (!body) return;
    const needle = query.trim().toLocaleLowerCase();
    const found = words.filter(word => [word.hebrew, word.transliteration, word.gloss, word.strongs, word.example.reference].join(" ").toLocaleLowerCase().includes(needle));
    $("#list-result-count").textContent = `${found.length} ${found.length === 1 ? "word" : "words"}`;
    body.replaceChildren();
    for (const word of found) {
      const row = document.createElement("tr");
      row.innerHTML = `<td class="table-rank">${word.rank}</td><td class="table-hebrew" lang="he" dir="rtl">${escapeHTML(word.hebrew)}</td><td>${escapeHTML(word.transliteration)}</td><td title="${escapeHTML(word.gloss)}">${escapeHTML(plainGloss(word.gloss))}</td><td class="table-count">${word.count.toLocaleString()}</td><td><a class="table-study" href="${escapeHTML(seedWordURL(word))}" target="_blank" rel="noopener" aria-label="Study ${escapeHTML(word.hebrew)} in Seed Scroll">↗</a></td>`;
      body.append(row);
    }
  }

  function shuffle(items) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function nextQuestion() {
    if (!words.length) return;
    const pool = words.filter(word => word.strongs !== lastQuizId);
    quizWord = pool[Math.floor(Math.random() * pool.length)] || words[0];
    lastQuizId = quizWord.strongs;
    quizAnswered = false;
    $("#quiz-prompt").textContent = plainGloss(quizWord.gloss);
    $("#quiz-feedback").textContent = "Choose the Hebrew word that best matches the gloss.";
    $("#quiz-feedback").className = "quiz-feedback";
    $("#next-question").textContent = "Skip this question →";
    $("#quiz-choices").replaceChildren();
    const choices = shuffle([quizWord, ...shuffle(words.filter(word => word.strongs !== quizWord.strongs)).slice(0, 3)]);
    for (const choice of choices) {
      const button = document.createElement("button");
      button.className = "quiz-choice";
      button.type = "button";
      button.dataset.strongs = choice.strongs;
      button.innerHTML = `<span class="choice-hebrew" lang="he" dir="rtl">${escapeHTML(choice.hebrew)}</span><span class="choice-translit">${escapeHTML(choice.transliteration)}</span>`;
      button.addEventListener("click", () => answerQuestion(button, choice));
      $("#quiz-choices").append(button);
    }
    updateProgress();
  }

  function answerQuestion(button, choice) {
    if (!quizWord || quizAnswered) return;
    quizAnswered = true;
    quizTotal += 1;
    const correct = choice.strongs === quizWord.strongs;
    if (correct) quizScore += 1;
    $$(".quiz-choice").forEach(option => {
      option.disabled = true;
      if (option.dataset.strongs === quizWord.strongs) option.classList.add("is-correct");
    });
    if (!correct) button.classList.add("is-wrong");
    const feedback = $("#quiz-feedback");
    feedback.textContent = correct
      ? `Yes — ${quizWord.hebrew} (${quizWord.transliteration}), Strong’s ${quizWord.strongs}.`
      : `The answer is ${quizWord.hebrew} (${quizWord.transliteration}), Strong’s ${quizWord.strongs}.`;
    feedback.classList.add(correct ? "is-right" : "is-wrong-text");
    $("#next-question").textContent = "Next question →";
    updateProgress();
  }

  function initMenu() {
    const toggle = $(".menu-toggle");
    const menu = $("#mobile-menu");
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.hidden = !open;
    });
    menu.addEventListener("click", event => {
      if (event.target.closest("a")) {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      }
    });
  }

  function initControls() {
    $$(".mode-tab").forEach(tab => tab.addEventListener("click", () => setView(tab.dataset.view)));
    $("#reveal-card").addEventListener("click", revealCard);
    $("#card-next").addEventListener("click", () => moveCard(1));
    $("#card-prev").addEventListener("click", () => moveCard(-1));
    $$(".rating-button").forEach(button => button.addEventListener("click", () => rateCard(button.dataset.rating)));
    $("#next-question").addEventListener("click", () => nextQuestion());
    $("#word-search").addEventListener("input", event => renderWordList(event.target.value));
    $("#reset-progress").addEventListener("click", () => {
      if (!Object.keys(state).length || !window.confirm("Clear the review schedule saved on this device?")) return;
      Object.keys(state).forEach(key => delete state[key]);
      saveProgress();
      index = 0;
      showCard();
    });
    $$('a[href="#wordbank"]').forEach(link => link.addEventListener("click", event => {
      event.preventDefault();
      setView("list-view");
      $("#practice").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    document.addEventListener("keydown", event => {
      if (event.target.matches("input, textarea, select, [contenteditable='true']") || event.target.closest("button, a, summary")) return;
      if (event.code === "Space" && !$("#cards-view").hidden) {
        event.preventDefault();
        if (!$("#card-back").hidden) return;
        revealCard();
      } else if (event.key === "ArrowRight" && !$("#cards-view").hidden) moveCard(1);
      else if (event.key === "ArrowLeft" && !$("#cards-view").hidden) moveCard(-1);
      else if (!$("#rating-row").hidden && /^[1-4]$/.test(event.key)) rateCard(["again", "hard", "good", "easy"][Number(event.key) - 1]);
    });
    initMenu();
  }

  async function start() {
    initControls();
    try {
      const response = await fetch("./data/words.json", { cache: "force-cache" });
      if (!response.ok) throw new Error(`Vocabulary request failed (${response.status})`);
      words = await response.json();
      if (!Array.isArray(words) || words.length !== 100) throw new Error("Vocabulary file should contain 100 entries.");
      showCard();
      renderWordList();
      if (!$("#quiz-view").hidden && !quizWord) nextQuestion();
      updateProgress();
      if (window.location.hash === "#wordbank") setView("list-view");
      document.documentElement.classList.add("is-ready");
    } catch (error) {
      $("#card-hebrew").textContent = "Could not load the word garden.";
      $("#card-transliteration").textContent = "Check your connection and refresh to try again.";
      $("#reveal-card").disabled = true;
      $("#announcer").textContent = error.message;
    }
  }

  start();
})();
