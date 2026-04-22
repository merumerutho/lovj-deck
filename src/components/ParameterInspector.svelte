<script>
  import { schema, selectedSlot, liveValues } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

  function setParam(name, value, type) {
    let v = Number(value);
    if (type === "int") v = Math.round(v);
    send({ type: "setParam", slot: $selectedSlot, name, value: v });
  }

  function pMin(p) { return p.min ?? 0; }
  function pMax(p) { return p.max ?? 1; }
  function pStep(p) {
    if (p.step != null) return p.step;
    if (p.type === "int") return 1;
    const range = pMax(p) - pMin(p);
    if (range <= 2) return 0.005;
    if (range <= 100) return 0.1;
    return 1;
  }

  function fmtValue(v, p) {
    if (p.type === "int") return Math.round(v).toString();
    const range = pMax(p) - pMin(p);
    return range < 10 ? Number(v).toFixed(3) : Number(v).toFixed(1);
  }

  function livePercent(p, live) {
    const lo = pMin(p), hi = pMax(p);
    if (hi === lo) return 50;
    return ((live - lo) / (hi - lo)) * 100;
  }
</script>

{#if $schema && $schema.params && $schema.params.length > 0}
  <div class="params">
    {#each $schema.params as p (p.name)}
      {@const live = $liveValues[p.name]}
      {@const hasLive = p.modulated && live != null}
      <div class="param-row" class:modulated={p.modulated}>
        <label class="param-name" for={p.name}>
          {#if p.modulated}<span class="mod-icon" title="Modulated">~</span>{/if}
          {p.name}
        </label>
        <div class="slider-wrap">
          <input
            type="range"
            id={p.name}
            min={pMin(p)}
            max={pMax(p)}
            step={pStep(p)}
            value={p.value}
            oninput={(e) => setParam(p.name, e.target.value, p.type)}
          />
          {#if hasLive}
            <div
              class="live-indicator"
              style="left: {livePercent(p, live)}%"
            ></div>
          {/if}
        </div>
        <span class="param-value" class:live-value={hasLive}>
          {hasLive ? fmtValue(live, p) : fmtValue(p.value, p)}
        </span>
      </div>
    {/each}
  </div>
{:else if $schema}
  <p class="empty">No named parameters in this patch.</p>
{:else}
  <p class="empty">Select a slot to inspect.</p>
{/if}

<style>
  .params {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .param-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .param-row.modulated {
    opacity: 0.85;
  }
  .param-row.modulated input[type="range"] {
    accent-color: #8a6aaa;
  }
  .param-name {
    width: 10rem;
    flex-shrink: 0;
    font-size: 0.85rem;
    color: #bbb;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mod-icon {
    color: #a88adc;
    font-weight: bold;
    margin-right: 0.2rem;
  }
  .slider-wrap {
    flex: 1;
    position: relative;
    display: flex;
    align-items: center;
    height: 20px;
  }
  input[type="range"] {
    width: 100%;
    accent-color: #5a9a6a;
    height: 6px;
  }
  .live-indicator {
    position: absolute;
    top: 50%;
    width: 3px;
    height: 14px;
    background: #a88adc;
    border-radius: 1px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition: left 0.05s linear;
  }
  .param-value {
    width: 4.5rem;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.82rem;
    color: #8c8;
    text-align: right;
  }
  .param-value.live-value {
    color: #a88adc;
  }
  .param-row.modulated .param-value {
    color: #a88adc;
  }
  .empty {
    color: #666;
    font-size: 0.9rem;
    text-align: center;
    padding: 2rem 0;
  }
</style>
