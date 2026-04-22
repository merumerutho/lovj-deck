<script>
  import { send } from "../lib/transport.js";
  import { writable } from "svelte/store";

  export let bpm = 128;

  let bpmInput = 128;
  $: bpmInput = Math.round(bpm);

  function setBpm() {
    send({ type: "setBPM", bpm: bpmInput });
  }

  function tapBpm() {
    send({ type: "setBPM", bpm: bpmInput }); // placeholder — real tap goes through clock
  }

  function resetPhase() {
    send({ type: "resetPhase" });
  }
</script>

<div class="project-bar">
  <label class="bpm-ctl">
    <span class="label">BPM</span>
    <input type="number" min="20" max="300" step="1"
      bind:value={bpmInput} onchange={setBpm} />
  </label>
  <button class="pbtn" onclick={resetPhase}>Reset Phase</button>
</div>

<style>
  .project-bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem;
    background: #1e1e24;
    border: 1px solid #333;
    border-radius: 5px;
    margin-bottom: 0.75rem;
  }
  .bpm-ctl {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: #aaa;
  }
  .bpm-ctl .label { font-weight: 600; color: #8c8; }
  .bpm-ctl input {
    width: 4.5rem;
    padding: 0.25rem 0.3rem;
    background: #2a2a30;
    color: #ddd;
    border: 1px solid #444;
    border-radius: 3px;
    font-size: 0.85rem;
    text-align: center;
  }
  .pbtn {
    padding: 0.3rem 0.6rem;
    background: #2a2a30;
    color: #ddd;
    border: 1px solid #555;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.82rem;
  }
  .pbtn:hover { background: #363640; }
</style>
