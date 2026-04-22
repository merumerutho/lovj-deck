<script>
  import { onMount } from "svelte";
  import { selectedSlot, schema, savestateList, easingNames } from "../lib/stores.js";
  import { send, request, on } from "../lib/transport.js";

  let saveSlotId = 1;
  $: {
    const ids = ($savestateList.currentPatch || []).map(Number).filter((n) => !isNaN(n));
    saveSlotId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  }

  let morphEnabled = true;
  let morphTime = 500;
  let morphEasing = "sineInOut";

  on("morphSettings", (msg) => {
    if (msg.enabled != null) morphEnabled = msg.enabled;
    if (msg.time != null) morphTime = msg.time;
    if (msg.easing) morphEasing = msg.easing;
  });

  onMount(async () => {
    try {
      const res = await request({ type: "getMorphSettings" });
      if (res.enabled != null) morphEnabled = res.enabled;
      if (res.time != null) morphTime = res.time;
      if (res.easing) morphEasing = res.easing;
    } catch {}
  });

  function pushMorphSettings() {
    send({ type: "setMorphSettings", enabled: morphEnabled, time: morphTime, easing: morphEasing });
  }

  function saveSavestate() {
    send({ type: "saveSavestate", slot: $selectedSlot, savestateId: saveSlotId });
  }

  function loadSavestate(id) {
    const msg = { type: "loadSavestate", slot: $selectedSlot, savestateId: id };
    if (morphEnabled) {
      msg.morphTime = morphTime;
      msg.morphEasing = morphEasing;
    } else {
      msg.morphTime = 0;
    }
    send(msg);
  }

  async function loadOtherSavestate(fullPath, id) {
    if (!fullPath) return;
    await request({ type: "loadPatch", slot: $selectedSlot, patchName: fullPath });
    const msg = { type: "loadSavestate", slot: $selectedSlot, savestateId: id };
    if (morphEnabled) {
      msg.morphTime = morphTime;
      msg.morphEasing = morphEasing;
    } else {
      msg.morphTime = 0;
    }
    send(msg);
  }

  function patchBaseName(name) {
    return name ? name.replace(/.*\//, "") : "?";
  }

  $: currentPatch = $savestateList.currentPatch || [];
  $: otherPatches = $savestateList.otherPatches || [];
  $: currentName = $schema ? patchBaseName($schema.patchName) : "—";
</script>

<div class="ss-panel">
  <p class="info">
    Patch: <strong>{currentName}</strong>
    &middot; Slot {$selectedSlot}
  </p>

  <div class="save-row">
    <label class="ss-label">Save to slot</label>
    <input type="number" min="1" max="99" step="1" bind:value={saveSlotId} class="ss-num" />
    <button class="save-btn" onclick={saveSavestate}>Save</button>
  </div>

  <div class="morph-row">
    <label class="morph-toggle">
      <input type="checkbox" bind:checked={morphEnabled} onchange={pushMorphSettings} />
      <span class="morph-sw"></span>
      FADE
    </label>
    {#if morphEnabled}
      <input type="number" min="10" max="5000" step="10"
        bind:value={morphTime} onchange={pushMorphSettings} class="morph-time" />
      <span class="morph-unit">ms</span>
      <select bind:value={morphEasing} onchange={pushMorphSettings} class="morph-easing">
        {#each $easingNames as name}
          <option value={name}>{name}</option>
        {/each}
      </select>
    {:else}
      <span class="morph-off">instant</span>
    {/if}
  </div>

  <h3 class="section-title current-title">{currentName}</h3>

  {#if currentPatch.length > 0}
    <div class="ss-grid">
      {#each currentPatch as id}
        <button class="ss-slot current" onclick={() => loadSavestate(id)} title="Load savestate {id}">
          Slot {id}
        </button>
      {/each}
    </div>
  {:else}
    <p class="empty">No savestates for this patch yet.</p>
  {/if}

  {#if otherPatches.length > 0}
    <h3 class="section-title other-title">Other patches</h3>

    {#each otherPatches as group}
      <div class="other-group">
        <span class="other-patch-name">{group.patchName}</span>
        <div class="ss-grid">
          {#each group.savestates as id}
            <button
              class="ss-slot other"
              onclick={() => loadOtherSavestate(group.fullPath, id)}
              title="Load {group.patchName} / slot {id} (swaps patch)"
            >
              Slot {id}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .ss-panel { display: flex; flex-direction: column; gap: 0.75rem; }
  .info { font-size: 0.85rem; color: #999; margin: 0; }
  .info strong { color: #bbb; }

  .save-row {
    display: flex; align-items: center; gap: 0.5rem;
  }
  .ss-label { font-size: 0.82rem; color: #999; }
  .ss-num {
    width: 3.5rem; padding: 0.25rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.85rem; text-align: center;
  }
  .save-btn {
    padding: 0.35rem 0.8rem; background: #2a3a2e; color: #8c8;
    border: 1px solid #4a6a4e; border-radius: 4px; cursor: pointer; font-size: 0.85rem;
  }
  .save-btn:hover { background: #3a4a3e; }

  .morph-row {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.5rem; background: #1e1e24; border: 1px solid #333; border-radius: 4px;
  }
  .morph-toggle {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.78rem; color: #999; letter-spacing: .1em; cursor: pointer;
  }
  .morph-toggle input { display: none; }
  .morph-sw {
    width: 24px; height: 12px; border: 1px solid #555; position: relative;
    display: inline-block;
  }
  .morph-sw::after {
    content: ''; width: 6px; height: 6px; background: #666;
    position: absolute; top: 2px; left: 2px; transition: left 0.1s, background 0.1s;
  }
  .morph-toggle input:checked + .morph-sw::after { left: 14px; background: #5a9a6a; }
  .morph-toggle input:checked + .morph-sw { border-color: #5a9a6a; }
  .morph-time {
    width: 3.5rem; padding: 0.2rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem; text-align: center;
    font-family: ui-monospace, monospace;
  }
  .morph-unit { font-size: 0.72rem; color: #666; letter-spacing: .1em; }
  .morph-easing {
    padding: 0.2rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem;
    font-family: ui-monospace, monospace;
  }
  .morph-off { font-size: 0.78rem; color: #666; font-style: italic; }

  .section-title {
    font-size: 0.82rem; font-weight: 600;
    margin: 0.25rem 0; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .current-title { color: #aad; }
  .other-title { color: #666; margin-top: 0.5rem; }

  .ss-grid {
    display: flex; gap: 0.4rem; flex-wrap: wrap;
  }

  .ss-slot {
    padding: 0.4rem 0.8rem;
    border-radius: 4px; cursor: pointer; font-size: 0.82rem;
  }
  .ss-slot.current {
    background: #1e1e2e; color: #aad;
    border: 1px solid #3a3a6a;
  }
  .ss-slot.current:hover { background: #2a2a40; border-color: #5a5a8a; }

  .ss-slot.other {
    background: #1e1e22; color: #888;
    border: 1px solid #2a2a30;
  }
  .ss-slot.other:hover { background: #2a2a2e; border-color: #444; color: #aaa; }

  .other-group {
    display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
  }
  .other-patch-name {
    font-size: 0.78rem; color: #777; min-width: 6rem;
    font-family: monospace;
  }

  .empty { color: #555; font-size: 0.85rem; text-align: center; padding: 0.5rem 0; }
</style>
