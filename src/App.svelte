<script>
  import { onMount } from "svelte";
  import { connect, connected, request, on } from "./lib/transport.js";
  import {
    slots, selectedSlot, schema, modulators, lfoShapes, easingNames,
    sequencer, sceneSequencer, availablePatches, slotShaders, savestateList,
    liveValues, liveShaderValues, beatPhase, seqSteps, tempoDivisions,
    modulatorDefaults, modulatorConstraints,
  } from "./lib/stores.js";
  import AppHeader from "./components/AppHeader.svelte";
  import SlotSelector from "./components/SlotSelector.svelte";
  import Sidebar from "./components/Sidebar.svelte";
  import ParameterListWithMods from "./components/ParameterListWithMods.svelte";
  import ShaderParamsInline from "./components/ShaderParamsInline.svelte";
  import SequencerPanel from "./components/SequencerPanel.svelte";
  import SceneSequencerPanel from "./components/SceneSequencerPanel.svelte";
  import UnassignedMods from "./components/UnassignedMods.svelte";

  let activeTab = "params";

  let projectBpm = 120;
  let fetchInFlight = false;

  function applyModList(msg) {
    modulators.set(msg.modulators || []);
    if (msg.shapes) lfoShapes.set(msg.shapes);
    if (msg.easingNames) easingNames.set(msg.easingNames);
    if (msg.typeDefaults) modulatorDefaults.set(msg.typeDefaults);
    if (msg.typeConstraints) modulatorConstraints.set(msg.typeConstraints);
  }

  async function fetchAll() {
    if (fetchInFlight) return;
    fetchInFlight = true;
    try {
      const [slotsRes, modsRes, seqRes, sceneSeqRes, patchesRes] = await Promise.all([
        request({ type: "listSlots" }),
        request({ type: "listModulators" }),
        request({ type: "getSequencer" }),
        request({ type: "getSceneSequencer" }),
        request({ type: "listAvailablePatches" }),
      ]);
      slots.set(slotsRes.slots || []);
      if (slotsRes.selected) selectedSlot.set(slotsRes.selected);
      applyModList(modsRes);
      sequencer.set(seqRes);
      sceneSequencer.set(sceneSeqRes);
      if (seqRes.bpm) projectBpm = Math.round(seqRes.bpm);
      availablePatches.set(patchesRes.patches || []);

      await fetchSlotData($selectedSlot);
    } catch (e) {
      console.error("fetchAll failed:", e);
    } finally {
      fetchInFlight = false;
    }
  }

  async function fetchSlotData(slot) {
    try {
      const [schemaRes, shadersRes, ssRes] = await Promise.all([
        request({ type: "getSchema", slot }),
        request({ type: "getSlotShaders", slot }),
        request({ type: "listSavestates", slot }),
      ]);
      schema.set(schemaRes);
      slotShaders.set(shadersRes);
      savestateList.set({
        currentPatch: ssRes.currentPatch || [],
        otherPatches: ssRes.otherPatches || [],
      });
    } catch (e) {
      console.error("fetchSlotData failed:", e);
    }
  }

  on("welcome", (msg) => {
    if (msg.bpm) projectBpm = Math.round(msg.bpm);
    fetchAll();
  });

  let prevSlot = 1;
  selectedSlot.subscribe((s) => {
    if (s !== prevSlot) {
      prevSlot = s;
      liveValues.set({});
      liveShaderValues.set({});
      if ($connected) fetchSlotData(s);
    }
  });

  on("paramChanged", (msg) => {
    if (msg.source === "shader") {
      if (msg.slot === $selectedSlot) {
        liveShaderValues.update((lv) => ({ ...lv, [msg.name]: msg.value }));
      }
      slotShaders.update((s) => {
        if (!s) return s;
        const p = s.shaderParams.find((x) => x.name === msg.name);
        if (p && !p.modulated) p.value = msg.value;
        return { ...s, shaderParams: [...s.shaderParams] };
      });
    } else {
      if (msg.slot === $selectedSlot) {
        liveValues.update((lv) => ({ ...lv, [msg.name]: msg.value }));
      }
      schema.update((s) => {
        if (!s || s.slot !== msg.slot) return s;
        const p = s.params.find((x) => x.name === msg.name);
        if (p && !p.modulated) p.value = msg.value;
        return { ...s, params: [...s.params] };
      });
    }
  });

  on("modulatorList", (msg) => {
    applyModList(msg);

    const mods = msg.modulators || [];
    const paramModSet = new Set(
      mods.filter((m) => (m.target.resource || "parameters") === "parameters")
           .map((m) => m.target.slot + ":" + m.target.param)
    );
    const shaderModSet = new Set(
      mods.filter((m) => m.target.resource === "shaderext")
           .map((m) => m.target.param)
    );

    schema.update((s) => {
      if (!s) return s;
      return {
        ...s,
        params: s.params.map((p) => ({
          ...p,
          modulated: paramModSet.has(s.slot + ":" + p.name),
        })),
      };
    });
    slotShaders.update((s) => {
      if (!s || !s.shaderParams) return s;
      return {
        ...s,
        shaderParams: s.shaderParams.map((p) => ({
          ...p,
          modulated: shaderModSet.has(p.name),
        })),
      };
    });
  });

  on("sequencerState", (msg) => {
    sequencer.set(msg);
    if (msg.bpm) projectBpm = Math.round(msg.bpm);
    if (msg.tempoDivisions) tempoDivisions.set(msg.tempoDivisions);
  });

  on("sceneSequencerState", (msg) => {
    sceneSequencer.set(msg);
  });

  on("bpmChanged", (msg) => {
    if (msg.bpm) projectBpm = Math.round(msg.bpm);
  });

  on("clockTick", (msg) => {
    beatPhase.set(msg.beatPhase);
    if (msg.bpm) projectBpm = Math.round(msg.bpm);
    if (msg.seqSteps) seqSteps.set(msg.seqSteps);
  });

  on("patchLoaded", async () => {
    liveValues.set({});
    if (!$connected) return;
    const [modsRes, seqRes, sceneSeqRes] = await Promise.all([
      request({ type: "listModulators" }),
      request({ type: "getSequencer" }),
      request({ type: "getSceneSequencer" }),
      request({ type: "listSlots" }).then((r) => slots.set(r.slots || [])),
    ]);
    applyModList(modsRes);
    sequencer.set(seqRes);
    sceneSequencer.set(sceneSeqRes);
    await fetchSlotData($selectedSlot);
  });

  on("savestateLoaded", async () => {
    if (!$connected) return;
    const [modsRes, seqRes, sceneSeqRes] = await Promise.all([
      request({ type: "listModulators" }),
      request({ type: "getSequencer" }),
      request({ type: "getSceneSequencer" }),
    ]);
    applyModList(modsRes);
    sequencer.set(seqRes);
    sceneSequencer.set(sceneSeqRes);
    if (seqRes.bpm) projectBpm = Math.round(seqRes.bpm);
    await fetchSlotData($selectedSlot);
  });

  on("savestateSaved", () => {
    if ($connected) {
      request({ type: "listSavestates", slot: $selectedSlot })
        .then((r) => savestateList.set({
          currentPatch: r.currentPatch || [],
          otherPatches: r.otherPatches || [],
        }));
    }
  });

  onMount(() => { connect(); });
</script>

<div class="app-shell">
  <AppHeader bpm={projectBpm} />

  <div class="slot-strip">
    <SlotSelector />
  </div>

  <div class="body">
    <Sidebar />

    <div class="center">
      <div class="tab-bar">
        <button class="tab" class:active={activeTab === "params"}
          onclick={() => activeTab = "params"}>PARAMS</button>
        <button class="tab" class:active={activeTab === "sequencer"}
          onclick={() => activeTab = "sequencer"}>
          SEQUENCER
          {#if $sequencer && $sequencer.playing}<span class="tab-st green">● PLAYING</span>{/if}
        </button>
        <button class="tab" class:active={activeTab === "scenes"}
          onclick={() => activeTab = "scenes"}>
          SCENES
          {#if $sceneSequencer && $sceneSequencer.channels && $sceneSequencer.channels.length}
            <span class="tab-st amber">● {$sceneSequencer.channels.length}ch</span>
          {/if}
        </button>
      </div>

      {#if activeTab === "params"}
        <div class="main-scroll">
          <div class="sec-label"><span class="sec-dot green"></span>PARAMETERS</div>
          <ParameterListWithMods />

          <div class="sec-label shader-label"><span class="sec-dot cyan"></span>SHADER PARAMETERS</div>
          <ShaderParamsInline />

          <UnassignedMods />
        </div>
      {:else if activeTab === "sequencer"}
        <div class="tab-fill">
          <SequencerPanel />
        </div>
      {:else if activeTab === "scenes"}
        <div class="tab-fill">
          <SceneSequencerPanel />
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    background: #1a1a1e;
    color: #ddd;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  }
  :global(*, *::before, *::after) { box-sizing: border-box; }

  .app-shell {
    display: grid;
    grid-template-rows: 46px auto 1fr;
    height: 100vh;
    overflow: hidden;
  }

  .slot-strip {
    background: #222227;
    border-bottom: 1px solid #333;
    padding: 4px 14px;
    display: flex; align-items: center;
  }

  .body {
    display: flex;
    overflow: hidden;
  }

  .center {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .tab-bar {
    display: flex; align-items: center; gap: 4px;
    padding: 0 8px; height: 32px; flex-shrink: 0;
    background: #222227; border-bottom: 1px solid #333;
  }
  .tab {
    font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .15em;
    color: #888; padding: 4px 10px;
    border: 1px solid #444; border-bottom: none;
    background: #1a1a1e; cursor: pointer; margin-bottom: -1px;
  }
  .tab.active { color: #ddd; background: #2a2a30; }
  .tab:hover { color: #bbb; }
  .tab-st { font-size: 9px; margin-left: 4px; }
  .tab-st.green { color: #5a9a6a; }
  .tab-st.amber { color: #c9a24a; }

  .main-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 8px 14px 14px;
  }

  .tab-fill {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .sec-label {
    display: flex; align-items: center; gap: 6px;
    font-family: ui-monospace, monospace; font-size: 9px;
    letter-spacing: .2em; color: #888; text-transform: uppercase;
    padding: 10px 0 6px;
  }
  .sec-label.shader-label { margin-top: 12px; }
  .sec-dot {
    width: 6px; height: 6px; display: inline-block;
  }
  .sec-dot.green { background: #5a9a6a; }
  .sec-dot.cyan { background: #6a9aaa; }
</style>
