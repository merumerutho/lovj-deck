<script>
  import { modulators, lfoShapes, easingNames, schema, selectedSlot, slots, slotShaders, sequencer } from "../lib/stores.js";
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

  $: currentBpm = ($sequencer && $sequencer.bpm) ? $sequencer.bpm : 128;

  $: paramNames = ($schema && $schema.params) ? $schema.params.map((p) => p.name) : [];
  $: shaderParamNames = ($slotShaders && $slotShaders.shaderParams)
    ? $slotShaders.shaderParams
        .filter((p) => typeof p.value === "number")
        .map((p) => p.name)
    : [];

  function targetResource(paramName) {
    return shaderParamNames.includes(paramName) ? "shaderext" : "parameters";
  }

  function addLfo() {
    const p = paramNames[0] || "---";
    send({
      type: "createModulator",
      config: {
        type: "lfo",
        shape: "Sine",
        frequency: 0.5,
        phase: 0.0,
        beatSync: false,
        beatDivision: 4,
        min: 0.0,
        max: 1.0,
        easing: "linear",
        target: { slot: $selectedSlot, param: p, resource: targetResource(p) },
      },
    });
  }

  function addEnvelope() {
    const p = paramNames[0] || "---";
    send({
      type: "createModulator",
      config: {
        type: "envelope",
        attack: 0.1,
        decay: 0.15,
        sustain: 0.6,
        release: 0.3,
        triggerBeats: 1.0,
        gateRatio: 0.5,
        min: 0.0,
        max: 1.0,
        easing: "linear",
        target: { slot: $selectedSlot, param: p, resource: targetResource(p) },
      },
    });
  }

  function deleteModulator(id) {
    send({ type: "deleteModulator", modulatorId: id });
  }

  function updateField(id, field, value) {
    const changes = {};
    if (field === "targetParam") {
      changes.target = { param: value, resource: targetResource(value) };
    } else if (field === "targetSlot") {
      changes.target = { slot: Number(value) };
    } else if (field === "shape" || field === "easing") {
      changes[field] = value;
    } else if (field === "beatDivision") {
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
    } else {
      changes[field] = Number(value);
    }
    send({ type: "updateModulator", modulatorId: id, changes });
  }

  function displayResource(m) {
    return (m.target && m.target.resource === "shaderext") ? "shader" : "param";
  }
</script>

<div class="mod-panel">
  <div class="add-row">
    <button class="add-btn" onclick={addLfo}>+ LFO</button>
    <button class="add-btn env" onclick={addEnvelope}>+ Envelope</button>
  </div>

  {#if $modulators.length === 0}
    <p class="empty">No modulators active.</p>
  {:else}
    {#each $modulators as m (m.id)}
      <div class="mod-card">
        <div class="mod-header">
          <span class="mod-id">#{m.id}</span>
          <span class="mod-type">{m.type}</span>

          {#if m.type === "lfo"}
            <select value={m.shape} onchange={(e) => updateField(m.id, "shape", e.target.value)}>
              {#each $lfoShapes as shape}
                <option value={shape}>{shape}</option>
              {/each}
            </select>
          {/if}

          <span class="arrow">&#8594;</span>
          <select value={m.target.slot} onchange={(e) => updateField(m.id, "targetSlot", e.target.value)}>
            {#each $slots as s}
              <option value={s.index}>{s.index}</option>
            {/each}
          </select>
          <span class="sep">/</span>
          <select value={m.target.param} onchange={(e) => updateField(m.id, "targetParam", e.target.value)}>
            <option value="---">---</option>
            {#if paramNames.length > 0}
              <optgroup label="Patch">
                {#each paramNames as pn}
                  <option value={pn}>{pn}</option>
                {/each}
              </optgroup>
            {/if}
            {#if shaderParamNames.length > 0}
              <optgroup label="Shader">
                {#each shaderParamNames as sn}
                  <option value={sn}>{sn}</option>
                {/each}
              </optgroup>
            {/if}
          </select>
          <span class="res-tag">{displayResource(m)}</span>
          <button class="del-btn" onclick={() => deleteModulator(m.id)} title="Delete">&#10005;</button>
        </div>

        <div class="mod-controls">
          {#if m.type === "lfo"}
            <label class="hz-label">Hz
              <input type="number" step="any" value={m.frequency}
                class="hz-input"
                disabled={m.beatSync}
                onchange={(e) => updateField(m.id, "frequency", e.target.value)} />
            </label>
            <label>sync
              <select class="beat-sel"
                value={m.beatSync ? m.beatDivision : 0}
                onchange={(e) => updateField(m.id, "beatDivision", e.target.value)}>
                {#each BEAT_DIVISIONS as bd}
                  <option value={bd.value}>{bd.label}</option>
                {/each}
              </select>
            </label>
            <label>phase
              <input type="range" min="0" max="1" step="0.01" value={m.phase}
                oninput={(e) => updateField(m.id, "phase", e.target.value)} />
              <span class="val">{m.phase.toFixed(2)}</span>
            </label>
          {:else if m.type === "envelope"}
            <label>atk
              <input type="range" min="0.001" max="2" step="0.005" value={m.attack}
                oninput={(e) => updateField(m.id, "attack", e.target.value)} />
              <span class="val">{m.attack.toFixed(3)}</span>
            </label>
            <label>dec
              <input type="range" min="0.001" max="2" step="0.005" value={m.decay}
                oninput={(e) => updateField(m.id, "decay", e.target.value)} />
              <span class="val">{m.decay.toFixed(3)}</span>
            </label>
            <label>sus
              <input type="range" min="0" max="1" step="0.01" value={m.sustain}
                oninput={(e) => updateField(m.id, "sustain", e.target.value)} />
              <span class="val">{m.sustain.toFixed(2)}</span>
            </label>
            <label>rel
              <input type="range" min="0.001" max="2" step="0.005" value={m.release}
                oninput={(e) => updateField(m.id, "release", e.target.value)} />
              <span class="val">{m.release.toFixed(3)}</span>
            </label>
            <label>trig beats
              <input type="range" min="0.25" max="8" step="0.25" value={m.triggerBeats}
                oninput={(e) => updateField(m.id, "triggerBeats", e.target.value)} />
              <span class="val">{m.triggerBeats.toFixed(2)}</span>
            </label>
            <label>gate
              <input type="range" min="0.05" max="0.95" step="0.01" value={m.gateRatio}
                oninput={(e) => updateField(m.id, "gateRatio", e.target.value)} />
              <span class="val">{m.gateRatio.toFixed(2)}</span>
            </label>
          {/if}
          <label>min
            <input type="number" step="any" value={m.min} class="hz-input"
              onchange={(e) => updateField(m.id, "min", e.target.value)} />
          </label>
          <label>max
            <input type="number" step="any" value={m.max} class="hz-input"
              onchange={(e) => updateField(m.id, "max", e.target.value)} />
          </label>
          <label class="easing-label">curve
            <select value={m.easing || "linear"} onchange={(e) => updateField(m.id, "easing", e.target.value)}>
              {#each $easingNames as name}
                <option value={name}>{name}</option>
              {/each}
            </select>
          </label>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .mod-panel { display: flex; flex-direction: column; gap: 0.6rem; }
  .add-row { display: flex; gap: 0.4rem; justify-content: flex-end; }
  .add-btn {
    padding: 0.35rem 0.8rem; background: #2a3a2e; color: #8c8;
    border: 1px solid #4a6a4e; border-radius: 4px; cursor: pointer; font-size: 0.85rem;
  }
  .add-btn:hover { background: #3a4a3e; }
  .add-btn.env { background: #2e2a3a; color: #a88adc; border-color: #4e4a6a; }
  .add-btn.env:hover { background: #3e3a4a; }
  .mod-card {
    background: #1e1e24; border: 1px solid #333; border-radius: 5px; padding: 0.6rem 0.8rem;
  }
  .mod-header {
    display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.5rem;
  }
  .mod-id { color: #666; font-size: 0.8rem; font-family: monospace; width: 1.8rem; }
  .mod-type { color: #888; font-size: 0.75rem; text-transform: uppercase; background: #2a2a30; padding: 0.1rem 0.3rem; border-radius: 3px; }
  .arrow { color: #666; font-size: 0.9rem; }
  .sep { color: #555; }
  .res-tag {
    font-size: 0.65rem; color: #668; text-transform: uppercase;
    background: #1a1a24; padding: 0.1rem 0.3rem; border-radius: 2px;
    letter-spacing: 0.03em;
  }
  .mod-header select {
    padding: 0.2rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem;
  }
  .del-btn {
    margin-left: auto; background: #3a2228; color: #c88; border: 1px solid #5a3338;
    border-radius: 3px; padding: 0.15rem 0.4rem; cursor: pointer; font-size: 0.8rem;
  }
  .del-btn:hover { background: #4a3238; }
  .mod-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 1rem; }
  .mod-controls label {
    display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #999;
  }
  .mod-controls input[type="range"] { flex: 1; accent-color: #8a6aaa; height: 5px; }
  .mod-controls .val {
    width: 2.8rem; text-align: right; font-family: monospace; font-size: 0.78rem; color: #a88adc;
  }
  .easing-label select {
    flex: 1; padding: 0.2rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.8rem;
  }
  .hz-label { flex-direction: row; }
  .hz-input {
    width: 5rem; padding: 0.2rem 0.3rem; background: #2a2a30; color: #a88adc;
    border: 1px solid #444; border-radius: 3px; font-size: 0.82rem;
    font-family: monospace; text-align: right;
  }
  .hz-input:disabled { color: #666; }
  .beat-sel {
    flex: 1; padding: 0.2rem 0.3rem; background: #2a2a30; color: #ddd;
    border: 1px solid #444; border-radius: 3px; font-size: 0.8rem;
  }
  .empty { color: #555; font-size: 0.85rem; text-align: center; padding: 1rem 0; }
</style>
