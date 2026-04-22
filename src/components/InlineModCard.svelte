<script>
  import { modulatorsByTarget } from "../lib/modulatorsByParam.js";
  import { lfoShapes, easingNames, sequencer, schema, slotShaders, selectedSlot } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

  export let paramName = "";
  export let resource = "parameters";

  $: paramNames = ($schema && $schema.params) ? $schema.params.map((p) => p.name) : [];
  $: shaderParamNames = ($slotShaders && $slotShaders.shaderParams)
    ? $slotShaders.shaderParams.filter((p) => typeof p.value === "number").map((p) => p.name)
    : [];

  function retarget(id, newParam) {
    const res = shaderParamNames.includes(newParam) ? "shaderext" : "parameters";
    send({ type: "updateModulator", modulatorId: id, changes: { target: { param: newParam, resource: res } } });
  }

  const BEAT_DIVISIONS = [
    { label: "Free Hz", value: 0 },
    { label: "16 bars", value: 64 },
    { label: "8 bars",  value: 32 },
    { label: "4 bars",  value: 16 },
    { label: "2 bars",  value: 8 },
    { label: "1 bar",   value: 4 },
    { label: "1/2",     value: 2 },
    { label: "1/4",     value: 1 },
    { label: "1/8",     value: 0.5 },
    { label: "1/16",    value: 0.25 },
    { label: "1/32",    value: 0.125 },
  ];

  $: key = resource + ":" + paramName;
  $: mods = $modulatorsByTarget.get(key) || [];
  $: currentBpm = ($sequencer && $sequencer.bpm) ? $sequencer.bpm : 128;

  let expandedIds = {};

  function toggle(id) {
    expandedIds = { ...expandedIds, [id]: !expandedIds[id] };
  }

  function updateField(id, field, value) {
    const changes = {};
    if (field === "beatDivision") {
      const div = Number(value);
      if (div > 0) {
        changes.beatSync = true;
        changes.beatDivision = div;
        changes.frequency = currentBpm / 60 / div;
      } else {
        changes.beatSync = false;
      }
    } else if (field === "frequency") {
      changes.frequency = Number(value);
      changes.beatSync = false;
    } else if (field === "shape" || field === "easing") {
      changes[field] = value;
    } else {
      changes[field] = Number(value);
    }
    send({ type: "updateModulator", modulatorId: id, changes });
  }

  function deleteMod(id) {
    send({ type: "deleteModulator", modulatorId: id });
  }
</script>

{#each mods as m (m.id)}
  {@const expanded = expandedIds[m.id] || false}
  <div class="imod">
    <div class="imod-hdr" onclick={() => toggle(m.id)} onkeydown={(e) => e.key === "Enter" && toggle(m.id)} role="button" tabindex="0">
      <span class="imod-id">M{m.id}</span>
      <span class="imod-type">{m.type}</span>
      {#if m.type === "lfo"}
        <span class="imod-shape">{m.shape}</span>
        <span class="imod-rate">{m.beatSync ? BEAT_DIVISIONS.find(d => d.value === m.beatDivision)?.label || m.beatDivision : (m.frequency?.toFixed(2) + " Hz")}</span>
      {:else}
        <span class="imod-shape">ADSR</span>
      {/if}
      <span class="imod-chevron">{expanded ? "▾" : "▸"}</span>
      <span class="imod-del" onclick={(e) => { e.stopPropagation(); deleteMod(m.id); }} onkeydown={(e) => { if (e.key === "Enter") { e.stopPropagation(); deleteMod(m.id); }}} role="button" tabindex="0" title="Delete">✕</span>
    </div>

    {#if expanded}
      <div class="imod-body">
        <div class="imod-target">
          <span class="tgt-label">target</span>
          <select value={m.target.param} onchange={(e) => retarget(m.id, e.target.value)}>
            <option value="---">---</option>
            {#if paramNames.length > 0}
              <optgroup label="Patch">
                {#each paramNames as pn}<option value={pn}>{pn}</option>{/each}
              </optgroup>
            {/if}
            {#if shaderParamNames.length > 0}
              <optgroup label="Shader">
                {#each shaderParamNames as sn}<option value={sn}>{sn}</option>{/each}
              </optgroup>
            {/if}
          </select>
        </div>
        {#if m.type === "lfo"}
          <div class="imod-grid">
            <label>shape
              <select value={m.shape} onchange={(e) => updateField(m.id, "shape", e.target.value)}>
                {#each $lfoShapes as s}<option value={s}>{s}</option>{/each}
              </select>
            </label>
            <label>Hz
              <input type="number" step="any" value={m.frequency} class="num-in"
                disabled={m.beatSync}
                onchange={(e) => updateField(m.id, "frequency", e.target.value)} />
            </label>
            <label>sync
              <select value={m.beatSync ? m.beatDivision : 0}
                onchange={(e) => updateField(m.id, "beatDivision", e.target.value)}>
                {#each BEAT_DIVISIONS as bd}<option value={bd.value}>{bd.label}</option>{/each}
              </select>
            </label>
            <label>phase
              <input type="range" min="0" max="1" step="0.01" value={m.phase}
                oninput={(e) => updateField(m.id, "phase", e.target.value)} />
            </label>
          </div>
        {:else if m.type === "envelope"}
          <div class="imod-grid">
            <label>atk <input type="range" min="0.001" max="2" step="0.005" value={m.attack}
              oninput={(e) => updateField(m.id, "attack", e.target.value)} /></label>
            <label>dec <input type="range" min="0.001" max="2" step="0.005" value={m.decay}
              oninput={(e) => updateField(m.id, "decay", e.target.value)} /></label>
            <label>sus <input type="range" min="0" max="1" step="0.01" value={m.sustain}
              oninput={(e) => updateField(m.id, "sustain", e.target.value)} /></label>
            <label>rel <input type="range" min="0.001" max="2" step="0.005" value={m.release}
              oninput={(e) => updateField(m.id, "release", e.target.value)} /></label>
            <label>trig <input type="range" min="0.25" max="8" step="0.25" value={m.triggerBeats}
              oninput={(e) => updateField(m.id, "triggerBeats", e.target.value)} /></label>
            <label>gate <input type="range" min="0.05" max="0.95" step="0.01" value={m.gateRatio}
              oninput={(e) => updateField(m.id, "gateRatio", e.target.value)} /></label>
          </div>
        {/if}
        <div class="imod-grid imod-common">
          <label>min <input type="number" step="any" value={m.min} class="num-in"
            onchange={(e) => updateField(m.id, "min", e.target.value)} /></label>
          <label>max <input type="number" step="any" value={m.max} class="num-in"
            onchange={(e) => updateField(m.id, "max", e.target.value)} /></label>
          <label>curve
            <select value={m.easing || "linear"} onchange={(e) => updateField(m.id, "easing", e.target.value)}>
              {#each $easingNames as name}<option value={name}>{name}</option>{/each}
            </select>
          </label>
        </div>
      </div>
    {/if}
  </div>
{/each}

<style>
  .imod {
    margin: 2px 0 4px 0;
    border: 1px solid #8a6aaa;
    border-left: 3px solid #a88adc;
    background: rgba(168,138,220,.04);
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 10px;
  }
  .imod-hdr {
    display: flex; align-items: center; gap: 6px;
    width: 100%; padding: 4px 8px;
    background: none; border: none; color: #ccc;
    cursor: pointer; font: inherit; text-align: left;
  }
  .imod-hdr:hover { background: rgba(168,138,220,.08); }
  .imod-id { color: #a88adc; font-weight: 600; }
  .imod-type {
    border: 1px solid #8a6aaa; padding: 0 4px;
    color: #a88adc; font-size: 9px; letter-spacing: .08em; text-transform: uppercase;
  }
  .imod-shape { color: #999; }
  .imod-rate { color: #777; margin-left: auto; }
  .imod-chevron { color: #666; font-size: 9px; width: 12px; text-align: center; }
  .imod-del {
    background: none; border: none; color: #666; cursor: pointer;
    font-size: 10px; padding: 0 2px;
  }
  .imod-del:hover { color: #c06060; }
  .imod-body { padding: 4px 8px 6px; }
  .imod-target {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 4px; padding-bottom: 4px;
    border-bottom: 1px dashed rgba(138,106,170,.2);
  }
  .tgt-label { color: #888; font-size: 9px; letter-spacing: .05em; flex-shrink: 0; }
  .imod-target select {
    flex: 1; padding: 1px 3px; background: #2a2a30; color: #ddd;
    border: 1px solid #444; font-size: 9px; font-family: inherit;
  }
  .imod-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 3px 10px;
  }
  .imod-grid label {
    display: flex; align-items: center; gap: 4px;
    color: #888; font-size: 9px; letter-spacing: .05em;
  }
  .imod-grid select {
    flex: 1; padding: 1px 3px; background: #2a2a30; color: #ddd;
    border: 1px solid #444; font-size: 9px; font-family: inherit;
  }
  .imod-grid input[type="range"] {
    flex: 1; accent-color: #8a6aaa; height: 4px;
  }
  .num-in {
    width: 4rem; padding: 1px 3px; background: #2a2a30; color: #a88adc;
    border: 1px solid #444; font-size: 9px; font-family: inherit; text-align: right;
  }
  .num-in:disabled { color: #555; }
  .imod-common { margin-top: 3px; padding-top: 3px; border-top: 1px dashed rgba(138,106,170,.3); }
</style>
