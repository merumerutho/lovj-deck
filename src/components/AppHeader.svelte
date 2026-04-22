<script>
  import { connected, reconnect } from "../lib/transport.js";
  import { send } from "../lib/transport.js";
  import { schema, selectedSlot, modulators, sequencer, beatPhase } from "../lib/stores.js";

  export let bpm = 128;

  let bpmInput = 128;
  $: bpmInput = Math.round(bpm);

  $: patchName = ($schema && $schema.patchName)
    ? $schema.patchName.replace(/.*\//, "")
    : "—";
  $: modCount = $modulators.length;
  $: seqPlaying = $sequencer && $sequencer.playing;

  function setBpm() {
    send({ type: "setBPM", bpm: bpmInput });
  }

  function seqPlay() { send({ type: "sequencerPlay" }); }
  function seqStop() { send({ type: "sequencerStop" }); }
  function tap() { send({ type: "tap" }); }
  function resetPhase() { send({ type: "resetPhase" }); }
</script>

<header class="deck-hdr">
  <div class="brand">
    <span class="led" class:up={$connected}></span>
    LOVJ Deck
  </div>
  <button class="btn-recon" onclick={reconnect} title="Reconnect">RECONN</button>
  <div class="ctx">
    <b>{patchName}</b> · slot <b>{$selectedSlot}</b> · {modCount} mod{modCount !== 1 ? "s" : ""}
  </div>
  <div class="transport">
    <button class="tap" onclick={tap}>TAP</button>
    <button class="rst" onclick={resetPhase}>RST</button>
    <div class="beat-leds">
      {#each [0,1,2,3] as i}
        <span class="beat-led" class:on={Math.floor($beatPhase) === i}
              class:down={i === 0 && Math.floor($beatPhase) === 0}></span>
      {/each}
    </div>
    <div class="bpm">
      <input type="number" class="bpm-n" min="20" max="300" step="1"
        bind:value={bpmInput} onchange={setBpm} />
      <span class="bpm-u">BPM</span>
    </div>
    <button class="play" class:active={seqPlaying} onclick={seqPlay}>▶</button>
    <button class="stop" onclick={seqStop}>■</button>
  </div>
</header>

<style>
  .deck-hdr {
    display: flex; align-items: center; height: 46px;
    padding: 0 14px; gap: 14px;
    background: #222227; border-bottom: 1px solid #333;
    font-family: ui-monospace, monospace; font-size: 10px;
  }
  .brand {
    font-family: system-ui, sans-serif; font-size: 14px; font-weight: 600;
    display: flex; align-items: center; gap: 8px; color: #ddd;
    letter-spacing: -0.01em; flex-shrink: 0;
  }
  .led {
    width: 9px; height: 9px; border-radius: 50%;
    background: #a44; transition: background 0.2s;
  }
  .led.up { background: #4a8; box-shadow: 0 0 6px rgba(90,154,106,.7); }
  .btn-recon {
    font-family: inherit; font-size: 9px; letter-spacing: .1em;
    background: transparent; color: #888; border: 1px dashed #555;
    padding: 3px 7px; cursor: pointer;
  }
  .btn-recon:hover { color: #ddd; border-color: #888; }
  .ctx {
    color: #888; font-size: 10px; letter-spacing: .05em;
    padding-left: 10px; border-left: 1px solid #444;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .ctx b { color: #ddd; font-weight: 500; }
  .transport {
    display: flex; align-items: center; gap: 8px;
    margin-left: auto; flex-shrink: 0;
  }
  .tap, .rst, .play, .stop {
    font-family: inherit; font-size: 10px; letter-spacing: .1em;
    padding: 5px 10px; background: transparent;
    border: 1px solid #555; color: #ddd; cursor: pointer;
  }
  .tap:hover, .rst:hover { background: #2a2a30; }
  .rst { border-color: #555; color: #888; }
  .play { border-color: #5a9a6a; color: #5a9a6a; }
  .play.active { background: rgba(90,154,106,.15); }
  .play:hover { background: rgba(90,154,106,.1); }
  .stop { border-color: #c06060; color: #c06060; }
  .stop:hover { background: rgba(192,96,96,.1); }
  .beat-leds {
    display: flex; align-items: center; gap: 4px;
  }
  .beat-led {
    width: 8px; height: 8px; border-radius: 50%;
    background: #333; transition: background 0.05s, box-shadow 0.05s;
  }
  .beat-led.on {
    background: #5a9a6a; box-shadow: 0 0 6px rgba(90,154,106,.7);
  }
  .beat-led.down {
    background: #8ad; box-shadow: 0 0 6px rgba(138,170,221,.7);
  }
  .bpm {
    display: flex; align-items: baseline; gap: 4px;
  }
  .bpm-n {
    width: 4.5rem; font-family: inherit; font-size: 22px; font-weight: 700;
    color: #ddd; background: transparent; border: none; text-align: right;
    -moz-appearance: textfield;
  }
  .bpm-n::-webkit-inner-spin-button,
  .bpm-n::-webkit-outer-spin-button { -webkit-appearance: none; }
  .bpm-u { font-size: 9px; color: #888; letter-spacing: .1em; }
</style>
