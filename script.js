// === Inicializace ===
let questions = [];
let current = 0;
let lives = 3;
let userName = "";
let score = 0;

// === DOM Elementy ===
const sentenceBox = document.getElementById("sentenceBox");
const wordBank = document.getElementById("wordBank");
const result = document.getElementById("result");
const livesDisplay = document.getElementById("lives");
const progressBar = document.getElementById("progressBar");
const scoreDisplay = document.getElementById("score");
const previewButton = document.getElementById("showPreview");
const previewFrame = document.getElementById("previewFrame");

function startGame() {
  const input = document.getElementById("username").value.trim();
  if (!input) return alert("Zadej své jméno!");
  userName = input;
  document.getElementById("welcome").style.display = "none";
  document.getElementById("quiz").style.display = "block";
  fetch("data.json")
    .then(res => res.json())
    .then(data => {
      questions = data;
      renderQuestion();
    });
}


// 🐦 Spusť animaci pro kvíz
animaceQuiz = lottie.loadAnimation({
  container: document.getElementById("pstrouskoQuiz"),
  renderer: "svg",
  loop: true,
  autoplay: true,
  path: "pstros.json"
});

fetch("data.json")
  .then(res => res.json())
  .then(data => {
    questions = data;
    renderQuestion();
});


function renderQuestion() {
  const q = questions[current];
  document.getElementById("info").textContent = q.info;
  document.getElementById("question").textContent = q.question;
  result.textContent = "";
  previewButton.style.display = "inline-block";
  previewFrame.style.display = "none";

  let content = q.sentence
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/ /g, '&nbsp;');

  let dropIndex = 0;
  sentenceBox.innerHTML = `<code>${content.replace(/__+/g, () =>
    `<span class="drop-zone" data-index="${dropIndex++}" data-value="" ondragover="allowDrop(event)" ondrop="drop(event)">...</span>`
  )}</code>`;

  wordBank.innerHTML = "";
  q.options.forEach(opt => {
    const btn = document.createElement("div");
    btn.className = "word";
    btn.textContent = opt;
    btn.draggable = true;
    btn.ondragstart = e => e.dataTransfer.setData("text/plain", opt);
    wordBank.appendChild(btn);
  });

  progressBar.style.width = `${(current / questions.length) * 100}%`;
}

function allowDrop(ev) {
  ev.preventDefault();
}

function drop(ev) {
  ev.preventDefault();
  const tag = ev.dataTransfer.getData("text").trim();
  ev.target.textContent = tag;
  ev.target.setAttribute("data-value", tag);
}

function osloveniJmenem(name) {
  if (name.endsWith("a")) return name.slice(0, -1) + "o";
  if (name.endsWith("ek")) return name.slice(0, -2) + "ku";
  if (name.endsWith("aš")) return name.slice(0, -2) + "ši";
  return name + "e";
}

function checkAnswer() {
  const q = questions[current];
  const dropZones = document.querySelectorAll(".drop-zone");
  const values = Array.from(dropZones).map(z => (z.getAttribute("data-value") || z.textContent).toLowerCase().trim());

  let correct;
  if (Array.isArray(q.correct)) {
    const countPlaceholders = (q.sentence.match(/__+/g) || []).length;
    const expected = [];
    let i = 0;
    while (expected.length < countPlaceholders) {
      expected.push(q.correct[i % q.correct.length].toLowerCase().trim());
      i++;
    }
    correct = expected;
  } else {
    correct = Array.from(dropZones).map(() => q.correct.toLowerCase().trim());
  }

  const isCorrect = values.length === correct.length &&
    values.every((val, idx) => val === correct[idx]);

  if (!checkAnswer.correctStreak) checkAnswer.correctStreak = 0;

  if (isCorrect) {
    score += 5;
    checkAnswer.correctStreak++;
    if (checkAnswer.correctStreak >= 5 && lives < 6) {
      lives++;
      animateLives();
      checkAnswer.correctStreak = 0;
    }
    updateUI("success");
    blinkThenNext();
  } else {
    score = Math.max(0, score - 10);
    lives--;
    checkAnswer.correctStreak = 0;
    animateLives();
    updateUI("fail");
    if (lives === 0) {
      const osloveny = osloveniJmenem(userName);
      result.textContent = `💀 Konec hry. Zkus to znovu, ${osloveny}.`;
      result.style.color = "black";
    }
  }
}

function updateUI(state) {
  const osloveny = osloveniJmenem(userName);
  if (state === "success") {
    scoreDisplay.textContent = score + " bodů";
    scoreDisplay.style.animation = "none";
    void scoreDisplay.offsetWidth;
    scoreDisplay.style.animation = "pulse 0.3s ease-in-out";
    result.textContent = `✅ Výborně, ${osloveny}!`;
    result.style.color = "green";
  } else {
    livesDisplay.innerHTML = "❤️".repeat(lives) + ` <span class="score" id="score">${score} bodů</span>`;
    result.textContent = `❌ Špatně. Zbývá ${lives} ${lives === 1 ? "život" : "životy"}.`;
    result.style.color = "red";
  }
  scoreDisplay.textContent = `${score} bodů`;
  livesDisplay.innerHTML = "❤️".repeat(lives) + ` <span class="score" id="score">${score} bodů</span>`;
}

function animateLives() {
  const livesEl = livesDisplay;
  livesEl.style.transition = "transform 0.3s ease-in-out";
  livesEl.style.transform = "scale(0.2)";
  setTimeout(() => {
    livesEl.style.transform = "scale(1.2)";
    setTimeout(() => {
      livesEl.style.transform = "scale(1)";
    }, 150);
  }, 100);
}

function showPreview() {
  const q = questions[current];
  const dropZones = document.querySelectorAll(".drop-zone");
  const values = Array.from(dropZones).map(z => (z.getAttribute("data-value") || z.textContent).toLowerCase().trim());

  const correct = Array.isArray(q.correct)
    ? q.correct.map(c => c.toLowerCase().trim())
    : Array(dropZones.length).fill(q.correct.toLowerCase().trim());

  const isCorrect = values.length === correct.length &&
    values.every((val, idx) => val === correct[idx]);

  if (!isCorrect) {
    result.textContent = "❌ Nejprve odpověz správně, teprve potom uvidíš náhled.";
    result.style.color = "red";
    previewFrame.style.display = "none";
    return;
  }

  let dropIndex = 0;
  let html = q.sentence.replace(/<__([^>]*)>|<\/__>/g, (match, attrs) => {
    const tag = values[dropIndex++];
    return match.startsWith("</") ? `</${tag}>` : `<${tag}${attrs ? ' ' + attrs.trim() : ''}>`;
  });

  html = html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

  previewFrame.style.display = "block";
  previewFrame.contentDocument.open();
  previewFrame.contentDocument.write(`<!DOCTYPE html><html><body style="font-family:sans-serif; padding:1em;">${html}</body></html>`);
  previewFrame.contentDocument.close();
}

function blinkThenNext() {
  animace.loop = false;
  animace.playSegments([530, 550], true);

  animace.addEventListener('complete', function onBlink() {
    animace.removeEventListener('complete', onBlink);
    animace.loop = true;

    current++;
    if (current < questions.length) {
      renderQuestion();
    } else {
      showSummary();
    }
  });
}

// === Lottie inicializace pštrosa ===
let animace;

document.addEventListener("DOMContentLoaded", () => {
  animace = lottie.loadAnimation({
    container: document.getElementById("pstrousko"),
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: "pstros.json"
  });
});

// === Závěrečné shrnutí ===
function showSummary() {
  document.getElementById("quiz").style.display = "none";
  document.getElementById("summary").style.display = "block";
  const osloveny = osloveniJmenem(userName);
  document.getElementById("summaryHeading").textContent = `🎉 GRATULUJI, ${osloveny.toUpperCase()}!`;
  document.getElementById("finalScore").textContent = `TVŮJ VÝSLEDEK: ${score.toString().toUpperCase()} BODŮ`;
}

// === Tlačítko na vytvoření screenshotu ===
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.createElement("button");
  btn.textContent = "Uložit výsledek jako obrázek";
  btn.style.marginTop = "20px";
  btn.onclick = () => {
    html2canvas(document.getElementById("summary")).then(canvas => {
      const link = document.createElement('a');
      link.download = `webolingo-${userName}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };
  document.getElementById("summary").appendChild(btn);
});