const $ = (id) => document.getElementById(id);
const money = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
const num = (id) => Math.max(0, Number($(id).value) || 0);

let down = 10;
let prices = [650000, 750000, 850000, 950000];

function annualEffective(rate) {
  return Math.pow(1 + rate / 200, 2) - 1;
}

function periodRate(rate, periods) {
  return Math.pow(1 + annualEffective(rate), 1 / periods) - 1;
}

function pmt(balance, rate, n) {
  if (n <= 0) return 0;
  return rate === 0 ? balance / n : (balance * rate) / (1 - Math.pow(1 + rate, -n));
}

function minimumDown(price) {
  return price >= 1500000
    ? price * 0.2
    : Math.min(price, 500000) * 0.05 + Math.max(0, price - 500000) * 0.1;
}

function params(price) {
  const minimum = minimumDown(price);
  const d = Math.max(minimum, (price * down) / 100);
  const base = price - d;
  const actual = price ? d / price : 0;
  const insured = price > 0 && actual < 0.2 - 1e-9;
  const eligible = !insured || price < 1500000;
  const premiumRate = insured
    ? (actual >= 0.15 - 1e-9 ? 0.028 : actual >= 0.1 - 1e-9 ? 0.031 : 0.04) +
      (Number($("amort").value) > 25 ? 0.002 : 0)
    : 0;
  const premium = base * premiumRate;
  const loan = base + premium;
  return { price, d, base, premiumRate, premium, loan, tax: premium * 0.08, eligible, insured, actual, minimum };
}

function calc(price) {
  const x = params(price);
  const freq = $("frequency").value;
  const rate = num("rate");
  const newRate = num("renewalRate");
  const years = Number($("amort").value);
  const extra = num("extra");
  const extraFreq = $("extraFreq").value;
  const periodic = freq === "monthly" ? 12 : 26;
  const monthly = pmt(x.loan, periodRate(rate, 12), years * 12);
  const payment =
    freq === "monthly"
      ? monthly
      : freq === "biweekly"
        ? monthly / 2
        : pmt(x.loan, periodRate(rate, 26), years * 26);
  const maxPeriods = periodic * 100;
  const renewalPeriod = 3 * periodic;

  let bal = x.loan;
  let interest3 = 0;
  let totalInterest = 0;
  let paid3 = 0;
  let periods = 0;
  let renewBalance = 0;
  let renewPayment = 0;
  let renewScheduled = 0;

  for (let i = 1; i <= maxPeriods && bal > 0.005; i++) {
    const post = i > renewalPeriod;
    const ir = periodRate(post ? newRate : rate, periodic);

    if (i === renewalPeriod + 1) {
      renewBalance = bal;
      const remaining = Math.max(1, years * periodic - renewalPeriod);
      renewScheduled =
        freq === "biweekly"
          ? pmt(bal, periodRate(newRate, 12), Math.max(1, (years - 3) * 12)) / 2
          : pmt(bal, ir, remaining);
      renewPayment = renewScheduled;
    }

    const scheduled = post ? renewScheduled : payment;
    const interest = bal * ir;
    let extraThis = 0;
    if (extraFreq === "monthly") {
      // Bi-weekly periods receive the equivalent annual amount spread over 26 payments.
      extraThis = periodic === 12 ? extra : (extra * 12) / 26;
    } else if (i % periodic === 0) {
      extraThis = extra;
    }

    const principal = Math.min(bal, Math.max(0, scheduled + extraThis - interest));
    if (principal <= 0) break;

    bal -= principal;
    totalInterest += interest;
    if (i <= renewalPeriod) {
      interest3 += interest;
      paid3 += principal;
    }
    periods = i;
    if (i === renewalPeriod) renewBalance = bal;
  }

  if (periods < renewalPeriod) {
    renewBalance = 0;
    renewPayment = 0;
  }

  const monthlyEq = (payment * periodic) / 12;
  const extraMonthly = extra * (extraFreq === "monthly" ? 1 : 1 / 12);
  return {
    ...x,
    payment,
    monthlyEq,
    extraMonthly,
    renewBalance,
    renewPayment,
    interest3,
    paid3,
    totalInterest,
    payoffYears: periods / periodic,
    frequency: freq,
    rate,
    newRate,
    years,
    periodic,
  };
}

function update() {
  const price = num("price");
  const x = calc(price);
  const frequency = $("frequency").value;
  const exp = num("expenses");

  document.querySelector('[data-down="5"]').textContent =
    `Min ${price ? ((100 * x.minimum) / price).toFixed(2) : "0.00"}%`;
  $("downHelp").textContent =
    `Required minimum: ${money(x.minimum)}. Applied down payment: ${money(x.d)} (${(x.actual * 100).toFixed(2)}%). Lower selections are automatically raised to the legal minimum.`;

  $("payment").textContent = money(x.payment);
  $("frequencyLabel").textContent =
    frequency === "monthly"
      ? "per month"
      : frequency === "biweekly"
        ? "per accelerated bi-weekly payment"
        : "per regular bi-weekly payment";
  $("monthlyEquivalent").textContent = money(x.monthlyEq);
  $("loan").textContent = money(x.loan);
  $("downAmount").textContent = money(x.d);
  $("balance3").textContent = money(x.renewBalance);
  $("renewPayment").textContent = money(x.renewPayment);
  $("renewLabel").textContent =
    frequency === "monthly" ? "per month from year 4" : "per bi-weekly payment from year 4";

  $("budget").textContent = money(x.monthlyEq + x.extraMonthly + exp);
  $("budgetDetails").textContent =
    `${money(x.monthlyEq)} mortgage + ${money(x.extraMonthly)} extra + ${money(exp)} expenses`;
  const renewMonthly = (x.renewPayment * x.periodic) / 12;
  $("renewBudget").textContent = money(renewMonthly + x.extraMonthly + exp);
  $("renewBudgetDetails").textContent =
    `${money(renewMonthly)} mortgage + ${money(x.extraMonthly)} extra + ${money(exp)} expenses`;

  const amounts = {
    baseLoan: x.base,
    cmhc: x.premium,
    tax: x.tax,
    cash: x.d + x.tax,
    principal3: x.paid3,
    interest3: x.interest3,
    totalInterest: x.totalInterest,
  };
  for (const [id, value] of Object.entries(amounts)) $(id).textContent = money(value);

  $("cmhcRate").textContent = x.premiumRate ? `${(x.premiumRate * 100).toFixed(2)}%` : "None";
  $("frequencyHelp").textContent =
    frequency === "monthly"
      ? "Monthly payments: 12 payments per year."
      : frequency === "regular"
        ? "Regular bi-weekly: 26 smaller payments per year, with a payoff timeline close to monthly."
        : "Accelerated bi-weekly: each payment is half the monthly amount, equal to 13 monthly payments a year, shortening your payoff.";
  $("payoff").textContent = x.payoffYears
    ? `${Math.floor(x.payoffYears)} years, ${Math.round((x.payoffYears % 1) * 12)} months`
    : "Not amortizing";

  const total = x.loan + x.totalInterest;
  $("principalBar").style.width = `${total ? (100 * x.loan) / total : 0}%`;
  $("interestBar").style.width = `${total ? (100 * x.totalInterest) / total : 0}%`;

  const warnings = [];
  if (!x.eligible) {
    warnings.push("This down payment may not meet Canadian minimum requirements or the insured mortgage price cap.");
  }
  if (x.years === 30 && x.insured) {
    warnings.push("30-year insured amortization is available only to eligible borrowers (such as first-time homebuyers or buyers of new builds); confirm eligibility.");
  }
  if (x.price <= 0) warnings.push("Enter a home purchase price.");
  $("notice").hidden = warnings.length === 0;
  $("notice").textContent = warnings.join(" ");

  renderComparison(price, frequency, exp);
}

function renderComparison(currentPrice, frequency, exp) {
  $("compareRows").innerHTML = prices
    .map((p, i) => {
      const a = calc(p);
      return `<tr class="${p === currentPrice ? "current" : ""}">
        <td data-label="Purchase price"><input class="compare-price" aria-label="Comparison home price ${i + 1}" type="number" min="0" step="1000" value="${p}" data-index="${i}"></td>
        <td data-label="Down payment"><strong>${money(a.d)}</strong><small>${(a.actual * 100).toFixed(2)}%</small></td>
        <td data-label="CMHC premium">${money(a.premium)}</td>
        <td data-label="Mortgage">${money(a.loan)}</td>
        <td data-label="Payment"><strong>${money(a.payment)}</strong><small>${frequency === "monthly" ? "per month" : "per 2 weeks"}</small></td>
        <td data-label="Monthly budget"><strong>${money(a.monthlyEq + a.extraMonthly + exp)}</strong><small>per month</small></td>
        <td data-label="3-year balance">${money(a.renewBalance)}</td>
        <td class="compare-action"><button class="compare-remove" type="button" data-remove="${i}" aria-label="Remove ${money(p)} comparison">×</button></td>
      </tr>`;
    })
    .join("");
}

const storageKey = "ontario-mortgage-planner:v1";
const fieldIds = ["price", "rate", "amort", "frequency", "extra", "extraFreq", "renewalRate", "expenses"];
const defaults = {
  fields: Object.fromEntries(fieldIds.map((id) => [id, $(id).value])),
  down,
  prices: [...prices],
};

function setStatus(message, isError = false) {
  $("storageStatus").textContent = message;
  $("storageStatus").classList.toggle("is-error", isError);
}

function saveSettings() {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        fields: Object.fromEntries(fieldIds.map((id) => [id, $(id).value])),
        down,
        prices,
      }),
    );
    setStatus("Settings are saved automatically on this device.");
  } catch {
    setStatus("Browser storage is unavailable; changes will not persist.", true);
  }
}

function syncDownButtons() {
  document.querySelectorAll("[data-down]").forEach((el) => {
    const isActive = Number(el.dataset.down) === down;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-pressed", String(isActive));
  });
}

function applySettings(state) {
  for (const id of fieldIds) {
    const value = state.fields?.[id];
    const el = $(id);
    if (
      typeof value === "string" &&
      (el.tagName !== "SELECT" || Array.from(el.options).some((o) => o.value === value))
    ) {
      el.value = value;
    }
  }
  if ([5, 10, 15, 20].includes(state.down)) down = state.down;
  if (
    Array.isArray(state.prices) &&
    state.prices.every((p) => typeof p === "number" && Number.isFinite(p) && p >= 0)
  ) {
    prices = [...state.prices];
  }
  syncDownButtons();
}

try {
  const saved = localStorage.getItem(storageKey);
  if (saved) applySettings(JSON.parse(saved));
} catch {
  setStatus("Saved settings could not be restored.", true);
}

function refresh() {
  update();
  saveSettings();
}

$("downBtns").addEventListener("click", (e) => {
  const button = e.target.closest("[data-down]");
  if (!button) return;
  down = Number(button.dataset.down);
  syncDownButtons();
  refresh();
});

fieldIds.forEach((id) => {
  $(id).addEventListener("input", refresh);
  $(id).addEventListener("change", refresh);
});

$("compareRows").addEventListener("input", (e) => {
  if (e.target.dataset.index === undefined) return;
  prices[Number(e.target.dataset.index)] = Math.max(0, Number(e.target.value) || 0);
  saveSettings();
});

$("compareRows").addEventListener("change", (e) => {
  if (e.target.dataset.index === undefined) return;
  prices[Number(e.target.dataset.index)] = Math.max(0, Number(e.target.value) || 0);
  refresh();
});

$("compareRows").addEventListener("click", (e) => {
  const button = e.target.closest("[data-remove]");
  if (!button) return;
  prices.splice(Number(button.dataset.remove), 1);
  refresh();
});

$("addPrice").addEventListener("click", () => {
  prices.push((prices.at(-1) || num("price")) + 50000);
  refresh();
});

$("resetSettings").addEventListener("click", () => {
  if (!confirm("Reset all calculator settings and comparison prices to defaults?")) return;
  applySettings(defaults);
  refresh();
});

refresh();
