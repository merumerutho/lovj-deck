<script>
  import { availablePatches, selectedSlot, schema } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

  function shortName(path) {
    const m = path.match(/demo[_]?(\d+)/);
    return m ? "Demo " + m[1] : path.split("/").pop();
  }

  function loadPatch(patchPath) {
    send({ type: "loadPatch", slot: $selectedSlot, patchName: patchPath });
  }

  function isCurrent(path) {
    return $schema && $schema.patchName === path;
  }
</script>

<div class="patches-panel">
  <h3>Available Patches</h3>
  <div class="patch-grid">
    {#each $availablePatches as p (p.path)}
      <button
        class="patch-card"
        class:active={isCurrent(p.path)}
        onclick={() => loadPatch(p.path)}
        title={p.path}
      >
        <span class="patch-label">{shortName(p.path)}</span>
        <span class="patch-path">{p.path}</span>
      </button>
    {/each}
  </div>
  {#if $availablePatches.length === 0}
    <p class="empty">No patches available.</p>
  {/if}
</div>

<style>
  .patches-panel h3 {
    margin: 0 0 0.75rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: #aaa;
  }
  .patch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
  .patch-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.6rem 0.75rem;
    background: #2a2a30;
    border: 1px solid #444;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
  }
  .patch-card:hover {
    background: #363640;
    border-color: #666;
  }
  .patch-card.active {
    background: #2a4a3a;
    border-color: #5a8a6a;
  }
  .patch-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #ddd;
  }
  .patch-path {
    font-size: 0.7rem;
    color: #666;
    margin-top: 2px;
    word-break: break-all;
  }
  .empty {
    color: #666;
    font-size: 0.85rem;
  }
</style>
