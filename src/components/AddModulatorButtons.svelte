<script>
  import { schema, selectedSlot, slotShaders } from "../lib/stores.js";
  import { send } from "../lib/transport.js";

  $: paramNames = ($schema && $schema.params) ? $schema.params.map((p) => p.name) : [];
  $: shaderParamNames = ($slotShaders && $slotShaders.shaderParams)
    ? $slotShaders.shaderParams.filter((p) => typeof p.value === "number").map((p) => p.name)
    : [];

  function firstParam() {
    return paramNames[0] || shaderParamNames[0] || "---";
  }

  function targetResource(name) {
    return shaderParamNames.includes(name) ? "shaderext" : "parameters";
  }

  function addLfo() {
    const p = firstParam();
    send({
      type: "createModulator",
      config: {
        type: "lfo", shape: "Sine", frequency: 0.5, phase: 0.0,
        beatSync: false, beatDivision: 4, min: 0.0, max: 1.0, easing: "linear",
        target: { slot: $selectedSlot, param: p, resource: targetResource(p) },
      },
    });
  }

  function addEnvelope() {
    const p = firstParam();
    send({
      type: "createModulator",
      config: {
        type: "envelope", attack: 0.1, decay: 0.15, sustain: 0.6, release: 0.3,
        triggerBeats: 1.0, gateRatio: 0.5, min: 0.0, max: 1.0, easing: "linear",
        target: { slot: $selectedSlot, param: p, resource: targetResource(p) },
      },
    });
  }
</script>

<div class="add-mod">
  <button onclick={addLfo}>+ LFO</button>
  <button onclick={addEnvelope}>+ ENV</button>
</div>

<style>
  .add-mod { display: flex; gap: 4px; padding: 4px 10px; }
  .add-mod button {
    flex: 1; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .1em;
    background: transparent; border: 1px dashed #555; color: #888;
    padding: 5px; cursor: pointer;
  }
  .add-mod button:hover { color: #a88adc; border-color: #8a6aaa; }
</style>
