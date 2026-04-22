<script>
  import PatchesPanel from "./PatchesPanel.svelte";
  import ShaderLayerSelector from "./ShaderLayerSelector.svelte";
  import SavestatePanel from "./SavestatePanel.svelte";

  let sections = { patches: true, shaders: true, saves: false };

  function toggleSection(key) {
    sections = { ...sections, [key]: !sections[key] };
  }
</script>

<aside class="sidebar">
  <div class="sidebar-scroll">
    <button class="sec-hdr" onclick={() => toggleSection("patches")}>
      <span class="sec-dot"></span>PATCHES
      <span class="sec-chev">{sections.patches ? "▾" : "▸"}</span>
    </button>
    {#if sections.patches}
      <div class="sec-body compact-patches">
        <PatchesPanel />
      </div>
    {/if}

    <button class="sec-hdr" onclick={() => toggleSection("shaders")}>
      <span class="sec-dot cyan"></span>SHADER LAYERS
      <span class="sec-chev">{sections.shaders ? "▾" : "▸"}</span>
    </button>
    {#if sections.shaders}
      <div class="sec-body">
        <ShaderLayerSelector />
      </div>
    {/if}

    <button class="sec-hdr" onclick={() => toggleSection("saves")}>
      <span class="sec-dot amber"></span>SAVESTATES
      <span class="sec-chev">{sections.saves ? "▾" : "▸"}</span>
    </button>
    {#if sections.saves}
      <div class="sec-body">
        <SavestatePanel />
      </div>
    {/if}

    <div class="sec-spacer"></div>
  </div>
</aside>

<style>
  .sidebar {
    width: 260px; height: 100%;
    background: #222227; border-right: 1px solid #333;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .sidebar-scroll {
    flex: 1; overflow-y: auto; overflow-x: hidden;
    display: flex; flex-direction: column;
  }
  .sec-hdr {
    display: flex; align-items: center; gap: 6px;
    width: 100%; padding: 8px 12px;
    background: none; border: none; border-bottom: 1px solid #2a2a30;
    color: #888; cursor: pointer;
    font-family: ui-monospace, monospace; font-size: 9px;
    letter-spacing: .2em; text-transform: uppercase; text-align: left;
  }
  .sec-hdr:hover { color: #bbb; background: rgba(255,255,255,.02); }
  .sec-dot {
    width: 6px; height: 6px; background: #888; display: inline-block;
  }
  .sec-dot.cyan { background: #6a9aaa; }
  .sec-dot.amber { background: #c9a24a; }
  .sec-chev { margin-left: auto; font-size: 9px; color: #666; }
  .sec-body { padding: 4px 0 6px; }
  .sec-spacer { flex: 1; }

  /* Make PatchesPanel fit the narrow sidebar */
  .compact-patches :global(.patches-panel h3) { display: none; }
  .compact-patches :global(.patch-grid) {
    grid-template-columns: 1fr 1fr;
    gap: 3px; padding: 0 8px;
  }
  .compact-patches :global(.patch-card) {
    padding: 4px 6px;
  }
  .compact-patches :global(.patch-label) { font-size: 10px; }
  .compact-patches :global(.patch-path) { display: none; }
</style>
