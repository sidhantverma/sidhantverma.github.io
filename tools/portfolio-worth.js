const STORAGE_KEY = "portfolio-worth-projector:v1";
const ALLOWED_CURRENCIES = ["CAD", "USD", "EUR", "GBP", "INR", "AUD"];
const INVESTMENT_COLORS = [
  { color: "#286349", tint: "#e1eee6" },
  { color: "#315baf", tint: "#e5ebf7" },
  { color: "#9c6634", tint: "#f4eadf" },
  { color: "#7855a3", tint: "#eee7f5" },
  { color: "#a0445d", tint: "#f6e6eb" },
  { color: "#397f86", tint: "#e2f0f1" },
];

const list = document.querySelector("#investment-list");
const addButton = document.querySelector("#add-investment");
const resetButton = document.querySelector("#reset-portfolio");
const currencyInput = document.querySelector("#currency");
const storageStatus = document.querySelector("#storage-status");

function createId() {
  return window.crypto?.randomUUID?.() ?? `investment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createExamples() {
  return [
    {
      id: createId(),
      name: "Long-term index fund",
      type: "lump",
      amount: 10000,
      rate: 7,
      years: 10,
      frequency: "monthly",
    },
    {
      id: createId(),
      name: "Monthly retirement savings",
      type: "recurring",
      amount: 500,
      rate: 7,
      years: 20,
      frequency: "monthly",
    },
  ];
}

function normalizeNumber(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function sanitizeInvestment(value) {
  return {
    id: typeof value?.id === "string" && value.id.length < 100 ? value.id : createId(),
    name: typeof value?.name === "string" ? value.name.slice(0, 80) : "New investment",
    type: value?.type === "recurring" ? "recurring" : "lump",
    amount: normalizeNumber(value?.amount, 0),
    rate: normalizeNumber(value?.rate, 0, -99.9, 100),
    years: Math.round(normalizeNumber(value?.years, 1, 1, 80)),
    frequency: value?.frequency === "yearly" ? "yearly" : "monthly",
  };
}

function defaultState() {
  return {
    currency: "CAD",
    investments: createExamples(),
  };
}

let state = loadState();

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState();

    const parsed = JSON.parse(stored);
    const investments = Array.isArray(parsed?.investments)
      ? parsed.investments.map(sanitizeInvestment).slice(0, 100)
      : [];

    return {
      currency: ALLOWED_CURRENCIES.includes(parsed?.currency) ? parsed.currency : "CAD",
      investments: Array.isArray(parsed?.investments) ? investments : createExamples(),
    };
  } catch {
    storageStatus.textContent = "Saved data could not be restored. Starting with examples.";
    storageStatus.classList.add("is-error");
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageStatus.textContent = "Changes are saved automatically on this device.";
    storageStatus.classList.remove("is-error");
  } catch {
    storageStatus.textContent = "Browser storage is unavailable; changes will not persist.";
    storageStatus.classList.add("is-error");
  }
}

function money(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: state.currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function calculate(investment) {
  const months = investment.years * 12;
  const monthlyRate = investment.rate / 100 / 12;
  let value = investment.type === "lump" ? investment.amount : 0;
  let contributed = investment.type === "lump" ? investment.amount : 0;

  for (let month = 1; month <= months; month += 1) {
    value *= 1 + monthlyRate;

    if (investment.type === "recurring") {
      const shouldContribute =
        investment.frequency === "monthly" || month % 12 === 0;

      if (shouldContribute) {
        value += investment.amount;
        contributed += investment.amount;
      }
    }
  }

  return {
    value: Math.max(0, value),
    contributed,
    growth: value - contributed,
  };
}

function displayInvestmentName(investment, index) {
  return investment.name.trim() || `Investment ${index + 1}`;
}

function createInvestmentCard(investment, index) {
  const card = document.createElement("article");
  const palette = INVESTMENT_COLORS[index % INVESTMENT_COLORS.length];
  card.className = "investment-card";
  card.dataset.id = investment.id;
  card.style.setProperty("--investment-color", palette.color);
  card.style.setProperty("--investment-tint", palette.tint);
  card.innerHTML = `
    <div class="investment-card-head">
      <span class="investment-number" aria-hidden="true">${index + 1}</span>
      <input class="investment-name" data-field="name" maxlength="80" aria-label="Investment name">
      <button class="remove-investment" type="button" data-action="remove" aria-label="Remove investment">×</button>
    </div>
    <div class="investment-fields">
      <fieldset class="investment-type">
        <legend>Investment type</legend>
        <div class="type-toggle">
          <label>
            <input type="radio" name="type-${investment.id}" value="lump" data-field="type">
            <span>Lump sum</span>
          </label>
          <label>
            <input type="radio" name="type-${investment.id}" value="recurring" data-field="type">
            <span>Recurring</span>
          </label>
        </div>
      </fieldset>
      <div class="investment-field">
        <label data-role="amount-label">${investment.type === "lump" ? "Starting amount" : "Contribution amount"}</label>
        <div class="input-with-unit">
          <input type="number" min="0" step="100" data-field="amount" aria-label="${investment.type === "lump" ? "Starting amount" : "Contribution amount"}">
          <span>${state.currency}</span>
        </div>
      </div>
      <div class="investment-field" data-role="frequency-field" ${investment.type === "lump" ? "hidden" : ""}>
        <label>Contribution frequency</label>
        <select data-field="frequency">
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      <div class="investment-field">
        <label>Annual return</label>
        <div class="input-with-unit">
          <input type="number" min="-99.9" max="100" step="0.1" data-field="rate" aria-label="Annual return">
          <span>%</span>
        </div>
      </div>
      <div class="investment-field">
        <label>Time horizon</label>
        <div class="input-with-unit">
          <input type="number" min="1" max="80" step="1" data-field="years" aria-label="Time horizon">
          <span>years</span>
        </div>
      </div>
    </div>
    <div class="investment-projection" aria-live="polite">
      <div>
        <p data-role="projection-label"></p>
        <strong data-role="projection-value"></strong>
      </div>
      <span class="gain-pill" data-role="gain"></span>
    </div>
  `;

  card.querySelector("[data-field='name']").value = investment.name;
  card.querySelector(`[data-field="type"][value="${investment.type}"]`).checked = true;
  card.querySelector("[data-field='amount']").value = investment.amount;
  card.querySelector("[data-field='frequency']").value = investment.frequency;
  card.querySelector("[data-field='rate']").value = investment.rate;
  card.querySelector("[data-field='years']").value = investment.years;
  updateInvestmentProjection(card, investment);
  return card;
}

function updateInvestmentProjection(card, investment) {
  const projection = calculate(investment);
  const growthPrefix = projection.growth >= 0 ? "+" : "−";
  const gain = card.querySelector("[data-role='gain']");
  card.querySelector("[data-role='projection-label']").textContent =
    `Projected value at year ${investment.years}`;
  card.querySelector("[data-role='projection-value']").textContent =
    money(projection.value);
  gain.textContent =
    `${growthPrefix}${money(Math.abs(projection.growth))} growth`;
  gain.classList.toggle("is-negative", projection.growth < 0);
}

function renderInvestmentCards() {
  list.replaceChildren(
    ...state.investments.map((investment, index) =>
      createInvestmentCard(investment, index),
    ),
  );
}

function updateCardType(card, investment) {
  const isRecurring = investment.type === "recurring";
  const amountLabel = card.querySelector("[data-role='amount-label']");
  const amountInput = card.querySelector("[data-field='amount']");
  card.querySelector("[data-role='frequency-field']").hidden = !isRecurring;
  amountLabel.textContent = isRecurring ? "Contribution amount" : "Starting amount";
  amountInput.setAttribute(
    "aria-label",
    isRecurring ? "Contribution amount" : "Starting amount",
  );
}

function renderSummary() {
  const projections = state.investments.map(calculate);
  const total = projections.reduce((sum, item) => sum + item.value, 0);
  const contributed = projections.reduce((sum, item) => sum + item.contributed, 0);
  const growth = projections.reduce((sum, item) => sum + item.growth, 0);
  const count = state.investments.length;

  document.querySelector("#portfolio-total").textContent = money(total);
  document.querySelector("#total-contributed").textContent = money(contributed);
  document.querySelector("#total-growth").textContent =
    `${growth >= 0 ? "+" : "−"}${money(Math.abs(growth))}`;
  document.querySelector("#total-caption").textContent =
    `Across ${count} ${count === 1 ? "investment" : "investments"}`;
  document.querySelector("#investment-count").textContent =
    `${count} ${count === 1 ? "investment" : "investments"}`;

  const mixTrack = document.querySelector("#mix-track");
  const results = document.querySelector("#investment-results");
  mixTrack.replaceChildren();
  results.replaceChildren();

  state.investments.forEach((investment, index) => {
    const palette = INVESTMENT_COLORS[index % INVESTMENT_COLORS.length];
    const projection = projections[index];
    const percentage = total > 0 ? (projection.value / total) * 100 : 0;
    const segment = document.createElement("span");
    segment.style.width = `${percentage}%`;
    segment.style.background = palette.color;
    segment.style.filter = "brightness(1.3)";
    mixTrack.append(segment);

    const row = document.createElement("div");
    row.className = "result-row";

    const dot = document.createElement("span");
    dot.className = "result-row-dot";
    dot.style.background = palette.color;
    dot.style.filter = "brightness(1.5)";

    const name = document.createElement("span");
    name.className = "result-row-name";
    name.textContent = displayInvestmentName(investment, index);
    name.title = name.textContent;

    const value = document.createElement("strong");
    value.className = "result-row-value";
    value.textContent = money(projection.value);

    row.append(dot, name, value);
    results.append(row);
  });
}

function render() {
  currencyInput.value = state.currency;
  renderInvestmentCards();
  renderSummary();
}

function updateInvestmentFromEvent(event) {
  const field = event.target.closest("[data-field]");
  if (!field) return;

  const card = field.closest(".investment-card");
  const investment = state.investments.find((item) => item.id === card.dataset.id);
  if (!investment) return;

  const key = field.dataset.field;
  if (key === "name") {
    investment.name = field.value.slice(0, 80);
  } else if (key === "type") {
    investment.type = field.value;
    updateCardType(card, investment);
  } else if (key === "frequency") {
    investment.frequency = field.value;
  } else if (key === "amount") {
    investment.amount = normalizeNumber(field.value, 0);
  } else if (key === "rate") {
    investment.rate = normalizeNumber(field.value, 0, -99.9, 100);
  } else if (key === "years") {
    investment.years = Math.round(normalizeNumber(field.value, 1, 1, 80));
  }

  updateInvestmentProjection(card, investment);
  renderSummary();
  saveState();
}

list.addEventListener("input", updateInvestmentFromEvent);
list.addEventListener("change", (event) => {
  updateInvestmentFromEvent(event);

  if (event.target.matches("[data-field='years'], [data-field='rate'], [data-field='amount']")) {
    const card = event.target.closest(".investment-card");
    const investment = state.investments.find((item) => item.id === card.dataset.id);
    if (investment) event.target.value = investment[event.target.dataset.field];
  }
});

list.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-action='remove']");
  if (!removeButton) return;

  const card = removeButton.closest(".investment-card");
  state.investments = state.investments.filter((item) => item.id !== card.dataset.id);
  render();
  saveState();
});

addButton.addEventListener("click", () => {
  state.investments.push({
    id: createId(),
    name: `Investment ${state.investments.length + 1}`,
    type: "lump",
    amount: 0,
    rate: 7,
    years: 10,
    frequency: "monthly",
  });
  render();
  saveState();
  list.lastElementChild?.querySelector("[data-field='name']")?.select();
});

currencyInput.addEventListener("change", () => {
  state.currency = currencyInput.value;
  render();
  saveState();
});

resetButton.addEventListener("click", () => {
  const shouldReset = window.confirm(
    "Reset all investments to the two example portfolios?",
  );
  if (!shouldReset) return;

  state = defaultState();
  render();
  saveState();
});

render();
saveState();
