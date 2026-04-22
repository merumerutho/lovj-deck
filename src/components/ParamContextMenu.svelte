<script>
  import { tick } from "svelte";
  import { selectedSlot } from "../lib/stores.js";
  import { send } from "../lib/transport.js";
  import { anchorPoint, clampToViewport } from "../lib/ctxPosition.js";

  let visible = false;
  let pos = { x: 0, y: 0 };
  let targetParam = "";
  let targetResource = "parameters";
  let menuEl;

  export async function show(event, paramName, resource) {
    event.preventDefault();
    targetParam = paramName;
    targetResource = resource || "parameters";
    pos = anchorPoint(event);
    visible = true;
    await tick();
    clampToViewport(menuEl, pos);
  }

  function hide() { visible = false; }

  function addMod(type) {
    const base = {
      min: 0.0, max: 1.0, easing: "linear",
      target: { slot: $selectedSlot, param: targetParam, resource: targetResource },
    };
    if (type === "lfo") {
      send({ type: "createModulator", config: {
        ...base, type: "lfo", shape: "Sine", frequency: 0.5, phase: 0.0,
        beatSync: false, beatDivision: 4,
      }});
    } else {
      send({ type: "createModulator", config: {
        ...base, type: "envelope", attack: 0.1, decay: 0.15, sustain: 0.6,
        release: 0.3, triggerBeats: 1.0, gateRatio: 0.5,
      }});
    }
    hide();
  }
</script>

<svelte:window onclick={hide} />

{#if visible}
  <div class="ctx-menu" bind:this={menuEl} style="left:{pos.x}px; top:{pos.y}px">
    <button onclick={() => addMod("lfo")}>+ LFO → {targetParam}</button>
    <button onclick={() => addMod("envelope")}>+ Envelope → {targetParam}</button>
  </div>
{/if}

<style>
  .ctx-menu {
    position: fixed; z-index: 100;
    background: #2a2a30; border: 1px solid #555;
    box-shadow: 2px 2px 8px rgba(0,0,0,.5);
    display: flex; flex-direction: column;
    min-width: 160px;
  }
  .ctx-menu button {
    background: none; border: none; color: #ccc;
    font-family: ui-monospace, monospace; font-size: 10px;
    padding: 6px 10px; text-align: left; cursor: pointer;
    letter-spacing: .03em;
  }
  .ctx-menu button:hover { background: rgba(168,138,220,.15); color: #a88adc; }
</style>
