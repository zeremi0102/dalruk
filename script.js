const monthLabel = document.getElementById("monthLabel");
const monthView = document.getElementById("monthView");
const agendaView = document.getElementById("agendaView");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const memoInput = document.getElementById("memoInput");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const addTaskButton = document.getElementById("addTaskButton");
const toggleViewButton = document.getElementById("toggleViewButton");
const personalityButton = document.getElementById("personalityButton");
const personalityPanel = document.getElementById("personalityPanel");
const currentPersonalityLabel = document.getElementById("currentPersonalityLabel");
const speechText = document.getElementById("speechText");
const characterImage = document.getElementById("characterImage");
const characterUpload = document.getElementById("characterUpload");
const autoBehaviorToggle = document.getElementById("autoBehaviorToggle");
const actionButtons = document.querySelectorAll(".action-button");
const appViewport = document.getElementById("appViewport");
const appFrame = document.getElementById("appFrame");
const appShell = document.getElementById("appShell");

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const storageKeys = {
  notes: "character-calendar-notes",
  image: "character-calendar-image",
  personality: "character-calendar-personality",
  autoPlay: "character-calendar-autoplay"
};

const personalityLabels = {
  friendly: "다정함",
  playful: "장난기",
  calm: "차분함",
  energetic: "활발함"
};

const actionLines = {
  1: ["간식을 조심스럽게 건네받고 기뻐해요.", "고마워요. 오늘도 함께해서 든든해요."],
  2: ["작은 점프를 하며 반겨요.", "좋아요. 지금 바로 움직여볼게요!"],
  3: ["달력을 바라보며 중요한 날을 확인해요.", "오늘 체크해야 할 일을 같이 정리해볼까요?"],
  4: ["메모를 힐끗 보고 고개를 끄덕여요.", "기록해두면 나중에 더 편해질 거예요."],
  5: ["살짝 장난스러운 포즈를 취해요.", "후후, 이 버튼은 분위기를 바꾸는 용도 같네요."],
  6: ["차분하게 숨을 고르고 사용자를 바라봐요.", "천천히 해도 괜찮아요. 하나씩 끝내봐요."]
};

const personalityBehaviors = {
  friendly: [
    "오늘도 무리하지 않게 차근차근 해봐요.",
    "선택한 날짜에 작은 목표 하나만 추가해도 충분해요.",
    "잘하고 있어요. 필요한 일정이 있으면 바로 적어둘까요?"
  ],
  playful: [
    "몰래 응원 중이에요. 오늘의 체크리스트를 깨보자고요!",
    "지금 버튼 하나 눌러서 제 반응을 더 봐도 재밌을 거예요.",
    "일정 정리도 게임처럼 하면 꽤 신나요."
  ],
  calm: [
    "메모를 천천히 정리하면 하루가 훨씬 선명해져요.",
    "우선순위가 높은 일부터 적어보는 건 어떨까요?",
    "조용히 다음 일정을 준비해두고 있을게요."
  ],
  energetic: [
    "좋아요, 오늘 할 일을 빠르게 쌓아봅시다!",
    "한 칸씩 채워갈수록 진짜 진도가 보여요.",
    "새 일정이 생기면 바로바로 기록해요!"
  ]
};

let currentDate = new Date();
let selectedDate = formatDateKey(new Date());
let isAgendaMode = false;
let autoBehaviorTimer = null;
let notesByDate = loadJson(storageKeys.notes, {});
let scaleFrame = null;

restoreCharacterState();
bindEvents();
renderCalendar();
renderSelectedDate();
scheduleAutoBehavior();
updateViewportScale();

function bindEvents() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    renderCalendar();
  });

  toggleViewButton.addEventListener("click", () => {
    isAgendaMode = !isAgendaMode;
    monthView.classList.toggle("hidden", isAgendaMode);
    agendaView.classList.toggle("hidden", !isAgendaMode);
    toggleViewButton.textContent = isAgendaMode ? "캘린더 보기로 전환" : "표 보기로 전환";
    queueViewportScale();
  });

  memoInput.addEventListener("input", () => {
    const entry = getEntryForSelectedDate();
    entry.memo = memoInput.value;
    persistNotes();
    renderCalendar();
  });

  addTaskButton.addEventListener("click", addTask);
  taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTask();
    }
  });

  personalityButton.addEventListener("click", () => {
    personalityPanel.classList.toggle("hidden");
    queueViewportScale();
  });

  personalityPanel.addEventListener("change", (event) => {
    const value = event.target.value;
    if (!value) {
      return;
    }
    localStorage.setItem(storageKeys.personality, value);
    currentPersonalityLabel.textContent = personalityLabels[value];
    personalityPanel.classList.add("hidden");
    speakRandomBehavior("personality");
    scheduleAutoBehavior();
  });

  autoBehaviorToggle.addEventListener("change", () => {
    localStorage.setItem(storageKeys.autoPlay, String(autoBehaviorToggle.checked));
    scheduleAutoBehavior();
  });

  characterUpload.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    characterImage.src = dataUrl;
    localStorage.setItem(storageKeys.image, dataUrl);
    triggerCharacterReaction("새 캐릭터 이미지로 바뀌었어요. 앞으로 이 모습으로 함께할게요.");
    queueViewportScale();
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const [, line] = actionLines[action] || [];
      triggerCharacterReaction(line || "새로운 상호작용을 준비 중이에요.");
    });
  });

  window.addEventListener("resize", queueViewportScale);
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthLabel.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startOffset);

  const weekdayHtml = `<div class="weekdays">${weekdays.map((day) => `<div class="weekday">${day}</div>`).join("")}</div>`;
  const daysHtml = [];

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateKey = formatDateKey(date);
    const entry = notesByDate[dateKey];
    const isCurrentMonth = date.getMonth() === month;
    const preview = buildPreview(entry);

    daysHtml.push(`
      <button class="calendar-day ${isCurrentMonth ? "" : "other-month"} ${dateKey === selectedDate ? "selected" : ""} ${isToday(date) ? "today" : ""}" data-date="${dateKey}">
        <div class="day-number">${date.getDate()}</div>
        <div class="day-preview">${preview}</div>
      </button>
    `);
  }

  monthView.innerHTML = `${weekdayHtml}<div class="calendar-grid">${daysHtml.join("")}</div>`;
  monthView.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => selectDate(button.dataset.date));
  });

  renderAgendaView(year, month);
  queueViewportScale();
}

function renderAgendaView(year, month) {
  const totalDays = new Date(year, month + 1, 0).getDate();
  const rows = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const entry = notesByDate[dateKey];
    rows.push(`
      <button class="agenda-row ${dateKey === selectedDate ? "selected" : ""}" data-date="${dateKey}">
        <div class="agenda-date">${month + 1}월 ${day}일 (${weekdays[date.getDay()]})</div>
        <div>${buildPreview(entry, true)}</div>
      </button>
    `);
  }

  agendaView.innerHTML = rows.join("");
  agendaView.querySelectorAll(".agenda-row").forEach((row) => {
    row.addEventListener("click", () => selectDate(row.dataset.date));
  });

  queueViewportScale();
}

function renderSelectedDate() {
  const date = new Date(`${selectedDate}T00:00:00`);
  selectedDateTitle.textContent = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  const entry = getEntryForSelectedDate();
  memoInput.value = entry.memo || "";
  renderTaskList(entry.tasks || []);
  queueViewportScale();
}

function renderTaskList(tasks) {
  if (!tasks.length) {
    taskList.innerHTML = `<li class="task-item"><span>아직 체크리스트가 없어요. 하나 추가해보세요.</span></li>`;
    queueViewportScale();
    return;
  }

  taskList.innerHTML = tasks.map((task, index) => `
    <li class="task-item">
      <input type="checkbox" data-index="${index}" ${task.done ? "checked" : ""}>
      <span class="${task.done ? "done" : ""}">${escapeHtml(task.text)}</span>
      <button class="task-remove" data-remove="${index}" aria-label="삭제">삭제</button>
    </li>
  `).join("");

  taskList.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const entry = getEntryForSelectedDate();
      entry.tasks[Number(checkbox.dataset.index)].done = checkbox.checked;
      persistNotes();
      renderSelectedDate();
      renderCalendar();
    });
  });

  taskList.querySelectorAll(".task-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = getEntryForSelectedDate();
      entry.tasks.splice(Number(button.dataset.remove), 1);
      persistNotes();
      renderSelectedDate();
      renderCalendar();
    });
  });

  queueViewportScale();
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) {
    return;
  }
  const entry = getEntryForSelectedDate();
  entry.tasks.push({ text, done: false });
  taskInput.value = "";
  persistNotes();
  renderSelectedDate();
  renderCalendar();
  triggerCharacterReaction(`"${text}" 항목을 체크리스트에 추가했어요.`);
}

function selectDate(dateKey) {
  selectedDate = dateKey;
  renderCalendar();
  renderSelectedDate();
  triggerCharacterReaction(`${selectedDate.replaceAll("-", ". ")} 일정으로 이동했어요.`);
}

function getEntryForSelectedDate() {
  if (!notesByDate[selectedDate]) {
    notesByDate[selectedDate] = { memo: "", tasks: [] };
  }
  return notesByDate[selectedDate];
}

function persistNotes() {
  localStorage.setItem(storageKeys.notes, JSON.stringify(notesByDate));
}

function restoreCharacterState() {
  const savedImage = localStorage.getItem(storageKeys.image);
  const savedPersonality = localStorage.getItem(storageKeys.personality) || "friendly";
  const autoPlayValue = localStorage.getItem(storageKeys.autoPlay);

  if (savedImage) {
    characterImage.src = savedImage;
  }

  const radio = personalityPanel.querySelector(`input[value="${savedPersonality}"]`);
  if (radio) {
    radio.checked = true;
  }

  currentPersonalityLabel.textContent = personalityLabels[savedPersonality];
  autoBehaviorToggle.checked = autoPlayValue === "true";
}

function scheduleAutoBehavior() {
  clearInterval(autoBehaviorTimer);
  if (!autoBehaviorToggle.checked) {
    return;
  }
  autoBehaviorTimer = setInterval(() => {
    speakRandomBehavior("auto");
  }, 5000);
}

function speakRandomBehavior(source) {
  const personality = getCurrentPersonality();
  const behaviors = personalityBehaviors[personality];
  const line = behaviors[Math.floor(Math.random() * behaviors.length)];
  if (source === "personality") {
    triggerCharacterReaction(`${personalityLabels[personality]} 성격으로 바뀌었어요. ${line}`);
    return;
  }
  triggerCharacterReaction(line);
}

function triggerCharacterReaction(line) {
  speechText.textContent = line;
  characterImage.classList.add("is-acting");
  window.setTimeout(() => {
    characterImage.classList.remove("is-acting");
  }, 700);
}

function getCurrentPersonality() {
  return personalityPanel.querySelector('input[name="personality"]:checked')?.value || "friendly";
}

function buildPreview(entry, includeFallback = false) {
  if (!entry) {
    return includeFallback ? "등록된 메모와 체크리스트가 없어요." : "메모 없음";
  }

  const pending = (entry.tasks || []).filter((task) => !task.done).length;
  if (entry.memo && pending) {
    return `${entry.memo.slice(0, 20)}... / 할 일 ${pending}개`;
  }
  if (entry.memo) {
    return entry.memo.slice(0, 28);
  }
  if (entry.tasks?.length) {
    return `체크리스트 ${entry.tasks.length}개`;
  }
  return includeFallback ? "등록된 메모와 체크리스트가 없어요." : "메모 없음";
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isToday(date) {
  return formatDateKey(date) === formatDateKey(new Date());
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function queueViewportScale() {
  if (scaleFrame) {
    window.cancelAnimationFrame(scaleFrame);
  }
  scaleFrame = window.requestAnimationFrame(() => {
    updateViewportScale();
    scaleFrame = null;
  });
}

function updateViewportScale() {
  return;
}
