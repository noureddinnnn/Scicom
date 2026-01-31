const appRoot = document.getElementById("app");
const modal = document.getElementById("modal");
const homeButton = document.getElementById("homeButton");
const resetButton = document.getElementById("resetButton");
const helpButton = document.getElementById("helpButton");
const adminButton = document.getElementById("adminButton");
const closeModalButton = document.getElementById("closeModalButton");

const state = {
  screen: "home",
  zoneIndex: 0,
  name: "",
  avatar: "",
  selections: {},
  results: {},
  data: null,
  copy: null
};

const avatars = ["🧬", "🦎", "🦋", "🐾", "🐘", "🦊"];
const meterRange = { min: -5, max: 5 };

const loadData = async () => {
  const [zonesResponse, copyResponse] = await Promise.all([
    fetch("data/zones.json"),
    fetch("data/copy.json")
  ]);

  state.data = await zonesResponse.json();
  state.copy = await copyResponse.json();
  render();
};

const resetState = () => {
  state.screen = "home";
  state.zoneIndex = 0;
  state.name = "";
  state.avatar = "";
  state.selections = {};
  state.results = {};
};

const setScreen = (screen) => {
  state.screen = screen;
  render();
};

const toggleModal = (open) => {
  if (open) {
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
};

const render = () => {
  if (!state.data || !state.copy) {
    appRoot.innerHTML = "<div class='screen'><p>Loading...</p></div>";
    return;
  }

  if (state.screen === "home") {
    renderHome();
  } else if (state.screen === "create") {
    renderCreate();
  } else if (state.screen === "zone") {
    renderZone();
  } else if (state.screen === "summary") {
    renderSummary();
  } else if (state.screen === "admin") {
    renderAdmin();
  }
};

const renderHome = () => {
  const { home } = state.copy;
  appRoot.innerHTML = `
    <section class="screen">
      <h1>${home.title}</h1>
      <p>${home.intro}</p>
      <div class="button-row">
        <button class="primary-button" id="startButton">${home.start_button}</button>
      </div>
    </section>
  `;

  document.getElementById("startButton").addEventListener("click", () => {
    setScreen("create");
  });
};

const renderCreate = () => {
  const { create } = state.copy;
  appRoot.innerHTML = `
    <section class="screen">
      <h2>${create.title}</h2>
      <label>
        ${create.name_label}
        <input type="text" id="nameInput" placeholder="Name (optional)" value="${state.name}" />
      </label>
      <h3>${create.avatar_label}</h3>
      <div class="avatar-grid" id="avatarGrid"></div>
      <div class="button-row">
        <button class="primary-button" id="toZoneButton">${create.continue_button}</button>
      </div>
    </section>
  `;

  const avatarGrid = document.getElementById("avatarGrid");
  avatarGrid.innerHTML = avatars
    .map(
      (icon) => `
        <button class="avatar-button ${state.avatar === icon ? "selected" : ""}" data-icon="${icon}">
          ${icon}
        </button>
      `
    )
    .join("");

  avatarGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.avatar = button.dataset.icon;
      renderCreate();
    });
  });

  document.getElementById("nameInput").addEventListener("input", (event) => {
    state.name = event.target.value;
  });

  document.getElementById("toZoneButton").addEventListener("click", () => {
    state.zoneIndex = 0;
    setScreen("zone");
  });
};

const renderZone = () => {
  const zone = state.data.zones[state.zoneIndex];
  const selected = state.selections[zone.id] || [];
  const result = state.results[zone.id];

  appRoot.innerHTML = `
    <section class="screen">
      <h2>${zone.title}</h2>
      <p><strong>${zone.prompt}</strong></p>
      <ul>
        ${zone.pressures.map((pressure) => `<li>${pressure}</li>`).join("")}
      </ul>
      <div class="tag">Pick ${zone.pick.count} trait${zone.pick.count > 1 ? "s" : ""} (${selected.length} selected)</div>
      <div class="card-grid" id="optionsGrid"></div>
      <div class="button-row">
        <button class="primary-button" id="testButton" ${selected.length !== zone.pick.count ? "disabled" : ""}>Test survival</button>
      </div>
      <div id="resultPanel"></div>
    </section>
  `;

  const optionsGrid = document.getElementById("optionsGrid");
  optionsGrid.innerHTML = zone.options
    .map(
      (option) => `
        <button class="option-card ${selected.includes(option.id) ? "selected" : ""}" data-id="${option.id}">
          <h4>${option.label}</h4>
          <p>${option.short}</p>
        </button>
      `
    )
    .join("");

  optionsGrid.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.id;
      const current = state.selections[zone.id] || [];
      if (current.includes(id)) {
        state.selections[zone.id] = current.filter((item) => item !== id);
      } else if (current.length < zone.pick.count) {
        state.selections[zone.id] = [...current, id];
      }
      renderZone();
    });
  });

  document.getElementById("testButton").addEventListener("click", () => {
    const computed = computeResult(zone, state.selections[zone.id]);
    state.results[zone.id] = computed;
    renderZone();
  });

  if (result) {
    const resultPanel = document.getElementById("resultPanel");
    resultPanel.innerHTML = renderResultPanel(zone, result);
    document.getElementById("continueButton").addEventListener("click", () => {
      if (state.zoneIndex < state.data.zones.length - 1) {
        state.zoneIndex += 1;
        setScreen("zone");
      } else {
        setScreen("summary");
      }
    });
  }
};

const computeResult = (zone, selectedIds) => {
  const totals = {};
  zone.meters.forEach((meter) => {
    totals[meter.id] = meter.start;
  });

  const selectedOptions = zone.options.filter((option) => selectedIds.includes(option.id));
  selectedOptions.forEach((option) => {
    Object.entries(option.effects).forEach(([key, value]) => {
      totals[key] = (totals[key] || 0) + value;
    });
  });

  const thresholds = zone.survival_rule.thresholds;
  const survived = Object.entries(thresholds).every(([key, value]) => totals[key] >= value);

  return {
    survived,
    totals,
    selectedOptions
  };
};

const renderResultPanel = (zone, result) => {
  const title = result.survived ? zone.result_text.survive_title : zone.result_text.fail_title;
  const takeaway = result.survived ? zone.result_text.survive_takeaway : zone.result_text.fail_takeaway;

  return `
    <div class="result-panel">
      <div class="result-title ${result.survived ? "success" : "fail"}">${title}</div>
      <p>${takeaway}</p>
      <div class="meter-list">
        ${zone.meters
          .map((meter) => renderMeter(meter, result.totals[meter.id], zone.survival_rule.thresholds[meter.id]))
          .join("")}
      </div>
      <h3>Trade-offs</h3>
      <ul>
        ${result.selectedOptions.map((option) => `<li>${option.tradeoff}</li>`).join("")}
      </ul>
      <h3>Examples</h3>
      <ul>
        ${result.selectedOptions
          .map(
            (option) => `
              <li><strong>Human:</strong> ${option.examples.human}</li>
              <li><strong>Animal:</strong> ${option.examples.animal}</li>
            `
          )
          .join("")}
      </ul>
      <div class="button-row">
        <button class="primary-button" id="continueButton">Continue</button>
      </div>
    </div>
  `;
};

const renderMeter = (meter, value, threshold) => {
  const range = meterRange.max - meterRange.min;
  const normalized = Math.max(meterRange.min, Math.min(meterRange.max, value));
  const percent = ((normalized - meterRange.min) / range) * 100;
  const fillWidth = Math.abs(percent - 50);
  const isNegative = percent < 50;

  return `
    <div class="meter">
      <div class="meter-header">
        <span>${meter.label}</span>
        <span>${value} (need ≥ ${threshold})</span>
      </div>
      <div class="meter-bar">
        <div class="meter-fill ${isNegative ? "negative" : ""}" style="--fill:${fillWidth}%;"></div>
      </div>
      <div class="meter-threshold">Scale: ${meterRange.min} to ${meterRange.max}</div>
    </div>
  `;
};

const renderSummary = () => {
  const { summary } = state.copy;
  const name = state.name ? state.name : "Your survivor";
  appRoot.innerHTML = `
    <section class="screen">
      <h2>${summary.title}</h2>
      <p><strong>${name}</strong> ${state.avatar ? `(${state.avatar})` : ""}</p>
      <ul class="summary-list">
        ${state.data.zones
          .map((zone) => {
            const selections = (state.selections[zone.id] || []).map((id) => {
              const option = zone.options.find((item) => item.id === id);
              return option ? option.label : "";
            });
            return `
              <li class="summary-card">
                <h3>${zone.title}</h3>
                <p>${selections.join(", ") || "No traits chosen"}</p>
              </li>
            `;
          })
          .join("")}
      </ul>
      <h3>${summary.big_idea_title}</h3>
      <p>${summary.big_idea_text}</p>
      <div class="button-row">
        <button class="primary-button" id="restartButton">${summary.restart_button}</button>
      </div>
    </section>
  `;

  document.getElementById("restartButton").addEventListener("click", () => {
    resetState();
    render();
  });
};

const renderAdmin = () => {
  const { admin } = state.copy;
  const zones = state.data.zones;
  appRoot.innerHTML = `
    <section class="screen">
      <h2>${admin.title}</h2>
      <p>${admin.description}</p>
      ${zones
        .map(
          (zone) => `
            <div class="admin-section">
              <h3>${zone.title}</h3>
              <p><strong>Prompt:</strong> ${zone.prompt}</p>
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Trait</th>
                    <th>Short</th>
                    <th>Effects</th>
                    <th>Trade-off</th>
                    <th>Human example</th>
                    <th>Animal example</th>
                  </tr>
                </thead>
                <tbody>
                  ${zone.options
                    .map(
                      (option) => `
                        <tr>
                          <td>${option.label}</td>
                          <td>${option.short}</td>
                          <td>${Object.entries(option.effects)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")}</td>
                          <td>${option.tradeoff}</td>
                          <td>${option.examples.human}</td>
                          <td>${option.examples.animal}</td>
                        </tr>
                      `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
        )
        .join("")}
    </section>
  `;
};

homeButton.addEventListener("click", () => {
  resetState();
  render();
});

resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("Reset this run for the next visitor?");
  if (confirmed) {
    resetState();
    render();
  }
});

helpButton.addEventListener("click", () => toggleModal(true));
closeModalButton.addEventListener("click", () => toggleModal(false));

adminButton.addEventListener("click", () => {
  state.screen = state.screen === "admin" ? "home" : "admin";
  render();
});

loadData();
