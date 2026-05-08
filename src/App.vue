<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { state } from "./core/state";
import { startGameLoop, stopGameLoop } from "./core/engine";
import { saveGame, loadGame, exportSave, importSave, hasSavedData, forceDeleteAllSavedData } from "./core/persistence";
import { executeAction, ACTION_DEFINITIONS, getReputationAlignment } from "./core/actions";
import { format } from "./utils/formatter";

onMounted(() => {
  loadGame();
  startGameLoop();
});

onUnmounted(() => {
  saveGame();
  stopGameLoop();
});

const fmtMoney = computed(() => format(state.resources.money));
const fmtReputation = computed(() => format(state.resources.reputation));
const assetBase = import.meta.env.BASE_URL;
const hatLogoSrc = `${assetBase}branding/GrayProtocol-Hat.png`;
const wordmarkSrc = `${assetBase}branding/GrayProtocol-Logo.png`;

const alignment = computed(() => getReputationAlignment(state.resources.reputation));
const lastOutcome = ref<string>("");
const importInput = ref("");
const debugMessage = ref("");

function runAction(actionId: string): void {
  const outcome = executeAction(state, actionId);
  if (!outcome) return;
  const def = ACTION_DEFINITIONS[outcome.actionId];
  const rep = outcome.reputationDelta.gte(0)
    ? `+${format(outcome.reputationDelta)} REP`
    : `${format(outcome.reputationDelta)} REP`;
  lastOutcome.value = `${def.name}: +$${format(outcome.rewardApplied)} money | ${rep}`;
}

function onSave(): void {
  saveGame();
}

function onExport(): void {
  importInput.value = exportSave();
}

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
  if (window.prompt("Type DELETE to confirm") !== "DELETE") {
    debugMessage.value = "Cancelled";
    return;
  }
  forceDeleteAllSavedData();
  lastOutcome.value = "";
  debugMessage.value = "State reset";
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
          <p class="brand-subtitle">Manual Ops Build</p>
        </div>
      </div>
      <img class="brand-wordmark" :src="wordmarkSrc" alt="Gray Protocol logo" />
    </header>

    <section class="card">
      <h2>Resources</h2>
      <div class="row"><span>$Money</span><strong>{{ fmtMoney }}</strong></div>
      <div class="row">
        <span>Reputation</span>
        <strong :class="alignment">{{ fmtReputation }} REP - {{ alignment }}</strong>
      </div>
    </section>

    <section class="card">
      <h2>Manual Actions</h2>
      <div class="action-grid">
        <div class="action">
          <div class="action-header">
            <strong>Harden System</strong>
            <em class="tag whitehat">whitehat</em>
          </div>
          <div class="action-desc">+$1 money | +1 REP</div>
          <button @click="runAction('hardenSystem')">Execute Harden</button>
        </div>

        <div class="action">
          <div class="action-header">
            <strong>Hack System</strong>
            <em class="tag blackhat">blackhat</em>
          </div>
          <div class="action-desc">+$1 money | -1 REP</div>
          <button @click="runAction('hackSystem')">Execute Hack</button>
        </div>
      </div>
      <p class="outcome" v-if="lastOutcome">{{ lastOutcome }}</p>
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
        <div class="controls" style="margin-top: 8px">
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
.greyhat { color: #d8f5d8; }
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
.outcome { font-size: 12px; opacity: 0.8; margin: 6px 0 0; }
.debug-toggle { cursor: pointer; font-size: 13px; opacity: 0.7; }

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
