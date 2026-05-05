<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { state } from "./core/state";
import { startGameLoop, stopGameLoop } from "./core/engine";
import { loadGame, saveGame } from "./core/persistence";
import { format } from "./utils/formatter";
import { validateGameState } from "./core/validation";

onMounted(() => {
  loadGame();
  startGameLoop();
});

onUnmounted(() => {
  saveGame();
  stopGameLoop();
});

const fmtMoney = computed(() => format(state.resources.money));
const fmtCrypto = computed(() => format(state.resources.crypto));
const fmtCompute = computed(() => format(state.resources.compute));
const fmtReputation = computed(() => format(state.resources.reputation));

const validationStatus = computed(() => {
  const result = validateGameState(state);
  if (result.valid) {
    return "Core state valid";
  }
  return `Core state issues: ${result.errors.length}`;
});

const uptimeSeconds = computed(() => {
  const now = Date.now();
  const ms = Math.max(0, now - state.timestamps.createdAt);
  return (ms / 1000).toFixed(1);
});
</script>

<template>
  <div class="root">
    <h1>Gray Protocol <span class="version">v{{ state.version }}</span></h1>

    <section class="card">
      <h2>Core Runtime</h2>
      <div class="row"><span>Status</span><strong>{{ validationStatus }}</strong></div>
      <div class="row"><span>Uptime</span><strong>{{ uptimeSeconds }}s</strong></div>
      <div class="row"><span>Created</span><strong>{{ new Date(state.timestamps.createdAt).toLocaleString() }}</strong></div>
      <div class="row"><span>Last Tick</span><strong>{{ new Date(state.timestamps.lastTickAt).toLocaleString() }}</strong></div>
      <div class="row"><span>Last Saved</span><strong>{{ new Date(state.timestamps.lastSavedAt).toLocaleString() }}</strong></div>
    </section>

    <section class="card">
      <h2>Core Resources</h2>
      <div class="row"><span>Money</span><strong>{{ fmtMoney }}</strong></div>
      <div class="row"><span>Crypto</span><strong>{{ fmtCrypto }}</strong></div>
      <div class="row"><span>Compute</span><strong>{{ fmtCompute }}</strong></div>
      <div class="row"><span>Reputation</span><strong>{{ fmtReputation }}</strong></div>
    </section>

    <section class="card">
      <h2>Log Stream</h2>
      <div class="log">
        <div v-for="(entry, i) in state.log" :key="i">{{ entry }}</div>
        <div v-if="state.log.length === 0" class="muted">No events yet.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.root {
  font-family: "Courier New", monospace;
  max-width: 860px;
  margin: 0 auto;
  padding: 12px;
  color: #d8f5d8;
}

h1 {
  margin: 0 0 12px;
  font-size: 22px;
}

.version {
  font-size: 12px;
  opacity: 0.7;
}

.card {
  border: 1px solid #335033;
  background: #0f170f;
  padding: 10px;
  margin-bottom: 10px;
}

h2 {
  margin: 0 0 8px;
  font-size: 14px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;
}

.log {
  max-height: 220px;
  overflow: auto;
  font-size: 12px;
}

.muted {
  opacity: 0.6;
}

@media (max-width: 640px) {
  .row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
