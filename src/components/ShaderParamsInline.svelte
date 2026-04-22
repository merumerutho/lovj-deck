<script>
  import { slotShaders, selectedSlot, liveShaderValues } from "../lib/stores.js";
  import { send } from "../lib/transport.js";
  import InlineModCard from "./InlineModCard.svelte";
  import ParamContextMenu from "./ParamContextMenu.svelte";

  let ctxMenu;

  $: shaderParams = ($slotShaders && $slotShaders.shaderParams) || [];
  $: layers = ($slotShaders && $slotShaders.layers) || [];

  $: activeShaderNames = new Set(
    layers
      .map((l) => l.shaderName)
      .filter((n) => n && n !== "00_default")
  );

  $: activeParams = shaderParams.filter(
    (p) => [...activeShaderNames].some((s) => p.name.startsWith(s + "_"))
  );
  $: inactiveParams = shaderParams.filter(
    (p) => ![...activeShaderNames].some((s) => p.name.startsWith(s + "_"))
  );

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

  function livePercent(live) {
    return Math.max(0, Math.min(100, live * 100));
  }

  function shaderLabel(paramName) {
    for (const s of activeShaderNames) {
      if (paramName.startsWith(s + "_")) return s;
    }
    return null;
  }
</script>

{#if shaderParams.length > 0}
  {#if activeParams.length > 0}
    <div class="params active-section">
      {#each activeParams as p (p.name)}
        {@const live = $liveShaderValues[p.name]}
        {@const hasLive = p.modulated && live != null}
        <div class="param-row active" class:modulated={p.modulated}
          oncontextmenu={(e) => ctxMenu.show(e, p.name, "shaderext")}>
          <label class="param-name" for={p.name}>
            {#if p.modulated}<span class="mod-icon">~</span>{/if}
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
        {#if p.modulated}
          <InlineModCard paramName={p.name} resource="shaderext" />
        {/if}
      {/each}
    </div>
  {/if}

  {#if inactiveParams.length > 0}
    <div class="inactive-hdr">OTHER SHADER PARAMS</div>
    <div class="params inactive-section">
      {#each inactiveParams as p (p.name)}
        {@const live = $liveShaderValues[p.name]}
        {@const hasLive = p.modulated && live != null}
        <div class="param-row inactive" class:modulated={p.modulated}
          oncontextmenu={(e) => ctxMenu.show(e, p.name, "shaderext")}>
          <label class="param-name" for={p.name}>
            {#if p.modulated}<span class="mod-icon">~</span>{/if}
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
        {#if p.modulated}
          <InlineModCard paramName={p.name} resource="shaderext" />
        {/if}
      {/each}
    </div>
  {/if}

  {#if activeParams.length === 0 && inactiveParams.length === 0}
    <p class="empty">No shader parameters for the current selection.</p>
  {/if}
{:else}
  <p class="empty">No shader parameters for the current selection.</p>
{/if}

<ParamContextMenu bind:this={ctxMenu} />

<style>
  .params { display: flex; flex-direction: column; gap: 0; }
  .active-section { border-left: 2px solid #6a9aaa; padding-left: 6px; }
  .inactive-hdr {
    font-family: ui-monospace, monospace; font-size: 8px;
    letter-spacing: .2em; color: #555; text-transform: uppercase;
    padding: 8px 0 4px;
  }
  .inactive-section { opacity: 0.5; }
  .inactive-section:hover { opacity: 0.75; }
  .param-row {
    display: flex; align-items: center; gap: 0.6rem;
    padding: 3px 0; border-bottom: 1px dashed rgba(106,104,96,.2);
  }
  .param-row.modulated { opacity: 0.85; }
  .param-row.modulated input[type="range"] { accent-color: #8a6aaa; }
  .param-name {
    width: 10rem; flex-shrink: 0; font-size: 10px; color: #6a9aaa;
    text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-family: ui-monospace, monospace;
  }
  .param-row.inactive .param-name { color: #556; }
  .mod-icon { color: #a88adc; font-weight: bold; margin-right: 2px; }
  .slider-wrap {
    flex: 1; position: relative; display: flex; align-items: center; height: 18px;
  }
  .slider-wrap input[type="range"] { width: 100%; }
  input[type="range"] { flex: 1; accent-color: #6a9aaa; height: 5px; }
  .param-row.inactive input[type="range"] { accent-color: #444; }
  .live-indicator {
    position: absolute; top: 50%; width: 2px; height: 14px;
    background: #a88adc; transform: translate(-50%, -50%);
    pointer-events: none; transition: left 0.05s linear;
  }
  .param-value {
    width: 3.8rem; font-family: ui-monospace, monospace; font-size: 10px;
    color: #8ac; text-align: right;
  }
  .param-row.inactive .param-value { color: #556; }
  .param-value.live-value { color: #a88adc; }
  .param-row.modulated .param-value { color: #a88adc; }
  .empty { color: #555; font-size: 11px; text-align: center; padding: 1rem 0; }
</style>
