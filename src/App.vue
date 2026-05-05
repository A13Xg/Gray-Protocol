<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import Decimal from "break_eternity.js";
import { state } from "./core/state";
import {
  getComputeAllocationForActivity,
  getTotalAllocatedCompute,
  setComputeAllocation,
  startGameLoop,
  stopGameLoop,
} from "./core/engine";
import { saveGame, loadGame, exportSave, importSave } from "./core/persistence";
import { format } from "./utils/formatter";
import { ACTIVITY_DEFINITIONS, canUnlockActivity, purchaseActivityLevel } from "./core/activities";

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
const fmtReputation = computed(() => format(state.resources.reputation));
const fmtComputeTotal = computed(() => format(state.resources.compute));
const fmtComputeUsed = computed(() => format(getTotalAllocatedCompute(state)));
const activityIds = Object.keys(ACTIVITY_DEFINITIONS);

function buyLevel(activityId: string): void {
  purchaseActivityLevel(state, activityId);
}

function toggleActivity(activityId: string): void {
  const activity = state.activities[activityId];
  if (!activity) return;
  activity.active = !activity.active;
}

function addCompute(activityId: string): void {
  const current = getComputeAllocationForActivity(state, activityId);
  setComputeAllocation(state, activityId, current.add(1));
}

function subCompute(activityId: string): void {
  const current = getComputeAllocationForActivity(state, activityId);
  setComputeAllocation(state, activityId, Decimal.max(0, current.sub(1)));
}

function activityAllocation(activityId: string): string {
  return format(getComputeAllocationForActivity(state, activityId));
}

function onSave(): void {
  saveGame();
}

const importInput = ref("");

function onExport(): void {
  importInput.value = exportSave();
}

function onImport(): void {
  if (importSave(importInput.value)) {
    importInput.value = "";
  }
}
</script>

<template>
  <div class="root">
    <h1>Gray Protocol <span class="version">v{{ state.version }}</span></h1>

    <section class="card">
      <h2>Resources</h2>
      <div class="row"><span>Money</span><strong>{{ fmtMoney }}</strong></div>
      <div class="row"><span>Crypto</span><strong>{{ fmtCrypto }}</strong></div>
      <div class="row"><span>Reputation</span><strong>{{ fmtReputation }}</strong></div>
      <div class="row"><span>Compute</span><strong>{{ fmtComputeUsed }} / {{ fmtComputeTotal }}</strong></div>
    </section>

    <section class="card">
      <h2>Activities</h2>
      <div v-for="activityId in activityIds" :key="activityId" class="activity">
        <div class="activity-title">
          <strong>{{ ACTIVITY_DEFINITIONS[activityId].name }}</strong>
          <span>
            L{{ state.activities[activityId].level }}
            {{ state.activities[activityId].active ? "(Active)" : "(Idle)" }}
          </span>
        </div>

        <div class="controls">
          <button @click="buyLevel(activityId)">Buy Level</button>
          <button
            :disabled="!canUnlockActivity(state, activityId) || state.activities[activityId].level <= 0"
            @click="toggleActivity(activityId)"
          >
            {{ state.activities[activityId].active ? "Pause" : "Start" }}
          </button>
        </div>

        <div v-if="ACTIVITY_DEFINITIONS[activityId].usesComputeAllocation" class="controls">
          <button @click="subCompute(activityId)">- Compute</button>
          <span class="alloc">Allocated: {{ activityAllocation(activityId) }}</span>
          <button @click="addCompute(activityId)">+ Compute</button>
        </div>
      </div>
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
        <div v-if="state.log.length === 0" class="muted">
          No events yet.
        </div>
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
  padding: 3px 0;
}

.activity {
  border-top: 1px solid #243624;
  padding-top: 8px;
  margin-top: 8px;
}

.activity-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 13px;
}

.controls {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}

button {
  border: 1px solid #3e6a3e;
  background: #163016;
  color: #d8f5d8;
  padding: 4px 8px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.4;
  cursor: default;
}

.alloc {
  min-width: 120px;
}

textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #3e6a3e;
  background: #111;
  color: #d8f5d8;
  font-family: inherit;
}

.log {
  max-height: 120px;
  overflow: auto;
  font-size: 12px;
}

.muted {
  opacity: 0.6;
}

@media (max-width: 640px) {
  .activity-title {
    flex-direction: column;
    gap: 4px;
  }

  .controls {
    flex-wrap: wrap;
  }
}
</style>
