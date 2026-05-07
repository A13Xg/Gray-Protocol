# Node Template Reference

## Template

```json
{
  "id": "uniqueCamelCaseId",
  "name": "Display Name",
  "description": "Short player-facing description of what this node does.",
  "kind": "clickable | passive | timedTask",
  "path": "whitehat | blackhat",
  "enabled": true,
  "aliases": ["legacyId1", "legacyId2"],
  "inputResources": {
    "money": "10",
    "crypto": "5"
  },
  "outputResources": {
    "money": "20",
    "crypto": "0.1"
  },
  "defaultMultiplierPct": "0",
  "reputationEffect": "1",
  "unlock": {},
  "upgrade": {
    "startingLevel": 1,
    "maxLevel": 10,
    "levelMultiplierPct": "100",
    "timedInputCostGrowthPct": "5"
  },
  "computeScaling": {
    "enabled": true,
    "baselineCompute": "10",
    "exponent": "0.25"
  },
  "runtime": {
    "tickIntervalMs": 1000,
    "durationMs": 60000,
    "allowAutoRun": true
  },
  "tags": ["manual", "action", "background", "task"]
}
```

---

## Field Reference

| Field | Description |
|---|---|
| `id` | Unique identifier used internally. camelCase. |
| `name` | Player-facing label. |
| `description` | Tooltip/flavor text shown to the player. |
| `kind` | `clickable` = button the player presses; `passive` = runs on a tick interval; `timedTask` = completes after a duration. |
| `path` | `whitehat` or `blackhat` — which side this node belongs to. |
| `enabled` | Set `false` to hide without deleting. |
| `aliases` | Old IDs this node responds to (for save migration). Leave `[]` if new. |
| `inputResources` | Resources consumed on activation. Omit or use `{}` if none. |
| `outputResources` | Resources produced on completion. |
| `defaultMultiplierPct` | Base output multiplier bonus in percent (e.g. `"50"` = +50%). Usually `"0"`. |
| `reputationEffect` | Integer string. Positive = gains rep, negative = loses rep, `"0"` = neutral. |
| `unlock` | Unlock conditions (leave `{}` for always available — structure TBD per unlock system). |
| `upgrade.startingLevel` | Level the node begins at (usually `1`). |
| `upgrade.maxLevel` | Cap on how many times it can be upgraded. |
| `upgrade.levelMultiplierPct` | Output multiplier increase per upgrade level (%). |
| `upgrade.timedInputCostGrowthPct` | *(timedTask only)* How much input costs grow per level (%). |
| `computeScaling.enabled` | Whether compute resource affects this node's output. |
| `computeScaling.baselineCompute` | Compute at which full output is achieved. |
| `computeScaling.exponent` | Scaling curve — lower = gentler scaling. |
| `runtime.tickIntervalMs` | *(passive only)* Milliseconds between output ticks. |
| `runtime.durationMs` | *(timedTask only)* How long the task takes in ms. |
| `runtime.allowAutoRun` | Whether the node can be set to run automatically. |
| `tags` | Freeform labels: `"manual"`, `"action"`, `"background"`, `"task"`. |

---

## Examples by Kind

### `clickable` — player presses a button, immediate output

```json
{
  "id": "traceRoute",
  "name": "Trace Route",
  "description": "Manually trace a network path to earn money and build rep.",
  "kind": "clickable",
  "path": "whitehat",
  "enabled": true,
  "aliases": [],
  "inputResources": {},
  "outputResources": { "money": "2" },
  "defaultMultiplierPct": "0",
  "reputationEffect": "1",
  "unlock": {},
  "upgrade": { "startingLevel": 1, "maxLevel": 10, "levelMultiplierPct": "100" },
  "computeScaling": { "enabled": false, "baselineCompute": "1", "exponent": "0" },
  "runtime": {},
  "tags": ["manual", "action"]
}
```

### `passive` — runs in background on a tick

```json
{
  "id": "honeyPot",
  "name": "Honey Pot",
  "description": "A trap that quietly generates crypto by luring attackers.",
  "kind": "passive",
  "path": "whitehat",
  "enabled": true,
  "aliases": [],
  "inputResources": {},
  "outputResources": { "crypto": "0.15" },
  "defaultMultiplierPct": "0",
  "reputationEffect": "0",
  "unlock": {},
  "upgrade": { "startingLevel": 1, "maxLevel": 10, "levelMultiplierPct": "20" },
  "computeScaling": { "enabled": true, "baselineCompute": "10", "exponent": "0.25" },
  "runtime": { "tickIntervalMs": 1000, "allowAutoRun": true },
  "tags": ["background"]
}
```

### `timedTask` — consumes resources, completes after a delay

```json
{
  "id": "firmwareAudit",
  "name": "Firmware Audit",
  "description": "Deep-scan a device's firmware. Costs time and resources, yields strong rep.",
  "kind": "timedTask",
  "path": "whitehat",
  "enabled": true,
  "aliases": [],
  "inputResources": { "money": "15", "crypto": "5" },
  "outputResources": { "money": "30" },
  "defaultMultiplierPct": "0",
  "reputationEffect": "3",
  "unlock": {},
  "upgrade": { "startingLevel": 1, "maxLevel": 5, "levelMultiplierPct": "100", "timedInputCostGrowthPct": "5" },
  "computeScaling": { "enabled": true, "baselineCompute": "10", "exponent": "0.2" },
  "runtime": { "durationMs": 90000, "allowAutoRun": true },
  "tags": ["task"]
}
```
