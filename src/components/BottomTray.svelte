<script>
  import { sequencer, sceneSequencer } from "../lib/stores.js";
  import SequencerPanel from "./SequencerPanel.svelte";
  import SceneSequencerPanel from "./SceneSequencerPanel.svelte";

  let open = false;
  let activeTab = "sequencer";

  $: seqPlaying = $sequencer && $sequencer.playing;
  $: sceneCount = ($sceneSequencer && $sceneSequencer.channels)
    ? $sceneSequencer.channels.length : 0;

  function toggleTray() { open = !open; }
  function selectTab(tab) { activeTab = tab; open = true; }
</script>

<div class="tray" class:open>
  <div class="tray-tabs">
    <button class="tray-tab" class:active={activeTab === "sequencer"}
      onclick={() => selectTab("sequencer")}>
      SEQUENCER
      {#if seqPlaying}<span class="st playing">● PLAYING</span>{/if}
    </button>
    <button class="tray-tab" class:active={activeTab === "scenes"}
      onclick={() => selectTab("scenes")}>
      SCENES
      {#if sceneCount > 0}<span class="st scenes">● {sceneCount}ch</span>{/if}
    </button>
    <button class="tray-chev" onclick={toggleTray}>{open ? "▾ HIDE" : "▴ SHOW"}</button>
  </div>

  {#if open}
    <div class="tray-body">
      {#if activeTab === "sequencer"}
        <SequencerPanel />
      {:else}
        <SceneSequencerPanel />
      {/if}
    </div>
  {/if}
</div>

<style>
  .tray {
    background: #222227;
    border-top: 1px solid #333;
    height: 32px;
    transition: height 80ms ease-out;
    overflow: hidden;
    flex-shrink: 0;
  }
  .tray.open { height: 280px; }
  .tray-tabs {
    height: 32px; display: flex; align-items: center;
    padding: 0 8px; gap: 4px;
    border-bottom: 1px solid #333;
  }
  .tray-tab {
    font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: .15em;
    color: #888; padding: 4px 10px;
    border: 1px solid #444; border-bottom: none;
    background: #1a1a1e; cursor: pointer;
  }
  .tray-tab.active { color: #ddd; background: #2a2a30; }
  .tray-tab:hover { color: #bbb; }
  .st {
    font-size: 9px; margin-left: 4px;
  }
  .st.playing { color: #5a9a6a; }
  .st.scenes { color: #c9a24a; }
  .tray-chev {
    margin-left: auto; font-family: ui-monospace, monospace; font-size: 10px;
    color: #888; padding: 2px 8px; border: 1px dashed #555;
    background: transparent; cursor: pointer;
  }
  .tray-chev:hover { color: #ddd; }
  .tray-body {
    height: calc(100% - 32px);
    overflow: auto;
    padding: 8px;
  }
</style>
