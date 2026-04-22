<script>
  import { slotShaders, selectedSlot } from "../lib/stores.js";
  import { send, request } from "../lib/transport.js";

  $: available = ($slotShaders && $slotShaders.available) || [];
  $: layers = ($slotShaders && $slotShaders.layers) || [];
  $: enabled = ($slotShaders && $slotShaders.enabled) || false;

  function setShader(layer, shaderIdx) {
    send({ type: "setSlotShader", slot: $selectedSlot, layer, shaderIndex: shaderIdx });
    setTimeout(refresh, 100);
  }

  function toggleShaders() {
    const next = !enabled;
    send({ type: "toggleShaders", enable: next });
    slotShaders.update((s) => s ? { ...s, enabled: next } : s);
    setTimeout(refresh, 100);
  }

  async function refresh() {
    try {
      const res = await request({ type: "getSlotShaders", slot: $selectedSlot });
      slotShaders.set(res);
    } catch (e) { console.error("refresh shaders failed:", e); }
  }
</script>

<div class="shader-layers">
  <button class="toggle-btn" class:on={enabled} onclick={toggleShaders}>
    {enabled ? "ON" : "OFF"}
  </button>

  {#each layers as l}
    <div class="layer-row">
      <span class="layer-lbl">L{l.layer}</span>
      <select value={l.shaderIndex}
        onchange={(e) => setShader(l.layer, Number(e.target.value))}>
        {#each available as sh}
          <option value={sh.index}>{sh.name}</option>
        {/each}
      </select>
    </div>
  {/each}
</div>

<style>
  .shader-layers { display: flex; flex-direction: column; gap: 3px; padding: 0 10px 8px; }
  .toggle-btn {
    align-self: flex-start;
    padding: 3px 10px; font-family: ui-monospace, monospace; font-size: 9px;
    letter-spacing: .15em; border: 1px solid #555; background: #3a2228;
    color: #c88; cursor: pointer; margin-bottom: 2px;
  }
  .toggle-btn.on { background: #2a3a2e; color: #8c8; border-color: #4a6a4e; }
  .layer-row {
    display: flex; align-items: center; gap: 6px;
  }
  .layer-lbl {
    font-family: ui-monospace, monospace; font-size: 9px; color: #666;
    letter-spacing: .15em; width: 22px;
  }
  .layer-row select {
    flex: 1; padding: 2px 4px; background: #2a2a30; color: #ddd;
    border: 1px solid #444; font-family: ui-monospace, monospace; font-size: 10px;
  }
</style>
