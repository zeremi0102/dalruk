const monthLabel = document.getElementById("monthLabel");
const monthView = document.getElementById("monthView");
const agendaView = document.getElementById("agendaView");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const memoInput = document.getElementById("memoInput");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const addTaskButton = document.getElementById("addTaskButton");
const toggleViewButton = document.getElementById("toggleViewButton");
const speechText = document.getElementById("speechText");
const speechBox = document.getElementById("speechBox");
const speechLog = document.getElementById("speechLog");
const speechPreview = document.getElementById("speechPreview");
const characterImage = document.getElementById("characterImage");
const topBarClock = document.getElementById("topBarClock");
const topBarDate = document.getElementById("topBarDate");
const homeButton = document.getElementById("homeButton");
const characterTitle = document.querySelector(".character-stage h1");
const taskPreviewColors = ["peach", "mint", "sky", "lavender", "sand"];

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const storageKeys = {
  notes: "character-calendar-notes",
  image: "character-calendar-image",
  characterTitle: "character-calendar-title",
  isAgendaMode: "character-calendar-view-mode"
};

let currentDate = new Date();
let selectedDate = formatDateKey(new Date());
let isAgendaMode = false;
let notesByDate = loadJson(storageKeys.notes, {});

restoreState();
bindEvents();
initializeSpeechLog();
renderCalendar();
renderSelectedDate();
updateTopBarClock();
setInterval(updateTopBarClock, 1000);

function bindEvents() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    renderCalendar();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    renderCalendar();
  });

  if (toggleViewButton) {
    toggleViewButton.addEventListener("click", () => {
      isAgendaMode = !isAgendaMode;
      localStorage.setItem(storageKeys.isAgendaMode, String(isAgendaMode));
      syncViewMode();
      renderCalendar();
    });
  }

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

  if (homeButton) {
    homeButton.addEventListener("click", () => {
      smoothScrollToTop(900);
    });
  }

  if (speechBox) {
    speechBox.addEventListener("click", toggleSpeechLog);
    speechBox.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleSpeechLog();
      }
    });
  }

  if (characterTitle) {
    characterTitle.addEventListener("dblclick", beginCharacterTitleEdit);
  }
}

function restoreState() {
  const savedImage = localStorage.getItem(storageKeys.image);
  const savedTitle = localStorage.getItem(storageKeys.characterTitle);
  const savedMode = localStorage.getItem(storageKeys.isAgendaMode);

  if (savedImage && characterImage) {
    characterImage.src = savedImage;
  }

  if (savedTitle && characterTitle) {
    characterTitle.textContent = savedTitle;
  }

  isAgendaMode = savedMode === "true";
  syncViewMode();
}

function syncViewMode() {
  if (monthView && agendaView) {
    monthView.classList.toggle("hidden", isAgendaMode);
    agendaView.classList.toggle("hidden", !isAgendaMode);
  }

  if (toggleViewButton) {
    toggleViewButton.textContent = isAgendaMode ? "달력 보기로 전환" : "표 보기로 전환";
  }
}

function updateTopBarClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const period = hours < 12 ? "오전" : "오후";
  const displayHour = String(hours % 12 || 12).padStart(2, "0");
  const displayMinute = String(minutes).padStart(2, "0");
  const month = now.getMonth() + 1;
  const day = String(now.getDate()).padStart(2, "0");
  const weekday = weekdays[now.getDay()];

  if (topBarClock) {
    topBarClock.textContent = `${period} ${displayHour} : ${displayMinute}`;
  }

  if (topBarDate) {
    topBarDate.textContent = `${month}월 ${day}일 ${weekday}요일`;
  }
}

function initializeSpeechLog() {
  if (!speechText) {
    return;
  }

  speechText.classList.add("speech-log-entry");

  if (speechPreview) {
    speechPreview.textContent = speechText.textContent.trim();
  }
}

function toggleSpeechLog() {
  if (!speechBox || !speechLog) {
    return;
  }

  const isExpanded = speechBox.classList.toggle("is-expanded");
  speechBox.setAttribute("aria-expanded", String(isExpanded));
  speechLog.scrollTop = 0;
}

function beginCharacterTitleEdit() {
  if (!characterTitle || characterTitle.isContentEditable) {
    return;
  }

  const previousTitle = characterTitle.textContent.trim();
  characterTitle.contentEditable = "true";
  characterTitle.classList.add("is-editing");
  characterTitle.focus();
  document.execCommand("selectAll", false, null);

  function finishTitleEdit(save) {
    const nextTitle = characterTitle.textContent.trim();
    characterTitle.contentEditable = "false";
    characterTitle.classList.remove("is-editing");
    characterTitle.removeEventListener("blur", handleBlur);
    characterTitle.removeEventListener("keydown", handleKeydown);

    if (!save || !nextTitle) {
      characterTitle.textContent = previousTitle;
      return;
    }

    characterTitle.textContent = nextTitle;
    localStorage.setItem(storageKeys.characterTitle, nextTitle);
  }

  function handleBlur() {
    finishTitleEdit(true);
  }

  function handleKeydown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      characterTitle.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      finishTitleEdit(false);
    }
  }

  characterTitle.addEventListener("blur", handleBlur);
  characterTitle.addEventListener("keydown", handleKeydown);
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startOffset);
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalVisibleCells = getCalendarCellCount(startOffset, totalDaysInMonth);
  const weekdayHtml = `<div class="weekdays">${weekdays.map((day) => `<div class="weekday">${day}</div>`).join("")}</div>`;
  const daysHtml = [];

  monthLabel.textContent = `${year}년 ${month + 1}월`;

  for (let index = 0; index < totalVisibleCells; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = formatDateKey(date);
    const entry = notesByDate[dateKey];
    const isCurrentMonth = date.getMonth() === month;
    const preview = buildDayPreview(entry);

    daysHtml.push(`
      <button class="calendar-day ${isCurrentMonth ? "" : "other-month"} ${dateKey === selectedDate ? "selected" : ""}" data-date="${dateKey}">
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
}

function getCalendarCellCount(startOffset, totalDaysInMonth) {
  const needsSixRows = startOffset + totalDaysInMonth > 35;

  if (!isMobileLayout()) {
    return 42;
  }

  return needsSixRows ? 42 : 35;
}

function isMobileLayout() {
  return window.innerWidth <= 768 && navigator.maxTouchPoints > 0;
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
}

function renderSelectedDate() {
  const date = new Date(`${selectedDate}T00:00:00`);
  const entry = getEntryForSelectedDate();

  selectedDateTitle.textContent = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  memoInput.value = entry.memo || "";
  renderTaskList(entry.tasks || []);
}

function renderTaskList(tasks) {
  if (!tasks.length) {
    taskList.innerHTML = "";
    return;
  }

  taskList.innerHTML = tasks.map((task, index) => `
    <li class="task-item">
      <input type="checkbox" data-index="${index}" ${task.done ? "checked" : ""}>
      <span class="${task.done ? "done" : ""}">${task.text}</span>
      <button type="button" class="task-remove" data-index="${index}">삭제</button>
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
      entry.tasks.splice(Number(button.dataset.index), 1);
      persistNotes();
      renderSelectedDate();
      renderCalendar();
    });
  });
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

  const [year, month, day] = dateKey.split("-");
  triggerCharacterReaction(`${year}. ${month}. ${day} 일정으로 이동했어요.`);
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

function triggerCharacterReaction(line) {
  appendSpeechLog(line);

  if (characterImage) {
    characterImage.classList.add("is-acting");
    window.setTimeout(() => {
      characterImage.classList.remove("is-acting");
    }, 700);
  }
}

function appendSpeechLog(line) {
  if (!speechLog || !speechText) {
    return;
  }

  const previousLine = speechText.textContent.trim();

  if (previousLine && previousLine !== line) {
    const archivedEntry = document.createElement("p");
    archivedEntry.className = "speech-log-entry";
    archivedEntry.textContent = previousLine;
    speechText.insertAdjacentElement("afterend", archivedEntry);
  }

  speechText.textContent = line;

  if (speechPreview) {
    speechPreview.textContent = line;
  }

  while (speechLog.querySelectorAll(".speech-log-entry").length > 50) {
    const lastEntry = speechLog.querySelector(".speech-log-entry:last-child");
    if (!lastEntry || lastEntry === speechText) {
      break;
    }
    lastEntry.remove();
  }

  if (speechBox?.classList.contains("is-expanded")) {
    speechLog.scrollTop = 0;
  }
}

function buildPreview(entry, includeFallback = false) {
  if (!entry) {
    return includeFallback ? "등록된 메모나 체크리스트가 없어요" : "메모 없음";
  }

  const pendingCount = (entry.tasks || []).filter((task) => !task.done).length;

  if (entry.memo && pendingCount) {
    return `${entry.memo.slice(0, 20)}... / 할 일 ${pendingCount}개`;
  }

  if (entry.memo) {
    return entry.memo.slice(0, 28);
  }

  if (entry.tasks?.length) {
    return `체크리스트 ${entry.tasks.length}개`;
  }

  return includeFallback ? "등록된 메모나 체크리스트가 없어요" : "메모 없음";
}

function buildDayPreview(entry) {
  if (!entry) {
    return `<span class="day-preview-empty">메모 없음</span>`;
  }

  if (entry.tasks?.length) {
    return entry.tasks
      .map((task, index) => {
        const colorName = taskPreviewColors[index % taskPreviewColors.length];
        const doneClass = task.done ? " is-done" : "";

        return `
          <span class="day-task-chip day-task-chip--${colorName}${doneClass}">
            <span class="day-task-text">${escapeHtml(task.text)}</span>
          </span>
        `;
      })
      .join("");
  }

  if (entry.memo) {
    return `<span class="day-preview-empty">${escapeHtml(entry.memo)}</span>`;
  }

  return `<span class="day-preview-empty">메모 없음</span>`;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function smoothScrollToTop(duration = 900) {
  const startY = window.scrollY || document.documentElement.scrollTop || 0;
  if (startY <= 0) {
    return;
  }

  const startTime = performance.now();

  function easeInOutCubic(progress) {
    return progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    const nextY = startY * (1 - eased);

    window.scrollTo(0, nextY);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
