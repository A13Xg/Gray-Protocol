<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from "vue";
import { state, pushLog } from "./core/state";
import { purchase, startGameLoop, stopGameLoop, getTotalAllocatedCompute } from "./core/engine";
import { saveGame, loadGame, exportSave, importSave } from "./core/persistence";
import { format } from "./utils/formatter";

// ── Bootstrap ────────────────────────────────────────────────────────────────
onMounted(() => {
  loadGame();
  startGameLoop();
});

onUnmounted(() => {
  saveGame();
  stopGameLoop();
});

// ── Formatted resource accessors ─────────────────────────────────────────────
const fmtMoney = computed(() => format(state.resources.money));
const fmtCrypto = computed(() => format(state.resources.cryptoCurrency));
const fmtReputation = computed(() => format(state.resources.reputationStanding));
const fmtComputeTotal = computed(() => format(state.resources.computePower));
const fmtComputeUsed = computed(() => format(getTotalAllocatedCompute(state)));

// ── Actions ──────────────────────────────────────────────────────────────────

/** Run Bug Bounty: +10 Money, +3 Reputation */
function runBugBounty(): void {
  const ok = purchase({ money: -10, reputationStanding: -3 }); // negative cost = gain
  if (ok) {
    pushLog("🐛 Bug Bounty complete! +10 Money, +3 Reputation");
  } else {
    pushLog("⚠ Bug Bounty failed (insufficient resources)");
  }
}

/** Illegal Script: +25 Money, -5 Reputation */
function runIllegalScript(): void {
  const ok = purchase({ money: -25, reputationStanding: 5 }); // cost 5 reputation, gain 25 money
  if (ok) {
    pushLog("💀 Illegal Script executed! +25 Money, −5 Reputation");
  } else {
    pushLog("⚠ Illegal Script failed (insufficient Reputation)");
  }
}

// ── Save / Export ─────────────────────────────────────────────────────────────
function onSave(): void {
  saveGame();
}

const importInput = ref("");

function onExport(): void {
  const encoded = exportSave();
  importInput.value = encoded;
  pushLog("📤 Save exported to text box.");
}

function onImport(): void {
  if (importSave(importInput.value)) {
    importInput.value = "";
  }
}
</script>

<template>
  <div class="gp-root">
    <header class="gp-header">
      <h1>Gray Protocol <span class="version">v{{ state.version }}</span></h1>
    </header>

    <main class="gp-main">
      <!-- Resources Panel -->
      <section class="panel resources-panel">
        <h2>⚙ Resources</h2>
        <table>
          <tbody>
            <tr><td>💰 Money</td><td class="val">{{ fmtMoney }}</td></tr>
            <tr><td>🔐 Crypto</td><td class="val">{{ fmtCrypto }}</td></tr>
            <tr><td>⚖ Reputation</td><td class="val">{{ fmtReputation }}</td></tr>
            <tr>
              <td>🖥 Compute</td>
              <td class="val">{{ fmtComputeUsed }} / {{ fmtComputeTotal }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Action Buttons -->
      <section class="panel actions-panel">
        <h2>🔧 Actions</h2>
        <button class="btn btn-bounty" @click="runBugBounty">
          🐛 Run Bug Bounty<br /><small>+10 Money, +3 Reputation</small>
        </button>
        <button class="btn btn-illegal" @click="runIllegalScript">
          💀 Illegal Script<br /><small>+25 Money, −5 Reputation</small>
        </button>
      </section>

      <!-- Persistence Panel -->
      <section class="panel persistence-panel">
        <h2>💾 Data Bridge</h2>
        <div class="btn-row">
          <button class="btn" @click="onSave">Save</button>
          <button class="btn" @click="onExport">Export</button>
          <button class="btn" @click="onImport">Import</button>
        </div>
        <textarea
          v-model="importInput"
          placeholder="Paste Base64 save string here…"
          rows="3"
          class="import-box"
        />
      </section>

      <!-- System Log -->
      <section class="panel log-panel">
        <h2>📟 System Log</h2>
        <div class="log-scroll">
          <div v-for="(entry, i) in state.log" :key="i" class="log-entry">
            {{ entry }}
          </div>
          <div v-if="state.log.length === 0" class="log-empty">
            Awaiting events…
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.gp-root {
  font-family: "Courier New", Courier, monospace;
  background: #0d0d0d;
  color: #c8ffc8;
  min-height: 100vh;
  padding: 1rem;
}

.gp-header h1 {
  font-size: 1.6rem;
  letter-spacing: 0.15em;
  margin: 0 0 1rem;
  color: #7fff7f;
}

.version {
  font-size: 0.75rem;
  opacity: 0.6;
}

.gp-main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.panel {
  background: #111;
  border: 1px solid #2a4a2a;
  border-radius: 6px;
  padding: 1rem;
}

.panel h2 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  color: #5fcf5f;
  border-bottom: 1px solid #2a4a2a;
  padding-bottom: 0.4rem;
}

table {
  width: 100%;
  border-collapse: collapse;
}

td {
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
}

.val {
  text-align: right;
  color: #a0ffa0;
  font-weight: bold;
}

.actions-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  background: #1a3a1a;
  border: 1px solid #3a7a3a;
  color: #c8ffc8;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  transition: background 0.15s;
}

.btn:hover {
  background: #2a5a2a;
}

.btn-bounty {
  border-color: #3a9a6a;
  color: #9aff9a;
}

.btn-illegal {
  border-color: #9a3a3a;
  color: #ff9a9a;
}

.btn-illegal:hover {
  background: #3a1a1a;
}

.btn-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.import-box {
  width: 100%;
  background: #0a0a0a;
  border: 1px solid #2a4a2a;
  color: #c8ffc8;
  font-family: inherit;
  font-size: 0.75rem;
  padding: 0.4rem;
  border-radius: 4px;
  resize: vertical;
  box-sizing: border-box;
}

.log-panel {
  grid-column: 1 / -1;
}

.log-scroll {
  max-height: 200px;
  overflow-y: auto;
  font-size: 0.8rem;
}

.log-entry {
  padding: 0.1rem 0;
  border-bottom: 1px solid #1a2a1a;
  color: #90cf90;
}

.log-empty {
  color: #456045;
  font-style: italic;
}
</style>
