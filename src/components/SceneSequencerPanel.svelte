<script>
  import { sceneSequencer, selectedSlot, schema, availablePatches, savestateList, tempoDivisions } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

  $: DIVIDER_OPTIONS = $tempoDivisions
    .filter((d) => d.beats <= 4)
    .map((d) => ({ label: d.label, value: 1 / d.beats }))
    .sort((a, b) => a.value - b.value);

  $: scenes   = ($sceneSequencer && $sceneSequencer.scenes) || [];
  $: channels = ($sceneSequencer && $sceneSequencer.channels) || [];
  $: playing  = ($sceneSequencer && $sceneSequencer.playing) || false;

  // ---- Scene bank ----
  let newLabel = "";
  let addMode = "patch";       // "patch" | "savestate" | "capture"
  let selPatchPath = "";
  let selSsFile = "";
  let selSsIdx = 1;

  $: patches = $availablePatches || [];
  $: curPatchBase = ($schema && $schema.patchName) ? $schema.patchName.replace(/.*\//, "") : "";
  $: allSavestates = buildSavestateOptions($savestateList, curPatchBase);

  function buildSavestateOptions(ss, baseName) {
    const out = [];
    for (const id of (ss.currentPatch || [])) {
      out.push({ file: baseName, idx: id, label: baseName + " #" + id });
    }
    for (const g of (ss.otherPatches || [])) {
      for (const id of g.savestates) {
        out.push({ file: g.patchName, idx: id, label: g.patchName + " #" + id });
      }
    }
    return out;
  }

  function addScene() {
    if (!newLabel.trim()) return;
    const msg = { type: "sceneSeqCacheScene", label: newLabel.trim() };
    if (addMode === "patch") {
      if (!selPatchPath) return;
      msg.sceneType = "patch";
      msg.patchPath = selPatchPath;
    } else if (addMode === "savestate") {
      if (!selSsFile) return;
      msg.filename = selSsFile;
      msg.saveIdx = selSsIdx;
    } else if (addMode === "capture") {
      msg.captureSlot = $selectedSlot;
    }
    send(msg);
    newLabel = "";
  }

  function onSavestateSelect(val) {
    const opt = allSavestates.find((s) => s.label === val);
    if (opt) { selSsFile = opt.file; selSsIdx = opt.idx; }
  }

  // ---- Channels ----
  let newChName = "";
  let newChSlot = 1;
  let newChSteps = 8;
  let newChDivider = 1;

  function addChannel() {
    if (!newChName.trim()) return;
    send({
      type: "sceneSeqAddChannel",
      name: newChName.trim(),
      slot: newChSlot,
      steps: newChSteps,
      divider: newChDivider,
    });
    newChName = "";
  }

  function removeChannel(name) {
    send({ type: "sceneSeqRemoveChannel", name });
  }

  function updateChannel(name, field, value) {
    const msg = { type: "sceneSeqUpdateChannel", name };
    msg[field] = Number(value);
    send(msg);
  }

  // ---- Step assignment ----
  let assignScene = "";

  function onStepClick(chName, stepIdx, currentScene) {
    if (currentScene && currentScene !== false) {
      // Clicking an assigned step clears it
      send({ type: "sceneSeqSetScene", channel: chName, step: stepIdx, scene: null });
    } else if (assignScene) {
      send({ type: "sceneSeqSetScene", channel: chName, step: stepIdx, scene: assignScene });
    }
  }

  // ---- Transport ----
  function play() { send({ type: "sceneSeqPlay" }); }
  function stop() { send({ type: "sceneSeqStop" }); }

  function patchShort(path) { return path ? path.replace(/.*\//, "") : "?"; }

  function resync() { send({ type: "resyncPhases" }); }
</script>

<div class="ssp">
  <!-- Transport -->
  <div class="transport">
    <button class="tbtn" class:active={playing} onclick={playing ? stop : play}>
      {playing ? "Stop" : "Play"}
    </button>
    <button class="tbtn" onclick={resync}>RESYNC</button>
  </div>

  <!-- Scene bank -->
  <fieldset class="bank">
    <legend>Scene Bank</legend>

    {#if scenes.length > 0}
      <div class="scene-list">
        {#each scenes as s}
          <span class="scene-tag" class:patch={s.sceneType === "patch"} class:savestate={s.sceneType === "savestate"}>
            {s.label}
            <span class="scene-type">{s.sceneType === "patch" ? "P" : "S"}</span>
          </span>
        {/each}
      </div>
    {:else}
      <p class="empty">No scenes cached yet.</p>
    {/if}

    <div class="add-scene">
      <input type="text" placeholder="Label" bind:value={newLabel} class="label-input" />

      <select bind:value={addMode} class="mode-sel">
        <option value="patch">Patch</option>
        <option value="savestate">Savestate</option>
        <option value="capture">Capture live</option>
      </select>

      {#if addMode === "patch"}
        <select bind:value={selPatchPath} class="target-sel">
          <option value="">-- select patch --</option>
          {#each patches as p}
            <option value={p.path}>{p.short}</option>
          {/each}
        </select>
      {:else if addMode === "savestate"}
        <select onchange={(e) => onSavestateSelect(e.target.value)} class="target-sel">
          <option value="">-- select savestate --</option>
          {#each allSavestates as ss}
            <option value={ss.label}>{ss.label}</option>
          {/each}
        </select>
      {:else if addMode === "capture"}
        <span class="capture-hint">Slot {$selectedSlot}</span>
      {/if}

      <button class="add-btn" onclick={addScene}>+ Scene</button>
    </div>
  </fieldset>

  <!-- Assign brush -->
  {#if scenes.length > 0}
    <div class="brush-row">
      <span class="brush-label">Assign scene:</span>
      <select bind:value={assignScene} class="brush-sel">
        <option value="">-- click step to clear --</option>
        {#each scenes as s}
          <option value={s.label}>{s.label} ({s.sceneType === "patch" ? "P" : "S"})</option>
        {/each}
      </select>
    </div>
  {/if}

  <!-- Channels -->
  <div class="add-ch">
    <input type="text" placeholder="Channel name" bind:value={newChName} class="ch-name-input" />
    <span class="small-ctl">
      slot
      <input type="number" min="1" max="8" step="1" bind:value={newChSlot} />
    </span>
    <span class="small-ctl">
      steps
      <input type="number" min="1" max="64" step="1" bind:value={newChSteps} />
    </span>
    <span class="small-ctl">
      div
      <select bind:value={newChDivider}>
        {#each DIVIDER_OPTIONS as d}
          <option value={d.value}>{d.label}</option>
        {/each}
      </select>
    </span>
    <button class="add-btn" onclick={addChannel}>+ Channel</button>
  </div>

  {#if channels.length > 0}
    {#each channels as ch (ch.name)}
      <div class="ch-card">
        <div class="ch-header">
          <span class="ch-name">{ch.name}</span>
          <span class="ch-info">slot {ch.slot}</span>
          <span class="small-ctl">
            steps
            <input type="number" min="1" max="64" step="1" value={ch.numSteps}
              onchange={(e) => updateChannel(ch.name, "steps", e.target.value)} />
          </span>
          <span class="small-ctl">
            div
            <select value={ch.divider}
              onchange={(e) => updateChannel(ch.name, "divider", e.target.value)}>
              {#each DIVIDER_OPTIONS as d}
                <option value={d.value}>{d.label}</option>
              {/each}
            </select>
          </span>
          <label class="phase-ctl">
            phase
            <input type="range" min="0" max="1" step="0.01" value={ch.phase || 0}
              oninput={(e) => updateChannel(ch.name, "phase", e.target.value)} />
            <span class="phase-val">{((ch.phase || 0) * 100).toFixed(0)}%</span>
          </label>
          <button class="ch-del" onclick={() => removeChannel(ch.name)} title="Remove">&#10005;</button>
        </div>
        <div class="step-row">
          {#each Array(ch.numSteps) as _, i}
            {@const scene = ch.steps[i]}
            {@const assigned = scene && scene !== false}
            <button
              class="step-cell"
              class:assigned
              class:playing={ch.currentStep === i + 1}
              onclick={() => onStepClick(ch.name, i + 1, scene)}
              title={assigned ? scene : "empty — select a scene above then click"}
            >
              {#if assigned}
                <span class="scene-label">{scene}</span>
              {:else}
                <span class="step-num">{i + 1}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  {:else}
    <p class="empty">No channels. Add one above to start sequencing scenes.</p>
  {/if}
</div>

<style>
  .ssp { display: flex; flex-direction: column; gap: 0.6rem; }

  .transport { display: flex; gap: 0.4rem; }
  .tbtn {
    padding: 0.35rem 0.7rem; background: #2a2a30; color: #ddd;
    border: 1px solid #555; border-radius: 4px; cursor: pointer; font-size: 0.85rem;
  }
  .tbtn.active { background: #3a5a4a; color: #8f8; border-color: #5a8a6a; }
  .tbtn:hover { background: #363640; }

  /* Scene bank */
  .bank {
    border: 1px solid #333; border-radius: 5px; padding: 0.5rem 0.6rem;
    margin: 0;
  }
  .bank legend { font-size: 0.78rem; color: #888; padding: 0 0.3rem; }

  .scene-list { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
  .scene-tag {
    padding: 0.25rem 0.5rem; border-radius: 4px;
    font-size: 0.78rem; display: inline-flex; align-items: center; gap: 0.3rem;
  }
  .scene-tag.patch { background: #1e2a2e; color: #8cb; border: 1px solid #3a5a5e; }
  .scene-tag.savestate { background: #1e1e2e; color: #aad; border: 1px solid #3a3a6a; }
  .scene-type {
    font-size: 0.6rem; font-weight: 700; opacity: 0.6;
    background: rgba(255,255,255,0.08); padding: 0 0.2rem; border-radius: 2px;
  }

  .add-scene { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }
  .label-input {
    width: 6rem; padding: 0.25rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem;
  }
  .mode-sel, .target-sel {
    padding: 0.22rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem;
  }
  .target-sel { min-width: 10rem; }
  .capture-hint { font-size: 0.82rem; color: #999; }

  .add-btn {
    padding: 0.3rem 0.7rem; background: #2a3a2e; color: #8c8;
    border: 1px solid #4a6a4e; border-radius: 4px; cursor: pointer; font-size: 0.82rem;
    white-space: nowrap;
  }
  .add-btn:hover { background: #3a4a3e; }

  /* Brush row */
  .brush-row { display: flex; align-items: center; gap: 0.4rem; }
  .brush-label { font-size: 0.78rem; color: #999; }
  .brush-sel {
    padding: 0.22rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem; min-width: 10rem;
  }

  /* Channels */
  .add-ch { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }
  .ch-name-input {
    width: 8rem; padding: 0.25rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem;
  }
  .small-ctl {
    display: flex; align-items: center; gap: 0.2rem;
    font-size: 0.78rem; color: #999;
  }
  .small-ctl input {
    width: 3rem; padding: 0.15rem 0.25rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.78rem;
  }
  .small-ctl select {
    padding: 0.15rem 0.2rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.78rem;
  }

  .ch-card {
    background: #1e1e24; border: 1px solid #333; border-radius: 5px;
    padding: 0.5rem 0.6rem;
  }
  .ch-header {
    display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; flex-wrap: wrap;
  }
  .ch-name {
    font-size: 0.82rem; color: #bbb; font-weight: 500;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 5rem;
  }
  .ch-info { font-size: 0.72rem; color: #666; }
  .ch-del {
    margin-left: auto; background: none; border: none; color: #744;
    cursor: pointer; font-size: 0.8rem; padding: 0;
  }
  .ch-del:hover { color: #c88; }
  .phase-ctl {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 0.72rem; color: #888;
  }
  .phase-ctl input[type="range"] { width: 60px; accent-color: #c9a24a; cursor: pointer; }
  .phase-val { color: #666; font-size: 0.72rem; min-width: 28px; }

  .step-row { display: flex; gap: 2px; flex-wrap: wrap; }
  .step-cell {
    min-width: 2.8rem; height: 1.6rem; padding: 0 0.3rem;
    background: #1a1a20; border: 1px solid #333; border-radius: 3px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background 0.1s; flex-shrink: 0;
  }
  .step-cell:hover { background: #2a2a34; }
  .step-cell.assigned { background: #1e2a3e; border-color: #3a5a8a; }
  .step-cell.playing { border-color: #8f8; }
  .step-cell.assigned.playing { background: #2a3a5a; }
  .scene-label { font-size: 0.6rem; color: #aad; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 4rem; }
  .step-num { font-size: 0.55rem; color: #444; }

  .empty { color: #555; font-size: 0.85rem; text-align: center; padding: 0.5rem 0; }
</style>
