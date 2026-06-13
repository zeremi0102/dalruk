const monthLabel = document.getElementById("monthLabel");
const monthView = document.getElementById("monthView");
const agendaView = document.getElementById("agendaView");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const memoLabel = document.getElementById("memoLabel");
const memoInput = document.getElementById("memoInput");
const taskHourInput = document.getElementById("taskHourInput");
const taskMinuteInput = document.getElementById("taskMinuteInput");
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
let selectedTaskIndex = null;
let editingTaskTimeIndex = null;

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
    const activeTask = entry.tasks?.[selectedTaskIndex];

    if (!activeTask) {
      return;
    }

    activeTask.memo = memoInput.value;
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
  const todayKey = formatDateKey(new Date());

  monthLabel.textContent = `${year}년 ${month + 1}월`;

  for (let index = 0; index < totalVisibleCells; index += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const dateKey = formatDateKey(date);
    const entry = notesByDate[dateKey];
    const isCurrentMonth = date.getMonth() === month;
    const preview = buildDayPreview(entry, dateKey);
    const isToday = dateKey === todayKey;

    daysHtml.push(`
      <button class="calendar-day ${isCurrentMonth ? "" : "other-month"} ${dateKey === selectedDate ? "selected" : ""} ${isToday ? "today" : ""}" data-date="${dateKey}">
        <div class="day-number">${date.getDate()}</div>
        <div class="day-preview">${preview}</div>
      </button>
    `);
  }

  monthView.innerHTML = `${weekdayHtml}<div class="calendar-grid">${daysHtml.join("")}</div>`;

  monthView.querySelectorAll(".calendar-day").forEach((button) => {
    button.addEventListener("click", () => selectDate(button.dataset.date));
  });

  monthView.querySelectorAll(".day-task-chip").forEach((chip) => {
    chip.addEventListener("click", (event) => {
      event.stopPropagation();
      selectedDate = chip.dataset.date;
      selectedTaskIndex = Number(chip.dataset.taskIndex);
      renderCalendar();
      renderSelectedDate();
    });
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
  normalizeSelectedTask(entry);
  syncTaskMemoEditor(entry);
  renderTaskList(entry.tasks || []);
}

function renderTaskList(tasks) {
  if (!tasks.length) {
    taskList.innerHTML = "";
    return;
  }

  taskList.innerHTML = tasks.map((task, index) => `
    <li class="task-item ${index === selectedTaskIndex ? "is-selected" : ""}" data-index="${index}">
      ${index === editingTaskTimeIndex
        ? `
          <div class="task-item-time-editor" data-index="${index}">
            <input type="number" class="task-item-time-part task-item-time-hour" data-index="${index}" min="0" max="23" inputmode="numeric" value="${getTimePart(task.time, "hour")}">
            <span class="task-time-separator">:</span>
            <input type="number" class="task-item-time-part task-item-time-minute" data-index="${index}" min="0" max="59" inputmode="numeric" value="${getTimePart(task.time, "minute")}">
          </div>
        `
        : `<button type="button" class="task-item-time-button" data-index="${index}">${escapeHtml(formatTimeForButton(task.time))}</button>`
      }
      <div class="task-main">
        <button type="button" class="task-select ${task.done ? "done" : ""}" data-index="${index}">${escapeHtml(task.text)}</button>
      </div>
      <button type="button" class="task-remove" data-index="${index}">삭제</button>
    </li>
  `).join("");

  taskList.querySelectorAll(".task-select").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTaskIndex = Number(button.dataset.index);
      renderSelectedDate();
    });
  });

  taskList.querySelectorAll(".task-item-time-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedTaskIndex = Number(button.dataset.index);
      renderSelectedDate();
    });

    button.addEventListener("dblclick", () => {
      selectedTaskIndex = Number(button.dataset.index);
      editingTaskTimeIndex = Number(button.dataset.index);
      renderSelectedDate();
      focusTaskTimeEditor(editingTaskTimeIndex);
    });
  });

  taskList.querySelectorAll(".task-item-time-editor").forEach((editor) => {
    const index = Number(editor.dataset.index);
    const hourInput = editor.querySelector(".task-item-time-hour");
    const minuteInput = editor.querySelector(".task-item-time-minute");

    editor.addEventListener("focusout", (event) => {
      if (editor.contains(event.relatedTarget)) {
        return;
      }

      commitTaskTimeEdit(index, hourInput.value, minuteInput.value);
    });

    [hourInput, minuteInput].forEach((input) => {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitTaskTimeEdit(index, hourInput.value, minuteInput.value);
        }

        if (event.key === "Escape") {
          event.preventDefault();
          cancelTaskTimeEdit();
        }
      });
    });
  });

  taskList.querySelectorAll(".task-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = getEntryForSelectedDate();
      entry.tasks.splice(Number(button.dataset.index), 1);
      normalizeSelectedTask(entry);
      persistNotes();
      renderSelectedDate();
      renderCalendar();
    });
  });
}

function addTask() {
  const text = taskInput.value.trim();
  const time = buildTimeValue(taskHourInput.value, taskMinuteInput.value);
  if (!text) {
    return;
  }

  if (time === null) {
    taskHourInput.value = "";
    taskMinuteInput.value = "";
    return;
  }

  const entry = getEntryForSelectedDate();
  if (entry.tasks.length >= 5) {
    triggerCharacterReaction("체크리스트는 한 날짜에 최대 5개까지 추가할 수 있어요.");
    return;
  }

  entry.tasks.push({ text, time, done: false, memo: "" });
  selectedTaskIndex = entry.tasks.length - 1;
  taskInput.value = "";
  taskHourInput.value = "";
  taskMinuteInput.value = "";
  editingTaskTimeIndex = null;
  persistNotes();
  renderSelectedDate();
  renderCalendar();
  triggerCharacterReaction(`"${text}" 항목을 체크리스트에 추가했어요.`);
}

function selectDate(dateKey) {
  selectedDate = dateKey;
  selectedTaskIndex = null;
  editingTaskTimeIndex = null;
  renderCalendar();
  renderSelectedDate();

  const [year, month, day] = dateKey.split("-");
  triggerCharacterReaction(`${year}. ${month}. ${day} 일정으로 이동했어요.`);
}

function getEntryForSelectedDate() {
  if (!notesByDate[selectedDate]) {
    notesByDate[selectedDate] = { tasks: [] };
  }

  return notesByDate[selectedDate];
}

function persistNotes() {
  localStorage.setItem(storageKeys.notes, JSON.stringify(notesByDate));
}

function normalizeSelectedTask(entry) {
  if (!entry.tasks?.length) {
    selectedTaskIndex = null;
    return;
  }

  if (selectedTaskIndex === null || !entry.tasks[selectedTaskIndex]) {
    selectedTaskIndex = 0;
  }
}

function syncTaskMemoEditor(entry) {
  const activeTask = entry.tasks?.[selectedTaskIndex];

  if (!activeTask) {
    memoLabel.textContent = "체크리스트 메모";
    memoInput.value = "";
    memoInput.placeholder = "체크리스트를 선택한 뒤 메모를 적어주세요.";
    memoInput.disabled = true;
    return;
  }

  memoLabel.textContent = `${getTaskDisplayText(activeTask)} + 메모`;
  memoInput.value = activeTask.memo || "";
  memoInput.placeholder = `${getTaskDisplayText(activeTask)}에 대한 메모를 적어주세요.`;
  memoInput.disabled = false;
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

function buildDayPreview(entry, dateKey) {
  if (!entry) {
    return `<span class="day-preview-empty">메모 없음</span>`;
  }

  if (entry.tasks?.length) {
    return entry.tasks
      .map((task, index) => {
        const colorName = taskPreviewColors[index % taskPreviewColors.length];
        const doneClass = task.done ? " is-done" : "";

        return `
          <span class="day-task-chip day-task-chip--${colorName}${doneClass}" data-date="${dateKey}" data-task-index="${index}">
            <span class="day-task-text">${escapeHtml(getTaskDisplayText(task))}</span>
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

function getTaskDisplayText(task) {
  if (!task) {
    return "";
  }

  return task.time ? `${formatTimeForButton(task.time)} ${task.text}` : task.text;
}

function formatTimeForButton(timeValue) {
  if (!timeValue) {
    return "시간";
  }

  const [hourText, minuteText] = timeValue.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return "시간";
  }

  const period = hour >= 12 ? "오후" : "오전";
  const displayHour = hour % 12 || 12;
  return `${period} ${displayHour}시 ${minute}분`;
}

function getTimePart(timeValue, part) {
  if (!timeValue) {
    return "";
  }

  const [hour, minute] = timeValue.split(":");
  return part === "hour" ? String(Number(hour)) : String(Number(minute));
}

function buildTimeValue(hourValue, minuteValue) {
  const hourText = String(hourValue).trim();
  const minuteText = String(minuteValue).trim();

  if (!hourText && !minuteText) {
    return "";
  }

  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function commitTaskTimeEdit(index, hourValue, minuteValue) {
  const entry = getEntryForSelectedDate();
  const task = entry.tasks?.[index];

  if (!task) {
    cancelTaskTimeEdit();
    return;
  }

  const nextTime = buildTimeValue(hourValue, minuteValue);
  editingTaskTimeIndex = null;

  if (nextTime !== null) {
    task.time = nextTime;
    persistNotes();
    renderCalendar();
  }

  selectedTaskIndex = index;
  renderSelectedDate();
}

function cancelTaskTimeEdit() {
  editingTaskTimeIndex = null;
  renderSelectedDate();
}

function focusTaskTimeEditor(index) {
  requestAnimationFrame(() => {
    const hourInput = taskList.querySelector(`.task-item-time-hour[data-index="${index}"]`);
    if (!hourInput) {
      return;
    }

    hourInput.focus();
    hourInput.select();
  });
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
