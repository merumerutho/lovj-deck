<script>
  import { midiMappings, midiDevices, midiLearnState, midiActivity } from "../lib/stores.js";
  import { request, send } from "../lib/transport.js";

  async function fetchMidi() {
    const [devRes, mapRes] = await Promise.all([
      request({ type: "getMidiDevices" }),
      request({ type: "getMidiMappings" }),
    ]);
    midiDevices.set(devRes.devices || []);
    midiMappings.set(mapRes.mappings || []);
  }

  fetchMidi();

  function deleteMapping(id) {
    send({ type: "deleteMidiMapping", mappingId: id });
  }

  function saveMappings() {
    request({ type: "saveMidiMappings" });
  }

  function cancelLearn() {
    send({ type: "cancelMidiLearn" });
    midiLearnState.set(null);
  }

  function fmtMidiKey(m) {
    const key = String(m.midiKey);
    if (m.midiType === "cc") return `CC ${key}`;
    if (m.midiType === "note") return `Note ${key}`;
    if (m.midiType === "program") return `PC ${key}`;
    return key;
  }

  function fmtTarget(m) {
    if (m.label) return m.label;
    return m.command + "(" + (m.args || []).join(", ") + ")";
  }
</script>

<div class="midi-panel">
  <div class="section">
    <div class="sec-label"><span class="sec-dot blue"></span>MIDI DEVICES</div>
    {#if $midiDevices.length > 0}
      {#each $midiDevices as dev}
        <div class="device-row">
          <span class="device-name">{dev.name ?? dev.id}</span>
          <span class="device-status" class:on={dev.enabled}>
            {dev.enabled ? "enabled" : "disabled"}
          </span>
        </div>
      {/each}
    {:else}
      <p class="empty">No MIDI devices configured.</p>
    {/if}
  </div>

  <div class="section">
    <div class="sec-label">
      <span class="sec-dot green"></span>MAPPINGS
      <button class="save-btn" onclick={saveMappings}>SAVE</button>
    </div>
    {#if $midiMappings.length > 0}
      <div class="mapping-list">
        {#each $midiMappings as m (m.id)}
          <div class="mapping-row" class:learned={m.source === "learned"}>
            <span class="midi-src">{fmtMidiKey(m)}</span>
            <span class="arrow">&rarr;</span>
            <span class="midi-target">{fmtTarget(m)}</span>
            <span class="source-tag">{m.source}</span>
            {#if m.source === "learned"}
              <button class="del-btn" onclick={() => deleteMapping(m.id)}>&times;</button>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty">No mappings defined.</p>
    {/if}
  </div>

  {#if $midiLearnState}
    <div class="section learn-active">
      <div class="sec-label"><span class="sec-dot amber pulse"></span>MIDI LEARN</div>
      <p class="learn-msg">
        {#if $midiLearnState.targetType === "modulator"}
          Waiting for MIDI input &rarr; <strong>Mod {$midiLearnState.modulatorId} : {$midiLearnState.modulatorField}</strong>
        {:else}
          Waiting for MIDI input &rarr; <strong>{$midiLearnState.paramName}</strong> (slot {$midiLearnState.slot})
        {/if}
      </p>
      <button class="cancel-btn" onclick={cancelLearn}>CANCEL</button>
    </div>
  {/if}

  {#if $midiActivity}
    <div class="section">
      <div class="sec-label"><span class="sec-dot dim"></span>LAST ACTIVITY</div>
      <div class="activity">
        {$midiActivity.msgType}
        ch:{$midiActivity.channel}
        d1:{$midiActivity.data1}
        d2:{$midiActivity.data2}
      </div>
    </div>
  {/if}
</div>

<style>
  .midi-panel {
    padding: 8px 14px 14px;
    overflow-y: auto;
    flex: 1;
  }

  .section { margin-bottom: 16px; }

  .sec-label {
    display: flex; align-items: center; gap: 6px;
    font-family: ui-monospace, monospace; font-size: 9px;
    letter-spacing: .2em; color: #888; text-transform: uppercase;
    padding: 10px 0 6px;
  }
  .sec-dot {
    width: 6px; height: 6px; display: inline-block;
  }
  .sec-dot.green { background: #5a9a6a; }
  .sec-dot.blue { background: #5a7aaa; }
  .sec-dot.amber { background: #c9a24a; }
  .sec-dot.dim { background: #555; }
  .sec-dot.pulse { animation: pulse 1s infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .device-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 4px 8px; font-size: 11px;
    border-bottom: 1px dashed rgba(106,104,96,.2);
  }
  .device-name { color: #ccc; font-family: ui-monospace, monospace; }
  .device-status { font-size: 9px; color: #666; }
  .device-status.on { color: #5a9a6a; }

  .mapping-list { display: flex; flex-direction: column; }
  .mapping-row {
    display: flex; align-items: center; gap: 8px;
    padding: 3px 8px; font-size: 10px;
    border-bottom: 1px dashed rgba(106,104,96,.2);
    font-family: ui-monospace, monospace;
  }
  .mapping-row.learned { background: rgba(90, 154, 106, 0.05); }
  .midi-src { color: #8ac; width: 5rem; flex-shrink: 0; }
  .arrow { color: #555; }
  .midi-target { color: #ccc; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .source-tag {
    font-size: 8px; color: #666; padding: 1px 4px;
    border: 1px solid #444; border-radius: 3px;
  }
  .del-btn {
    background: none; border: 1px solid #633; color: #a55;
    font-size: 12px; cursor: pointer; padding: 0 4px;
    line-height: 1;
  }
  .del-btn:hover { background: #411; color: #f88; }

  .save-btn {
    margin-left: auto;
    background: none; border: 1px solid #5a9a6a; color: #5a9a6a;
    font-family: ui-monospace, monospace; font-size: 8px;
    letter-spacing: .1em; padding: 2px 8px; cursor: pointer;
  }
  .save-btn:hover { background: rgba(90,154,106,.15); }

  .learn-active {
    background: rgba(201, 162, 74, 0.08);
    padding: 8px; border: 1px dashed #c9a24a;
  }
  .learn-msg { color: #c9a24a; font-size: 11px; margin: 4px 0; }
  .cancel-btn {
    background: none; border: 1px solid #a55; color: #a55;
    font-family: ui-monospace, monospace; font-size: 8px;
    letter-spacing: .1em; padding: 2px 8px; cursor: pointer;
  }
  .cancel-btn:hover { background: rgba(170,85,85,.15); }

  .activity {
    font-family: ui-monospace, monospace; font-size: 10px;
    color: #777; padding: 4px 8px;
  }

  .empty { color: #555; font-size: 11px; text-align: center; padding: 0.5rem 0; }
</style>
