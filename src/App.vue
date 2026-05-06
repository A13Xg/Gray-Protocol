<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { state } from "./core/state";
import { startGameLoop, stopGameLoop } from "./core/engine";
import { saveGame, loadGame, exportSave, importSave, hasSavedData, forceDeleteAllSavedData } from "./core/persistence";
import { executeAction, ACTION_DEFINITIONS, getReputationAlignment } from "./core/actions";
import { convertMoneyToCrypto, getCryptoPrice } from "./core/crypto";
import { format } from "./utils/formatter";
import Decimal from "break_eternity.js";
import {
  GENERATOR_CONFIGS,
  GENERATORS,
  executeManualGenerator,
  startTimedGenerator,
  upgradeGenerator,
} from "./core/generators";

onMounted(() => {
  loadGame();
  startGameLoop();
});

onUnmounted(() => {
  saveGame();
  stopGameLoop();
});

const fmtMoney      = computed(() => format(state.resources.money));
const fmtCrypto     = computed(() => format(state.resources.crypto));
const fmtCompute    = computed(() => format(state.resources.compute));
const fmtReputation = computed(() => format(state.resources.reputation));
const assetBase = import.meta.env.BASE_URL;
const hatLogoSrc = `${assetBase}branding/GrayProtocol-Hat.png`;
const wordmarkSrc = `${assetBase}branding/GrayProtocol-Logo.png`;

const alignment = computed(() => getReputationAlignment(state.resources.reputation));

const currentPrice = computed(() => {
  const elapsed = Date.now() - state.timestamps.createdAt;
  return format(getCryptoPrice(elapsed), 4);
});

const lastOutcome   = ref<string>("");
const convertAmount = ref("1");
const importInput   = ref("");
const debugMessage  = ref("");

function runAction(actionId: string): void {
  const outcome = executeAction(state, actionId);
  if (!outcome) return;
  const def = ACTION_DEFINITIONS[actionId];
  const rep = outcome.reputationDelta.gte(0)
    ? `+${format(outcome.reputationDelta)} REP`
    : `${format(outcome.reputationDelta)} REP`;
  lastOutcome.value = `${def.name}: +$${format(outcome.rewardApplied)} money  |  ${rep}`;
}

function onConvert(): void {
  const amount = new Decimal(Number(convertAmount.value) || 0);
  const result = convertMoneyToCrypto(state, amount);
  if (!result) {
    lastOutcome.value = "Conversion failed: insufficient money or invalid amount";
    return;
  }
  lastOutcome.value =
    `Converted $${format(result.paid)} → ${format(result.received, 4)} CR  @  $${format(result.pricePerUnit, 4)}/CR`;
}

function onSave(): void  { saveGame(); }
function onExport(): void { importInput.value = exportSave(); }
function onImport(): void {
  if (importSave(importInput.value)) {
    importInput.value = "";
    debugMessage.value = "Save imported successfully";
  } else {
    debugMessage.value = "Import failed: invalid data";
  }
}

function onForceDelete(): void {
  if (!window.confirm("Delete all saved data and reset?")) return;
  if (window.prompt('Type DELETE to confirm') !== "DELETE") {
    debugMessage.value = "Cancelled";
    return;
  }
  forceDeleteAllSavedData();
  lastOutcome.value = "";
  debugMessage.value = "State reset";
}

// ── Generator helpers ─────────────────────────────────────────────────────

const manualGenerators = computed(() =>
  Object.values(GENERATOR_CONFIGS).filter((c) => c.type === "manual")
);
const passiveGenerators = computed(() =>
  Object.values(GENERATOR_CONFIGS).filter((c) => c.type === "passive")
);
const timedGenerators = computed(() =>
  Object.values(GENERATOR_CONFIGS).filter((c) => c.type === "timed")
);

function genLevel(id: string): number {
  return state.generators.levels[id] ?? GENERATOR_CONFIGS[id]?.level ?? 1;
}

function timedProgress(id: string): number {
  const p = state.generators.timedProgress[id];
  if (!p || p.completed) return 0;
  const duration = GENERATOR_CONFIGS[id]?.durationMs ?? 1;
  return Math.min(100, (p.progressMs / duration) * 100);
}

function timedCompleted(id: string): boolean {
  return state.generators.timedProgress[id]?.completed ?? false;
}

function timedInProgress(id: string): boolean {
  const p = state.generators.timedProgress[id];
  return !!p && !p.completed;
}

function isUnlocked(id: string): boolean {
  return GENERATORS[id]?.isUnlocked(state) ?? true;
}

function runManualGenerator(id: string): void {
  const result = executeManualGenerator(state, id);
  if (!result) return;
  const cfg = GENERATOR_CONFIGS[id];
  const moneyOut = result.outputs.money;
  const repOut = result.reputationDelta;
  const parts: string[] = [cfg.name];
  if (moneyOut) parts.push(`+$${format(moneyOut)}`);
  if (repOut && !repOut.eq(0)) parts.push(`${repOut.gte(0) ? "+" : ""}${format(repOut)} REP`);
  lastOutcome.value = parts.join("  |  ");
}

function onUpgradeGenerator(id: string): void {
  const upgraded = upgradeGenerator(state, id);
  const cfg = GENERATOR_CONFIGS[id];
  lastOutcome.value = upgraded
    ? `${cfg.name} upgraded to level ${genLevel(id)}`
    : `${cfg.name} is already at max level`;
}

function onStartTimed(id: string): void {
  const started = startTimedGenerator(state, id);
  const cfg = GENERATOR_CONFIGS[id];
  lastOutcome.value = started
    ? `${cfg.name} started (${((cfg.durationMs ?? 0) / 1000).toFixed(0)}s)`
    : timedInProgress(id)
    ? `${cfg.name} is already in progress`
    : `${cfg.name} failed: check inputs`;
}
</script>
<template>
  <div class="root">
    <header class="masthead card">
      <div class="brand-lockup">
        <img class="brand-hat" :src="hatLogoSrc" alt="Gray Protocol hat logo" />
        <div>
          <div class="brand-title-row">
            <h1>Gray Protocol</h1>
            <span class="version">v{{ state.version }}</span>
          </div>
          <p class="brand-subtitle">Operator console for gray-hat protocol escalation.</p>
        </div>
      </div>
      <img class="brand-wordmark" :src="wordmarkSrc" alt="Gray Protocol logo" />
    </header>

    <section class="card">
      <h2>Resources</h2>
      <div class="row"><span>$Money</span><strong>{{ fmtMoney }}</strong></div>
      <div class="row"><span>Crypto</span><strong>{{ fmtCrypto }} CR</strong></div>
      <div class="row"><span>Compute</span><strong>{{ fmtCompute }} Tflops</strong></div>
      <div class="row">
        <span>Reputation</span>
        <strong :class="alignment">{{ fmtReputation }} REP &mdash; {{ alignment }}</strong>
      </div>
    </section>

    <section class="card">
      <h2>Manual Actions</h2>
      <div class="action-grid">
        <div class="action">
          <div class="action-header">
            <strong>Pentest System</strong>
            <em class="tag whitehat">whitehat</em>
          </div>
          <div class="action-desc">+$1 money &nbsp; +1 REP</div>
          <button @click="runAction('pentestSystem')">Execute Pentest</button>
        </div>

        <div class="action">
          <div class="action-header">
            <strong>Exploit System</strong>
            <em class="tag blackhat">blackhat</em>
          </div>
          <div class="action-desc">+$1 money &nbsp; &minus;1 REP</div>
          <button @click="runAction('exploitSystem')">Execute Exploit</button>
        </div>
      </div>
      <p class="outcome" v-if="lastOutcome">{{ lastOutcome }}</p>
    </section>

    <!-- ── Manual Generators ─────────────────────────────────────────── -->
    <section class="card">
      <h2>Manual Generators</h2>
      <div class="action-grid">
        <div class="action" v-for="cfg in manualGenerators" :key="cfg.id">
          <div class="action-header">
            <strong>{{ cfg.name }}</strong>
            <em class="tag" :class="cfg.path">{{ cfg.path }}</em>
            <span class="level-badge">Lv {{ genLevel(cfg.id) }}/{{ cfg.maxLevel }}</span>
          </div>
          <div class="action-desc">{{ cfg.description }}</div>
          <div class="controls">
            <button @click="runManualGenerator(cfg.id)" :disabled="!isUnlocked(cfg.id)">
              Run
            </button>
            <button @click="onUpgradeGenerator(cfg.id)" :disabled="genLevel(cfg.id) >= cfg.maxLevel">
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Passive Generators ────────────────────────────────────────── -->
    <section class="card">
      <h2>Passive Generators</h2>
      <p class="muted small">Running automatically each engine tick.</p>
      <div class="gen-list">
        <div class="gen-row" v-for="cfg in passiveGenerators" :key="cfg.id">
          <div class="gen-info">
            <strong>{{ cfg.name }}</strong>
            <em class="tag" :class="cfg.path">{{ cfg.path }}</em>
            <span class="level-badge">Lv {{ genLevel(cfg.id) }}/{{ cfg.maxLevel }}</span>
          </div>
          <div class="action-desc">{{ cfg.description }}</div>
          <div class="gen-outputs">
            <span v-for="(amt, key) in cfg.outputResources" :key="key">
              {{ key }}: {{ format(amt) }}/s ×Lv{{ genLevel(cfg.id) }}
            </span>
          </div>
          <button @click="onUpgradeGenerator(cfg.id)" :disabled="genLevel(cfg.id) >= cfg.maxLevel">
            Upgrade
          </button>
        </div>
      </div>
    </section>

    <!-- ── Timed Generators ──────────────────────────────────────────── -->
    <section class="card">
      <h2>Timed Production</h2>
      <div class="gen-list">
        <div class="gen-row" v-for="cfg in timedGenerators" :key="cfg.id">
          <div class="gen-info">
            <strong>{{ cfg.name }}</strong>
            <em class="tag" :class="cfg.path">{{ cfg.path }}</em>
            <span class="level-badge">Lv {{ genLevel(cfg.id) }}/{{ cfg.maxLevel }}</span>
          </div>
          <div class="action-desc">{{ cfg.description }}</div>
          <div class="gen-inputs" v-if="cfg.inputResources">
            Cost:
            <span v-for="(amt, key) in cfg.inputResources" :key="key">{{ key }} {{ format(amt) }} </span>
          </div>
          <div class="gen-outputs">
            Yields:
            <span v-for="(amt, key) in cfg.outputResources" :key="key">{{ key }} {{ format(amt) }} </span>
            <span class="muted">({{ (cfg.durationMs! / 1000).toFixed(0) }}s)</span>
          </div>
          <div v-if="timedInProgress(cfg.id)" class="progress-wrap">
            <div class="progress-bar" :style="{ width: timedProgress(cfg.id) + '%' }"></div>
            <span class="progress-label">{{ timedProgress(cfg.id).toFixed(1) }}%</span>
          </div>
          <div v-else-if="timedCompleted(cfg.id)" class="muted small">✓ Complete</div>
          <div class="controls">
            <button @click="onStartTimed(cfg.id)" :disabled="timedInProgress(cfg.id)">
              {{ timedInProgress(cfg.id) ? "In Progress…" : "Start" }}
            </button>
            <button @click="onUpgradeGenerator(cfg.id)" :disabled="genLevel(cfg.id) >= cfg.maxLevel">
              Upgrade
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2>Crypto Market</h2>
      <div class="row"><span>Current Price</span><strong>${{ currentPrice }} / CR</strong></div>
      <div class="controls">
        <label>$Money to convert</label>
        <input v-model="convertAmount" type="number" min="0.01" step="1" />
        <button @click="onConvert">Buy Crypto</button>
      </div>
      <p class="muted small">Price oscillates every 60&nbsp;s&nbsp;&bull;&nbsp;Range: $0.10&ndash;$10.00 / CR</p>
    </section>

    <section class="card">
      <h2>Save</h2>
      <div class="controls">
        <button @click="onSave">Save</button>
        <button @click="onExport">Export</button>
        <button @click="onImport">Import</button>
      </div>
      <textarea v-model="importInput" rows="3" placeholder="Paste exported save here" />
    </section>

    <section class="card">
      <h2>Log</h2>
      <div class="log">
        <div v-for="(entry, i) in state.log" :key="i">{{ entry }}</div>
        <div v-if="state.log.length === 0" class="muted">No events yet.</div>
      </div>
    </section>

    <section class="card">
      <details>
        <summary class="debug-toggle">Debug</summary>
        <div class="debug-grid">
          <div class="row"><span>Saved data present</span><strong>{{ hasSavedData() ? "Yes" : "No" }}</strong></div>
          <div class="row"><span>Session start</span><strong>{{ new Date(state.timestamps.createdAt).toLocaleString() }}</strong></div>
          <div class="row"><span>Last saved</span><strong>{{ new Date(state.timestamps.lastSavedAt).toLocaleString() }}</strong></div>
        </div>
        <div class="controls" style="margin-top:8px">
          <button class="danger" @click="onForceDelete">Force Delete All Data</button>
        </div>
        <p v-if="debugMessage" class="muted">{{ debugMessage }}</p>
      </details>
    </section>
  </div>
</template>

<style scoped>
.root {
  font-family: "Courier New", monospace;
  max-width: 720px;
  margin: 0 auto;
  padding: 14px;
  color: #d8f5d8;
}
h1 { margin: 0; font-size: 22px; }
.version { font-size: 12px; opacity: 0.6; }

.masthead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand-lockup {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.brand-hat {
  width: 52px;
  height: 52px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(136, 255, 136, 0.18));
}

.brand-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.brand-subtitle {
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.7;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.brand-wordmark {
  width: min(220px, 38vw);
  height: auto;
  object-fit: contain;
}

.card {
  border: 1px solid #335033;
  background: #0f170f;
  padding: 12px;
  margin-bottom: 12px;
}
h2 { margin: 0 0 10px; font-size: 14px; letter-spacing: 0.04em; }

.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
  font-size: 13px;
}

.whitehat { color: #88ff88; }
.greyhat  { color: #d8f5d8; }
.blackhat { color: #ff8888; }

.action-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.action {
  flex: 1;
  min-width: 220px;
  border: 1px solid #243624;
  padding: 10px;
  font-size: 13px;
}
.action-header { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
.action-desc { opacity: 0.65; font-size: 11px; margin-bottom: 8px; }

.tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 2px;
  opacity: 0.85;
  font-style: normal;
}
.tag.whitehat { background: #1a3a1a; color: #88ff88; }
.tag.blackhat { background: #3a1a1a; color: #ff8888; }

.controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;
}

button {
  border: 1px solid #3e6a3e;
  background: #163016;
  color: #d8f5d8;
  padding: 5px 10px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
}
button:hover { background: #1e421e; }
.danger { border-color: #8f3d3d; background: #2e1414; color: #ffcccc; }

input[type="number"] {
  width: 80px;
  border: 1px solid #3e6a3e;
  background: #111;
  color: #d8f5d8;
  padding: 4px 6px;
  font-family: inherit;
  font-size: 12px;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #3e6a3e;
  background: #111;
  color: #d8f5d8;
  font-family: inherit;
  font-size: 12px;
  margin-top: 8px;
}

.log {
  max-height: 160px;
  overflow: auto;
  font-size: 11px;
}

.muted { opacity: 0.6; }
.small { font-size: 11px; margin-top: 4px; }
.outcome { font-size: 12px; opacity: 0.8; margin: 6px 0 0; }

.debug-toggle { cursor: pointer; font-size: 13px; opacity: 0.7; }

.level-badge {
  font-size: 10px;
  opacity: 0.6;
  margin-left: auto;
}

.gen-list { display: flex; flex-direction: column; gap: 10px; }
.gen-row {
  border: 1px solid #243624;
  padding: 8px 10px;
  font-size: 13px;
}
.gen-info { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
.gen-outputs, .gen-inputs { font-size: 11px; opacity: 0.7; margin: 3px 0; }

.progress-wrap {
  position: relative;
  height: 14px;
  background: #1a2a1a;
  border: 1px solid #2e4a2e;
  margin: 6px 0 4px;
}
.progress-bar {
  height: 100%;
  background: #3a7a3a;
  transition: width 0.2s linear;
}
.progress-label {
  position: absolute;
  top: 0;
  left: 4px;
  font-size: 10px;
  line-height: 14px;
  color: #d8f5d8;
}
.debug-grid { margin: 8px 0; }

@media (max-width: 640px) {
  .masthead {
    flex-direction: column;
    align-items: flex-start;
  }

  .brand-wordmark {
    width: min(260px, 100%);
  }
}
</style>
