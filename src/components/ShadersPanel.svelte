<script>
  import { slotShaders, selectedSlot, liveShaderValues } from "../lib/stores.js";
  import { send, request } from "../lib/transport.js";

  $: available = ($slotShaders && $slotShaders.available) || [];
  $: layers = ($slotShaders && $slotShaders.layers) || [];
  $: shaderParams = ($slotShaders && $slotShaders.shaderParams) || [];
  $: enabled = ($slotShaders && $slotShaders.enabled) || false;

  function setShader(layer, shaderIdx) {
    send({ type: "setSlotShader", slot: $selectedSlot, layer, shaderIndex: shaderIdx });
    setTimeout(refresh, 100);
  }

  function setShaderParam(name, value) {
    const v = Number(value);
    send({ type: "setShaderParam", slot: $selectedSlot, name, value: v });
    slotShaders.update((s) => {
      if (!s) return s;
      const params = s.shaderParams.map((p) =>
        p.name === name ? { ...p, value: v } : p
      );
      return { ...s, shaderParams: params };
    });
  }

  function toggleShaders() {
    const next = !enabled;
    send({ type: "toggleShaders", enable: next });
    slotShaders.update((s) => s ? { ...s, enabled: next } : s);
    setTimeout(refresh, 100);
  }

  function livePercent(live) {
    return Math.max(0, Math.min(100, live * 100));
  }

  async function refresh() {
    try {
      const res = await request({ type: "getSlotShaders", slot: $selectedSlot });
      slotShaders.set(res);
    } catch (e) { console.error("refresh shaders failed:", e); }
  }
</script>

<div class="shaders-panel">
  <div class="sh-header">
    <button class="toggle-btn" class:on={enabled} onclick={toggleShaders}>
      Shaders {enabled ? "ON" : "OFF"}
    </button>
  </div>

  {#if layers.length > 0}
    <div class="layers">
      {#each layers as l}
        <div class="layer-row">
          <span class="layer-label">Layer {l.layer}</span>
          <select value={l.shaderIndex}
            onchange={(e) => setShader(l.layer, Number(e.target.value))}>
            {#each available as sh}
              <option value={sh.index}>{sh.name}</option>
            {/each}
          </select>
          <span class="shader-name">{l.shaderName}</span>
        </div>
      {/each}
    </div>
  {/if}

  {#if shaderParams.length > 0}
    <h3 class="section-title">Shader Parameters</h3>
    <div class="params">
      {#each shaderParams as p (p.name)}
        {@const live = $liveShaderValues[p.name]}
        {@const hasLive = p.modulated && live != null}
        <div class="param-row" class:modulated={p.modulated}>
          <label class="param-name" for={p.name}>
            {#if p.modulated}<span class="mod-icon" title="Modulated">~</span>{/if}
            {p.name}
          </label>
          {#if typeof p.value === "number"}
            <div class="slider-wrap">
              <input type="range" id={p.name} min="0" max="1" step="0.005" value={p.value}
                oninput={(e) => setShaderParam(p.name, e.target.value)} />
              {#if hasLive}
                <div class="live-indicator" style="left: {livePercent(live)}%"></div>
              {/if}
            </div>
            <span class="param-value" class:live-value={hasLive}>
              {hasLive ? Number(live).toFixed(3) : Number(p.value).toFixed(3)}
            </span>
          {:else}
            <span class="param-value">{JSON.stringify(p.value)}</span>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="empty">No shader parameters for the current selection.</p>
  {/if}
</div>

<style>
  .shaders-panel { display: flex; flex-direction: column; gap: 0.75rem; }
  .sh-header { display: flex; align-items: center; gap: 0.5rem; }
  .toggle-btn {
    padding: 0.35rem 0.8rem; border-radius: 4px; cursor: pointer;
    font-size: 0.85rem; border: 1px solid #555; background: #3a2228; color: #c88;
  }
  .toggle-btn.on { background: #2a3a2e; color: #8c8; border-color: #4a6a4e; }
  .toggle-btn:hover { opacity: 0.9; }

  .layers { display: flex; flex-direction: column; gap: 0.4rem; }
  .layer-row {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 0.4rem 0.5rem; background: #1e1e24; border: 1px solid #333; border-radius: 4px;
  }
  .layer-label { font-size: 0.82rem; color: #999; width: 4rem; flex-shrink: 0; }
  .layer-row select {
    padding: 0.2rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem; min-width: 8rem;
  }
  .shader-name { font-size: 0.78rem; color: #666; }

  .section-title {
    font-size: 0.82rem; font-weight: 600; color: #888;
    margin: 0.5rem 0 0.25rem; text-transform: uppercase; letter-spacing: 0.04em;
  }

  .params { display: flex; flex-direction: column; gap: 0.4rem; }
  .param-row { display: flex; align-items: center; gap: 0.6rem; }
  .param-row.modulated { opacity: 0.85; }
  .param-row.modulated input[type="range"] { accent-color: #8a6aaa; }
  .param-name {
    width: 12rem; flex-shrink: 0; font-size: 0.8rem; color: #bbb;
    text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .mod-icon { color: #a88adc; font-weight: bold; margin-right: 0.2rem; }
  .slider-wrap {
    flex: 1; position: relative; display: flex; align-items: center; height: 20px;
  }
  .slider-wrap input[type="range"] { width: 100%; }
  input[type="range"] { flex: 1; accent-color: #6a9aaa; height: 5px; }
  .live-indicator {
    position: absolute; top: 50%; width: 3px; height: 14px;
    background: #a88adc; border-radius: 1px;
    transform: translate(-50%, -50%); pointer-events: none;
    transition: left 0.05s linear;
  }
  .param-value {
    width: 4rem; font-family: monospace; font-size: 0.78rem;
    color: #8ac; text-align: right;
  }
  .param-value.live-value { color: #a88adc; }
  .param-row.modulated .param-value { color: #a88adc; }
  .empty { color: #555; font-size: 0.85rem; text-align: center; padding: 1.5rem 0; }
</style>
