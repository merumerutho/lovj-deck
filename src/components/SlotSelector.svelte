<script>
  import { slots, selectedSlot, schema, availablePatches } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

  function shortName(path) {
    const m = path.match(/demo[_]?(\d+)/);
    return m ? "demo " + m[1] : path.split("/").pop();
  }

  function loadPatch(patchPath) {
    send({ type: "loadPatch", slot: $selectedSlot, patchName: patchPath });
  }
</script>

<div class="slot-bar">
  {#each $slots as s (s.index)}
    <button
      class="slot"
      class:active={$selectedSlot === s.index}
      onclick={() => selectedSlot.set(s.index)}
      title={s.name}
    >
      {s.index}
    </button>
  {/each}
</div>

<div class="slot-info">
  {#if $schema}
    <span class="patch-name">{shortName($schema.patchName)}</span>
  {/if}
  {#if $availablePatches.length > 0}
    <select class="patch-select"
      value={$schema ? $schema.patchName : ""}
      onchange={(e) => loadPatch(e.target.value)}
    >
      {#each $availablePatches as p}
        <option value={p.path}>{p.short}</option>
      {/each}
    </select>
  {/if}
</div>

<style>
  .slot-bar {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .slot {
    width: 2.2rem;
    height: 2rem;
    border: 1px solid #444;
    border-radius: 4px;
    background: #2a2a30;
    color: #aaa;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }
  .slot:hover { background: #363640; }
  .slot.active {
    background: #3a5a4a;
    color: #fff;
    border-color: #5a8a6a;
  }
  .slot-info {
    margin-top: 0.4rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .patch-name {
    font-size: 0.8rem;
    color: #888;
  }
  .patch-select {
    padding: 0.2rem 0.3rem;
    background: #2a2a30;
    color: #ddd;
    border: 1px solid #444;
    border-radius: 3px;
    font-size: 0.8rem;
    min-width: 8rem;
  }
</style>
