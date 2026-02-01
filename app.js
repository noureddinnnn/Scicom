const appRoot = document.getElementById("app");
const homeButton = document.getElementById("homeButton");
const resetButton = document.getElementById("resetButton");

// --- 1. Audio Engine (Procedural) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playSound = (type) => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  
  if (type === 'click') {
    osc.frequency.setValueAtTime(400, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'tick') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'win') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  } else if (type === 'fail') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(50, now + 0.5);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }
};

const state = {
  screen: "home",
  zoneIndex: 0,
  avatar: "🐻‍❄️", 
  playerName: "",
  selections: {},
  results: {},
  data: null
};

const avatars = ["🐻‍❄️", "🦒", "🪿", "🐫"];

const loadData = async () => {
  const r = await fetch("data/zones.json");
  state.data = await r.json();
  render();
};

const resetState = () => {
  state.screen = "home";
  state.zoneIndex = 0;
  state.selections = {};
  state.results = {};
  state.playerName = "";
  document.body.className = "";
};

const setScreen = (screen) => {
  playSound('click');
  state.screen = screen;
  render();
};

const render = () => {
  if (!state.data) return;
  
  // Weather & Theme
  appRoot.innerHTML = `<div class="weather-layer"></div><div id="content"></div>`;
  const content = document.getElementById("content");
  
  if (state.screen === 'zone' || state.screen === 'simulation') {
    const zoneId = state.data.zones[state.zoneIndex].id;
    document.body.className = `theme-${zoneId}`;
  } else {
    document.body.className = "";
  }

  let html = "";
  switch(state.screen) {
    case "home": html = renderHome(); break;
    case "create": html = renderCreate(); break;
    case "zone": html = renderZone(); break;
    case "summary": html = renderSummary(); break;
  }
  content.innerHTML = html;

  if (state.screen === "home") document.getElementById("startButton").onclick = () => { audioCtx.resume(); setScreen("create"); };
  if (state.screen === "zone") document.getElementById("testBtn").onclick = () => startSimulation();
};

const renderHome = () => `
  <section class="screen" style="text-align:center">
    <div class="home-hero">
      <h1 class="home-title">Would You Survive?</h1>
      <p class="home-subtitle">Can you maintain homeostasis in extreme environments?</p>
    </div>
    <button class="primary-button" id="startButton">Start Simulation</button>
    <div class="home-credits">
      <span>Created by Noureddin Ismail and Dylan Wimble</span>
      <span>Oxford Museum of Natural History</span>
    </div>
  </section>
`;

const renderCreate = () => `
  <section class="screen">
    <h2>Create Your Organism</h2>
    <label class="input-label" for="playerName">Choose a name</label>
    <input
      id="playerName"
      class="text-input"
      type="text"
      maxlength="20"
      placeholder="Enter your organism name"
      value="${state.playerName}"
      oninput="state.playerName=this.value; playSound('click');"
    />
    <p class="helper-text">Select an avatar (profile picture)</p>
    <div class="avatar-grid">
      ${avatars.map(icon => `
        <button class="avatar-btn ${state.avatar === icon ? 'selected' : ''}" 
                onclick="state.avatar='${icon}'; playSound('click'); render();">
          ${icon}
        </button>
      `).join('')}
    </div>
    <div class="button-row">
      <button class="primary-button" onclick="setScreen('zone')">Enter Zone 1</button>
    </div>
  </section>
`;

const renderZone = () => {
  const zone = state.data.zones[state.zoneIndex];
  const selected = state.selections[zone.id] || [];
  
  return `
    <section class="screen">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h2>${zone.title}</h2>
        <div style="font-size:2rem;">${state.avatar}</div>
      </div>
      <p><strong>Abiotic Factors:</strong> ${zone.prompt}</p>
      <p class="helper-text">
        Pick ${zone.pick.count} factor${zone.pick.count === 1 ? "" : "s"}. Hint: ${zone.hint}
      </p>
      
      <div class="card-grid">
        ${zone.options.map(opt => `
          <button class="option-card ${selected.includes(opt.id) ? 'selected' : ''}" 
                  onclick="toggleSelection('${zone.id}', '${opt.id}')">
            <span class="category-tag cat-${opt.category.toLowerCase()}">${opt.category}</span>
            <h4>${opt.label}</h4>
            <p>${opt.short}</p>
          </button>
        `).join('')}
      </div>

      <div class="button-row">
        <button class="primary-button" id="testBtn" ${selected.length !== zone.pick.count ? 'disabled' : ''}>
          Begin Simulation
        </button>
      </div>
      <div id="simPanel"></div>
    </section>
  `;
};

window.toggleSelection = (zoneId, optId) => {
  playSound('click');
  const zone = state.data.zones.find(z => z.id === zoneId);
  let current = state.selections[zoneId] || [];
  
  if (current.includes(optId)) {
    current = current.filter(id => id !== optId);
  } else if (current.length < zone.pick.count) {
    current.push(optId);
  }
  
  state.selections[zoneId] = current;
  render();
};

const startSimulation = () => {
  const zone = state.data.zones[state.zoneIndex];
  const selectedIds = state.selections[zone.id];
  const computed = computeResult(zone, selectedIds);
  state.results[zone.id] = computed;

  const panel = document.getElementById("simPanel");
  document.getElementById("testBtn").style.display = 'none';

  panel.innerHTML = `
    <div class="sim-container">
      <h3>Simulating Environment...</h3>
      <div class="sim-avatar">${state.avatar}</div>
      <div class="graph-container">
        <canvas id="liveGraph" width="600" height="150"></canvas>
      </div>
      <div id="simLog">Initializing homeostasis...</div>
    </div>
  `;

  let hp = 100;
  let tick = 0;
  const history = [100];
  const canvas = document.getElementById("liveGraph");
  
  const timer = setInterval(() => {
    tick++;
    playSound('tick');
    
    // If they survived, slight decay. If failed, heavy damage.
    const damage = computed.survived ? 0.5 : 4.0;
    hp -= (damage + Math.random());
    history.push(hp);
    
    drawGraph(canvas, history);
    
    if (tick >= 40 || hp <= 0) {
      clearInterval(timer);
      showResult(zone, computed, hp > 0);
    }
  }, 80);
};

const drawGraph = (canvas, data) => {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#00d2d3';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const step = w / 40; 
  data.forEach((val, i) => {
    const y = h - ((val / 100) * h);
    if (i===0) ctx.moveTo(0, y); else ctx.lineTo(i * step, y);
  });
  ctx.stroke();
};

const showResult = (zone, result, alive) => {
  const isSuccess = result.survived;
  playSound(isSuccess ? 'win' : 'fail');
  const panel = document.getElementById("simPanel");
  
  // Match Logic
  let matchHtml = '';
  if (isSuccess && zone.matches) {
    const selectedIds = state.selections[zone.id];
    const match = zone.matches.find(m => m.traits.every(t => selectedIds.includes(t)));
    if (match) {
      matchHtml = `
        <div class="match-card">
          <h3>🌟 EVOLUTION MATCH: ${match.animal}</h3>
          <p>${match.desc}</p>
        </div>
      `;
    }
  }

  const title = isSuccess ? zone.result_text.survive_title : zone.result_text.fail_title;
  const color = isSuccess ? "var(--success)" : "var(--danger)";
  let reason = isSuccess ? zone.result_text.survive_takeaway : `Failure Reason: ${result.failedMeters.join(" & ")} levels were too low.`;

  panel.innerHTML = `
    <div class="result-panel" style="margin-top:2rem; padding-top:1rem; border-top:2px solid ${color}">
      <h2 style="color:${color}">${title}</h2>
      ${matchHtml}
      <p><strong>${reason}</strong></p>
      
      <div class="meters-container">
        ${zone.meters.map(m => renderBar(m, result.totals[m.id])).join('')}
      </div>

      <button class="primary-button" onclick="nextZone()">
        ${state.zoneIndex < state.data.zones.length - 1 ? "Next Zone" : "View Final Summary"}
      </button>
    </div>
  `;
};

const renderBar = (meter, value) => {
  const min = meter.min;
  // Normalize visually for display
  const displayVal = Math.max(-3, Math.min(5, value)); 
  const percent = ((displayVal + 3) / 8) * 100;
  const thresholdPercent = ((min + 3) / 8) * 100;
  
  const isOk = value >= min;
  const color = isOk ? 'var(--success)' : 'var(--danger)';

  return `
    <div class="meter-box">
      <div class="meter-label">
        <span>${meter.label}</span>
        <span>${value} (Need ${min})</span>
      </div>
      <div class="meter-track">
        <div class="meter-threshold-line" style="left:${thresholdPercent}%"></div>
        <div class="meter-fill" style="width:${percent}%; background-color:${color}"></div>
      </div>
    </div>
  `;
};

const computeResult = (zone, selectedIds) => {
  const totals = {};
  zone.meters.forEach(m => totals[m.id] = m.start);
  const options = zone.options.filter(o => selectedIds.includes(o.id));
  options.forEach(o => {
    Object.entries(o.effects).forEach(([k, v]) => totals[k] = (totals[k]||0) + v);
  });

  const failedMeters = [];
  const passed = zone.meters.every(m => {
    const val = totals[m.id];
    if (val < m.min) failedMeters.push(m.label);
    return val >= m.min;
  });

  return { survived: passed, totals, failedMeters };
};

const nextZone = () => {
  if (state.zoneIndex < state.data.zones.length - 1) {
    state.zoneIndex++;
    setScreen("zone");
  } else {
    setScreen("summary");
  }
};

const renderSummary = () => {
  const wins = Object.values(state.results).filter(r=>r.survived).length;
  const totalZones = state.data.zones.length;
  const survivalRate = Math.round((wins / totalZones) * 100);
  const adaptations = state.data.zones.map(zone => {
    const selectedIds = state.selections[zone.id] || [];
    const selectedLabels = zone.options
      .filter(opt => selectedIds.includes(opt.id))
      .map(opt => opt.label);
    const summaryText = selectedLabels.length ? selectedLabels.join(", ") : "No adaptations selected.";
    return `
      <li>
        <strong>${zone.title}:</strong> ${summaryText}
      </li>
    `;
  }).join("");
  const lessonText = wins === totalZones
    ? "Perfect balance! You matched every environment by combining traits that reinforced each other."
    : wins === 0
      ? "Every environment pushed your organism past its limits. Next time, pair traits that cover both pressures in each biome."
      : "You survived some environments by pairing complementary traits. Aim for balance across heat, energy, and oxygen needs.";
  appRoot.innerHTML = `
    <section class="screen" style="text-align:center">
      <h1>Evolution Complete</h1>
      <div style="font-size:4rem; margin:1rem;">${state.avatar}</div>
      <h2>${state.playerName ? `${state.playerName}, ` : ""}you survived ${wins} / ${totalZones} environments</h2>
      <p style="font-size:1.1rem; margin:0.5rem 0 0;">Survival rate: <strong>${survivalRate}%</strong></p>
      <p class="helper-text" style="margin-top:0.75rem;">${lessonText}</p>
      <div class="summary-section" style="margin-top:1.5rem; text-align:left;">
        <h3>Chosen Adaptations Summary</h3>
        <ul class="summary-list">
          ${adaptations}
        </ul>
      </div>
      <button class="primary-button" onclick="resetState(); render();">Evolve Again</button>
    </section>
  `;
};

homeButton.onclick = () => { resetState(); render(); };
resetButton.onclick = () => { resetState(); render(); };

loadData();
