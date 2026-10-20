
"use strict";

const screen = document.getElementById("screen");
const expression = document.getElementById("expression");
const statusLabel = document.getElementById("status");
const historyList = document.getElementById("historyList");
const toast = document.getElementById("toast");

let currentValue = "0";
let storedValue = null;
let operator = null;
let waitingForOperand = false;
let justCalculated = false;
let lastExpression = "";
let toastTimer = null;

const HISTORY_KEY = "smartcalc-pro-history";
const THEME_KEY = "smartcalc-pro-theme";

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    showToast("Storage unavailable");
    return false;
  }
}

function loadHistory() {
  try {
    const parsed = JSON.parse(
      readStorage(HISTORY_KEY, "[]")
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let history = loadHistory();

function updateDisplay() {
  screen.textContent = currentValue;

  if (currentValue === "Error") {
    statusLabel.textContent = "ERROR";
  } else {
    statusLabel.textContent = operator
      ? "CALCULATING"
      : "READY";
  }
}

function formatNumber(number) {
  if (!Number.isFinite(number)) {
    return "Error";
  }

  if (Object.is(number, -0)) {
    return "0";
  }

  return String(Number(number.toPrecision(12)));
}

function symbol(op) {
  return {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷"
  }[op] || op;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function clearCalculator() {
  currentValue = "0";
  storedValue = null;
  operator = null;
  waitingForOperand = false;
  justCalculated = false;
  lastExpression = "";

  expression.textContent = "";
  updateDisplay();
}

function inputNumber(number) {
  if (currentValue === "Error") {
    clearCalculator();
  }

  if (waitingForOperand || justCalculated) {
    currentValue = number;
    waitingForOperand = false;
    justCalculated = false;
    expression.textContent = "";
    lastExpression = "";
  } else if (currentValue === "0") {
    currentValue = number;
  } else if (currentValue.replace("-", "").length < 15) {
    currentValue += number;
  }

  updateDisplay();
}

function inputDecimal() {
  if (currentValue === "Error") {
    clearCalculator();
  }

  if (waitingForOperand || justCalculated) {
    currentValue = "0.";
    waitingForOperand = false;
    justCalculated = false;
    expression.textContent = "";
    lastExpression = "";
  } else if (!currentValue.includes(".")) {
    currentValue += ".";
  }

  updateDisplay();
}

function calculate(a, b, op) {
  switch (op) {
    case "+":
      return a + b;

    case "-":
      return a - b;

    case "*":
      return a * b;

    case "/":
      return b === 0 ? null : a / b;

    default:
      return null;
  }
}

function chooseOperator(nextOperator) {
  if (currentValue === "Error") return;

  const input = Number(currentValue);

  if (operator && !waitingForOperand) {
    const result = calculate(
      storedValue,
      input,
      operator
    );

    if (result === null || !Number.isFinite(result)) {
      showError("Invalid calculation");
      return;
    }

    currentValue = formatNumber(result);
    storedValue = result;
  } else if (storedValue === null || !operator) {
    storedValue = input;
  }

  operator = nextOperator;
  waitingForOperand = true;
  justCalculated = false;

  expression.textContent =
    `${formatNumber(storedValue)} ${symbol(operator)}`;

  updateDisplay();
}

function saveCalculation(label, result) {
  history.unshift({
    id: Date.now() + Math.random(),
    expression: label,
    result: String(result)
  });

  history = history.slice(0, 50);

  writeStorage(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function performCalculation() {
  if (
    operator === null ||
    storedValue === null ||
    waitingForOperand ||
    currentValue === "Error"
  ) {
    return;
  }

  const first = storedValue;
  const second = Number(currentValue);
  const activeOperator = operator;

  const result = calculate(first, second, activeOperator);

  if (result === null || !Number.isFinite(result)) {
    showError(
      second === 0 && activeOperator === "/"
        ? "Cannot divide by zero"
        : "Invalid calculation"
    );
    return;
  }

  const formattedResult = formatNumber(result);

  lastExpression =
    `${formatNumber(first)} ${symbol(activeOperator)} ${formatNumber(second)}`;

  saveCalculation(lastExpression, formattedResult);

  expression.textContent = `${lastExpression} =`;
  currentValue = formattedResult;

  storedValue = null;
  operator = null;
  waitingForOperand = false;
  justCalculated = true;

  updateDisplay();
}

function showError(message) {
  currentValue = "Error";
  storedValue = null;
  operator = null;
  waitingForOperand = true;
  justCalculated = false;

  expression.textContent = message;
  updateDisplay();
}

function deleteLastDigit() {
  if (currentValue === "Error") {
    clearCalculator();
    return;
  }

  if (waitingForOperand || justCalculated) return;

  if (
    currentValue.length <= 1 ||
    (currentValue.length === 2 &&
      currentValue.startsWith("-"))
  ) {
    currentValue = "0";
  } else {
    currentValue = currentValue.slice(0, -1);
  }

  updateDisplay();
}

function toggleSign() {
  if (currentValue === "Error" || currentValue === "0") {
    return;
  }

  currentValue = currentValue.startsWith("-")
    ? currentValue.slice(1)
    : "-" + currentValue;

  justCalculated = false;
  updateDisplay();
}

function calculatePercent() {
  if (currentValue === "Error") return;

  currentValue = formatNumber(Number(currentValue) / 100);
  waitingForOperand = false;
  justCalculated = false;

  updateDisplay();
}

function scientificCalculation(action) {
  if (currentValue === "Error") return;

  const number = Number(currentValue);
  let result;
  let label;

  switch (action) {
    case "sin":
      result = Math.sin(number * Math.PI / 180);
      label = `sin(${number}°)`;
      break;

    case "cos":
      result = Math.cos(number * Math.PI / 180);
      label = `cos(${number}°)`;
      break;

    case "tan":
      if (Math.abs(Math.cos(number * Math.PI / 180)) < 1e-12) {
        showError("Tangent is undefined here");
        return;
      }

      result = Math.tan(number * Math.PI / 180);
      label = `tan(${number}°)`;
      break;

    case "sqrt":
      if (number < 0) {
        showError("Cannot square-root a negative number");
        return;
      }

      result = Math.sqrt(number);
      label = `√(${number})`;
      break;

    case "square":
      result = number * number;
      label = `(${number})²`;
      break;

    case "pi":
      result = Math.PI;
      label = "π";
      break;

    default:
      return;
  }

  if (!Number.isFinite(result)) {
    showError("Invalid calculation");
    return;
  }

  const formatted = formatNumber(result);

  saveCalculation(label, formatted);

  currentValue = formatted;
  storedValue = null;
  operator = null;
  waitingForOperand = false;
  justCalculated = true;

  expression.textContent = `${label} =`;
  updateDisplay();
}

function renderHistory() {
  historyList.replaceChildren();

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("span");
    icon.textContent = "↻";

    const text = document.createElement("p");
    text.textContent = "Your calculations will appear here.";

    empty.append(icon, text);
    historyList.appendChild(empty);
    return;
  }

  history.forEach(item => {
    const row = document.createElement("article");
    row.className = "history-item";

    const details = document.createElement("div");
    details.className = "history-details";

    const label = document.createElement("p");
    label.className = "history-expression";
    label.textContent = item.expression;

    const result = document.createElement("p");
    result.className = "history-result";
    result.textContent = item.result;

    details.append(label, result);

    const reuse = document.createElement("button");
    reuse.className = "reuse-btn";
    reuse.textContent = "Use result";
    reuse.setAttribute("aria-label", `Use result ${item.result}`);

    reuse.addEventListener("click", () => {
      currentValue = item.result;
      storedValue = null;
      operator = null;
      waitingForOperand = false;
      justCalculated = true;
      expression.textContent = item.expression;

      updateDisplay();
      showToast("Result loaded");
    });

    row.append(details, reuse);
    historyList.appendChild(row);
  });
}

function clearHistory() {
  history = [];
  writeStorage(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
  showToast("History cleared");
}

// Main calculator buttons
document.querySelector(".buttons").addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.number !== undefined) {
    inputNumber(button.dataset.number);
    return;
  }

  if (button.dataset.operator) {
    chooseOperator(button.dataset.operator);
    return;
  }

  switch (button.dataset.action) {
    case "clear":
      clearCalculator();
      break;

    case "delete":
      deleteLastDigit();
      break;

    case "decimal":
      inputDecimal();
      break;

    case "sign":
      toggleSign();
      break;

    case "percent":
      calculatePercent();
      break;

    case "calculate":
      performCalculation();
      break;
  }
});

// Scientific buttons
document.querySelector(".scientific-grid").addEventListener("click", event => {
  const button = event.target.closest("button[data-science]");
  if (!button) return;

  scientificCalculation(button.dataset.science);
});

// Light and dark themes
function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");

  document.getElementById("themeToggle").textContent =
    theme === "light" ? "☾" : "☀";

  const meta = document.querySelector('meta[name="theme-color"]');

  meta.setAttribute(
    "content",
    theme === "light" ? "#f3f4f7" : "#101114"
  );
}

applyTheme(readStorage(THEME_KEY, "dark"));

document.getElementById("themeToggle").addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("light")
    ? "dark"
    : "light";

  applyTheme(nextTheme);
  writeStorage(THEME_KEY, nextTheme);
});

// Copy the displayed result
document.getElementById("copyResult").addEventListener("click", async () => {
  if (currentValue === "Error") {
    showToast("No valid result to copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(currentValue);
    showToast("Result copied");
  } catch {
    showToast("Clipboard unavailable in this preview");
  }
});

document.getElementById("clearHistory").addEventListener("click", clearHistory);

// Keyboard support
document.addEventListener("keydown", event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const key = event.key;

  if (/^[0-9]$/.test(key)) {
    inputNumber(key);
  } else if (key === ".") {
    inputDecimal();
  } else if (["+", "-", "*", "/"].includes(key)) {
    chooseOperator(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    performCalculation();
  } else if (key === "Backspace") {
    deleteLastDigit();
  } else if (key === "Escape") {
    clearCalculator();
  } else if (key === "%") {
    calculatePercent();
  }
});

renderHistory();
updateDisplay();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => {
        console.log("SmartCalc Pro offline support registered.");
      })
      .catch((error) => {
        console.log("Service worker registration:", error);
      });
  });
}
