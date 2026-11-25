const tools = [
  {
    name: "Ontario Mortgage Planner",
    description:
      "Compare home prices, down payments, renewal scenarios, and monthly budgets with all calculations performed on your device.",
    category: "Finance",
    url: "on-mortgage-calc.html",
    accent: "#286349",
    tint: "#e3f0e8",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 11 9-8 9 8"></path>
        <path d="M5.5 9.5V21h13V9.5"></path>
        <path d="M9 21v-7h6v7"></path>
      </svg>
    `,
  },
  {
    name: "Portfolio Worth Projector",
    description:
      "Combine lump-sum and recurring investments, each with its own return and timeline, to project your total portfolio worth.",
    category: "Finance",
    url: "portfolio-worth.html",
    accent: "#315baf",
    tint: "#e5ebf7",
    icon: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V9"></path>
        <path d="M10 19V5"></path>
        <path d="M16 19v-7"></path>
        <path d="M22 19V3"></path>
        <path d="M2 19h21"></path>
        <path d="m3 7 6-4 6 4 7-5"></path>
      </svg>
    `,
  },
];

const searchInput = document.querySelector("#tool-search");
const filters = document.querySelector("#tool-filters");
const grid = document.querySelector("#tool-grid");
const emptyState = document.querySelector("#empty-state");
const total = document.querySelector("#tool-total");

let activeCategory = "All";

function createCard(tool) {
  const card = document.createElement("a");
  card.className = "tool-card";
  card.href = tool.url;
  card.style.setProperty("--card-accent", tool.accent);
  card.style.setProperty("--card-tint", tool.tint);
  card.setAttribute("aria-label", `Open ${tool.name}`);
  card.innerHTML = `
    <div class="tool-card-top">
      <span class="tool-icon">${tool.icon}</span>
      <span class="tool-status">Ready</span>
    </div>
    <h3>${tool.name}</h3>
    <p class="tool-card-description">${tool.description}</p>
    <div class="tool-card-bottom">
      <span class="tool-category">${tool.category}</span>
      <span class="tool-open">Open tool <i aria-hidden="true">↗</i></span>
    </div>
  `;
  return card;
}

function renderTools() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const visibleTools = tools.filter((tool) => {
    const matchesCategory =
      activeCategory === "All" || tool.category === activeCategory;
    const searchable = `${tool.name} ${tool.description} ${tool.category}`.toLocaleLowerCase();
    return matchesCategory && searchable.includes(query);
  });

  grid.replaceChildren(...visibleTools.map(createCard));
  emptyState.hidden = visibleTools.length > 0;
}

function renderFilters() {
  const categories = ["All", ...new Set(tools.map((tool) => tool.category))];

  for (const category of categories) {
    const button = document.createElement("button");
    button.className = "filter-button";
    button.type = "button";
    button.textContent = category;
    button.classList.toggle("is-active", category === activeCategory);
    button.setAttribute("aria-pressed", String(category === activeCategory));
    button.addEventListener("click", () => {
      activeCategory = category;
      filters.querySelectorAll(".filter-button").forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });
      renderTools();
    });
    filters.append(button);
  }
}

searchInput.addEventListener("input", renderTools);

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement;

  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    searchInput.focus();
  }
});

total.textContent = String(tools.length);
renderFilters();
renderTools();
