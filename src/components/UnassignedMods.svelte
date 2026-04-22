<script>
  import { unassignedMods } from "../lib/modulatorsByParam.js";
  import { lfoShapes, easingNames, sequencer, schema, slotShaders, selectedSlot } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

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

  $: mods = $unassignedMods;
  $: currentBpm = ($sequencer && $sequencer.bpm) ? $sequencer.bpm : 128;
  $: paramNames = ($schema && $schema.params) ? $schema.params.map((p) => p.name) : [];
  $: shaderParamNames = ($slotShaders && $slotShaders.shaderParams)
    ? $slotShaders.shaderParams.filter((p) => typeof p.value === "number").map((p) => p.name)
    : [];

  function retarget(id, newParam) {
    const res = shaderParamNames.includes(newParam) ? "shaderext" : "parameters";
    send({ type: "updateModulator", modulatorId: id, changes: { target: { param: newParam, resource: res } } });
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

{#if mods.length > 0}
  <div class="unassigned">
    <div class="ua-hdr">UNASSIGNED MODULATORS</div>
    {#each mods as m (m.id)}
      <div class="imod">
        <div class="imod-row">
          <span class="imod-id">M{m.id}</span>
          <span class="imod-type">{m.type}</span>
          {#if m.type === "lfo"}
            <span class="imod-shape">{m.shape}</span>
          {:else}
            <span class="imod-shape">ADSR</span>
          {/if}
          <span class="imod-del" onclick={() => deleteMod(m.id)} onkeydown={(e) => e.key === "Enter" && deleteMod(m.id)} role="button" tabindex="0" title="Delete">✕</span>
        </div>
        <div class="imod-target">
          <span class="tgt-label">target</span>
          <select value="---" onchange={(e) => retarget(m.id, e.target.value)}>
            <option value="---">--- select parameter ---</option>
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
        <div class="imod-grid">
          {#if m.type === "lfo"}
            <label>shape
              <select value={m.shape} onchange={(e) => updateField(m.id, "shape", e.target.value)}>
                {#each $lfoShapes as s}<option value={s}>{s}</option>{/each}
              </select>
            </label>
            <label>sync
              <select value={m.beatSync ? m.beatDivision : 0}
                onchange={(e) => updateField(m.id, "beatDivision", e.target.value)}>
                {#each BEAT_DIVISIONS as bd}<option value={bd.value}>{bd.label}</option>{/each}
              </select>
            </label>
          {/if}
          <label>min <input type="number" step="any" value={m.min} class="num-in"
            onchange={(e) => updateField(m.id, "min", e.target.value)} /></label>
          <label>max <input type="number" step="any" value={m.max} class="num-in"
            onchange={(e) => updateField(m.id, "max", e.target.value)} /></label>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .unassigned { margin-top: 8px; }
  .ua-hdr {
    font-family: ui-monospace, monospace; font-size: 8px;
    letter-spacing: .2em; color: #a88adc; text-transform: uppercase;
    padding: 6px 0 4px;
  }
  .imod {
    margin: 2px 0 4px 0;
    border: 1px dashed #8a6aaa;
    border-left: 3px solid #a88adc;
    background: rgba(168,138,220,.06);
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 10px; padding: 6px 8px;
  }
  .imod-row {
    display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
  }
  .imod-id { color: #a88adc; font-weight: 600; }
  .imod-type {
    border: 1px solid #8a6aaa; padding: 0 4px;
    color: #a88adc; font-size: 9px; letter-spacing: .08em; text-transform: uppercase;
  }
  .imod-shape { color: #999; }
  .imod-del {
    background: none; border: none; color: #666; cursor: pointer;
    font-size: 10px; padding: 0 2px; margin-left: auto;
  }
  .imod-del:hover { color: #c06060; }
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
  .num-in {
    width: 4rem; padding: 1px 3px; background: #2a2a30; color: #a88adc;
    border: 1px solid #444; font-size: 9px; font-family: inherit; text-align: right;
  }
</style>
