<script>
  import { tick } from "svelte";
  import { sequencer, schema, selectedSlot, easingNames, seqSteps, slotShaders, tempoDivisions } from "../lib/stores.js";
  import { send } from "../lib/transport.js";
  import { anchorPoint, clampToViewport } from "../lib/ctxPosition.js";

  $: DIVIDER_OPTIONS = $tempoDivisions
    .filter((d) => d.beats <= 4)
    .map((d) => ({ label: d.label, value: 1 / d.beats }))
    .sort((a, b) => a.value - b.value);

  $: patchParams = ($schema && $schema.params || []).map((p) => ({ name: p.name, resource: "parameters", min: p.min, max: p.max }));
  $: shaderParams = ($slotShaders && $slotShaders.shaderParams || []).map((p) => ({ name: p.name, resource: "shaderext", min: p.min ?? 0, max: p.max ?? 1 }));
  $: allParams = [...patchParams, ...shaderParams];
  $: channels = ($sequencer && $sequencer.channels) || [];
  $: playing = ($sequencer && $sequencer.playing) || false;

  let newChParam = "";
  let newChSteps = 16;
  let newChDivider = 4;

  let activeCh = 0;

  let ctxMenu = null;
  let ctxPos = { x: 0, y: 0 };
  let ctxMenuEl;

  function play()  { send({ type: "sequencerPlay" }); }
  function stop()  { send({ type: "sequencerStop" }); }

  function addChannel() {
    const name = newChParam || (allParams[0] && allParams[0].name);
    if (!name) return;
    const entry = allParams.find((p) => p.name === name);
    const resource = (entry && entry.resource) || "parameters";
    send({
      type: "sequencerAddChannel",
      name,
      target: { slot: $selectedSlot, param: name, resource, steps: newChSteps, divider: newChDivider },
    });
    newChParam = "";
  }

  function removeChannel(name) {
    dismissCtx();
    send({ type: "sequencerRemoveChannel", name });
  }

  function updateChannel(name, field, value) {
    const msg = { type: "sequencerUpdateChannel", name };
    msg[field] = Number(value);
    send(msg);
  }

  function hasValue(step) {
    if (!step) return false;
    return step.value !== false && step.value != null;
  }

  function getParamMeta(chName) {
    const p = allParams.find((x) => x.name === chName);
    return p ? { min: p.min ?? 0, max: p.max ?? 1 } : { min: 0, max: 1 };
  }

  function normalize(val, min, max) {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  function denormalize(norm, min, max) {
    return min + (max - min) * Math.max(0, Math.min(1, norm));
  }

  function fmtVal(val, min, max) {
    const abs = Math.abs(val);
    const range = Math.abs(max - min);
    if (range >= 100) return val.toFixed(0);
    if (range >= 10) return val.toFixed(1);
    return val.toFixed(2);
  }

  function setStepValue(chName, stepIdx, val) {
    const ch = channels.find((c) => c.name === chName);
    if (!ch) return;
    const stepData = ch.steps[stepIdx - 1];
    const msg = { type: "sequencerPlock", step: stepIdx, channel: chName, value: Number(val) };
    if (stepData && stepData.morphDuration) {
      msg.morphDuration = stepData.morphDuration;
      msg.morphMode = stepData.morphMode || "beats";
      msg.morphEasing = stepData.morphEasing || "smoothstep";
    }
    send(msg);
  }

  function setStepEasing(chName, stepIdx, easingName) {
    const ch = channels.find((c) => c.name === chName);
    if (!ch) return;
    const stepData = ch.steps[stepIdx - 1];
    if (!stepData || !hasValue(stepData)) return;
    const dur = (ctxMenu && ctxMenu.morphDuration != null) ? ctxMenu.morphDuration : (stepData.morphDuration || 100);
    send({
      type: "sequencerPlock",
      step: stepIdx,
      channel: chName,
      value: stepData.value,
      morphDuration: dur,
      morphMode: "time",
      morphEasing: easingName,
    });
  }

  function clearStep(chName, stepIdx) {
    send({ type: "sequencerPlock", step: stepIdx, channel: chName, value: null });
    dismissCtx();
  }

  function toggleStep(chName, stepIdx) {
    const ch = channels.find((c) => c.name === chName);
    if (!ch) return;
    const stepData = ch.steps[stepIdx - 1];
    if (hasValue(stepData)) {
      clearStep(chName, stepIdx);
    } else {
      const meta = getParamMeta(chName);
      const val = (meta.min + meta.max) / 2;
      send({ type: "sequencerPlock", step: stepIdx, channel: chName, value: val });
    }
  }

  function onStepClick(chName, stepIdx) {
    toggleStep(chName, stepIdx);
  }

  function onStepDrag(e, chName, stepIdx, ch) {
    if (e.button !== 0) return;
    const meta = getParamMeta(chName);
    const stepData = ch.steps[stepIdx - 1];
    const startY = e.clientY;
    const startNorm = hasValue(stepData) ? normalize(stepData.value, meta.min, meta.max) : 0.5;
    let moved = false;

    function onMove(em) {
      const dy = startY - em.clientY;
      if (!moved && Math.abs(dy) < 4) return;
      moved = true;
      const norm = Math.max(0, Math.min(1, startNorm + dy / 150));
      const val = denormalize(norm, meta.min, meta.max);
      setStepValue(chName, stepIdx, val);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!moved) onStepClick(chName, stepIdx);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  async function showStepCtx(e, chName, stepIdx, ch) {
    e.preventDefault();
    const meta = getParamMeta(chName);
    const stepData = ch.steps[stepIdx - 1];
    const val = hasValue(stepData) ? stepData.value : denormalize(0.5, meta.min, meta.max);
    const easing = (stepData && stepData.morphEasing) || "smoothstep";
    const morphDuration = (stepData && stepData.morphDuration) || 0;
    // Note: morphDuration is stored in the unit of morphMode (ms for "time", beats for "beats")
    ctxMenu = { chName, stepIdx, meta, val, easing, morphDuration, locked: hasValue(stepData) };
    ctxPos = anchorPoint(e);
    await tick();
    clampToViewport(ctxMenuEl, ctxPos);
  }

  function dismissCtx() { ctxMenu = null; }

  function ctxApplyValue() {
    if (!ctxMenu) return;
    const inp = document.getElementById("ctx-val-input");
    if (!inp) return;
    const n = parseFloat(inp.value);
    if (isNaN(n)) return;
    const clamped = Math.max(ctxMenu.meta.min, Math.min(ctxMenu.meta.max, n));
    ctxMenu = { ...ctxMenu, val: clamped };
    setStepValue(ctxMenu.chName, ctxMenu.stepIdx, clamped);
  }

  function ctxSelectEasing(name) {
    if (!ctxMenu) return;
    const dur = ctxMenu.morphDuration || 100;
    if (!ctxMenu.locked) {
      const val = denormalize(0.5, ctxMenu.meta.min, ctxMenu.meta.max);
      send({
        type: "sequencerPlock", step: ctxMenu.stepIdx, channel: ctxMenu.chName,
        value: val, morphDuration: dur, morphMode: "time", morphEasing: name,
      });
    } else {
      setStepEasing(ctxMenu.chName, ctxMenu.stepIdx, name);
    }
    ctxMenu = { ...ctxMenu, easing: name };
  }

  function ctxApplyDuration() {
    if (!ctxMenu) return;
    const inp = document.getElementById("ctx-dur-input");
    if (!inp) return;
    const dur = Math.max(0, parseFloat(inp.value) || 0);
    ctxMenu = { ...ctxMenu, morphDuration: dur };
    if (!ctxMenu.locked) return;
    const ch = channels.find((c) => c.name === ctxMenu.chName);
    if (!ch) return;
    const stepData = ch.steps[ctxMenu.stepIdx - 1];
    send({
      type: "sequencerPlock",
      step: ctxMenu.stepIdx,
      channel: ctxMenu.chName,
      value: stepData.value,
      morphDuration: dur,
      morphMode: "time",
      morphEasing: stepData.morphEasing || "smoothstep",
    });
  }

  const EASING_PATHS = {
    linear:       "M0 16 L44 0",
    step:         "M0 16 L22 16 L22 0 L44 0",
    smoothstep:   "M0 16 C 12 16, 32 0, 44 0",
    smootherstep: "M0 16 C 8 16, 36 0, 44 0",
    sineIn:       "M0 16 C 20 16, 30 8, 44 0",
    sineOut:      "M0 16 C 14 8, 24 0, 44 0",
    sineInOut:    "M0 16 C 16 16, 28 0, 44 0",
    quadIn:       "M0 16 Q 30 16, 44 0",
    quadOut:      "M0 16 Q 14 0, 44 0",
    quadInOut:    "M0 16 C 18 16, 26 0, 44 0",
    cubicIn:      "M0 16 C 32 16, 36 4, 44 0",
    cubicOut:     "M0 16 C 8 12, 12 0, 44 0",
    cubicInOut:   "M0 16 C 20 16, 24 0, 44 0",
    expoIn:       "M0 16 C 35 16, 40 4, 44 0",
    expoOut:      "M0 16 C 4 12, 9 0, 44 0",
    expoInOut:    "M0 16 C 22 16, 22 0, 44 0",
    backIn:       "M0 16 C 14 18, 34 8, 44 0",
    backOut:      "M0 16 C 10 -2, 30 -2, 44 0",
    backInOut:    "M0 16 C 10 18, 34 -2, 44 0",
    bounceIn:     "M0 16 C 4 14, 8 12, 12 14 S 20 10, 24 12 S 34 0, 44 0",
    bounceOut:    "M0 16 C 10 16, 20 4, 24 4 S 32 2, 36 2 S 40 0, 44 0",
    bounceInOut:  "M0 16 C 6 14, 12 16, 16 12 S 22 4, 28 4 S 38 0, 44 0",
    elasticIn:    "M0 16 C 16 16, 22 18, 28 14 S 36 -2, 44 0",
    elasticOut:   "M0 16 C 8 18, 16 -2, 22 2 S 28 0, 44 0",
    elasticInOut: "M0 16 C 10 16, 14 18, 18 14 S 26 -2, 30 2 S 38 0, 44 0",
  };

  function easingPath(name) {
    return EASING_PATHS[name] || EASING_PATHS.linear;
  }

  function easingAbbr(name) {
    if (!name || name === "linear") return "LIN";
    const map = {
      step: "STP", smoothstep: "SMS", smootherstep: "SMR",
      sineIn: "SIN", sineOut: "SOT", sineInOut: "SIO",
      quadIn: "QIN", quadOut: "QOT", quadInOut: "QIO",
      cubicIn: "CIN", cubicOut: "COT", cubicInOut: "CIO",
      expoIn: "EIN", expoOut: "EOT", expoInOut: "EIO",
      backIn: "BIN", backOut: "BOT", backInOut: "BIO",
      bounceIn: "BNI", bounceOut: "BNO", bounceInOut: "BNN",
      elasticIn: "ELI", elasticOut: "ELO", elasticInOut: "ELL",
      quartIn: "4IN", quartOut: "4OT", quartInOut: "4IO",
    };
    return map[name] || name.slice(0, 3).toUpperCase();
  }

  function dividerLabel(val) {
    const d = DIVIDER_OPTIONS.find((o) => Math.abs(o.value - val) < 1e-6);
    return d ? d.label : String(val);
  }

  function resync() { send({ type: "resyncPhases" }); }
</script>

<svelte:document onclick={(e) => { if (ctxMenu && !e.target.closest(".ctx-menu")) dismissCtx(); }}
  onkeydown={(e) => { if (e.key === "Escape") dismissCtx(); }} />

<div class="seq-panel">
  <div class="seq-toolbar">
    <button class="tbtn" class:active={playing} onclick={playing ? stop : play}>
      {playing ? "STOP" : "PLAY"}
    </button>
    <button class="tbtn" onclick={resync}>RESYNC</button>
  </div>

  <div class="seq-body">
    <div class="ch-list">
      <div class="ch-list-hdr">CHANNELS</div>
      {#each channels as ch, idx (ch.name)}
        {@const meta = getParamMeta(ch.name)}
        <button class="ch-item" class:active={idx === activeCh}
          onclick={() => { activeCh = idx; }}>
          <span class="ch-n">CH{idx + 1}</span>
          <span class="ch-target">
            {ch.name}
            <span class="ch-sub">S{ch.target?.slot || $selectedSlot} · {meta.min}–{meta.max}</span>
          </span>
          <span class="ch-steps">{ch.numSteps}st</span>
        </button>
      {/each}
      <div class="add-ch-row">
        <select bind:value={newChParam} class="add-ch-select">
          <option value="" disabled selected>parameter…</option>
          {#if patchParams.length}
            <optgroup label="Parameters">
              {#each patchParams as p}
                <option value={p.name}>{p.name}</option>
              {/each}
            </optgroup>
          {/if}
          {#if shaderParams.length}
            <optgroup label="Shader">
              {#each shaderParams as p}
                <option value={p.name}>{p.name}</option>
              {/each}
            </optgroup>
          {/if}
        </select>
        <div class="add-ch-opts">
          <select bind:value={newChDivider} class="add-ch-ctl">
            {#each DIVIDER_OPTIONS as d}
              <option value={d.value}>{d.label}</option>
            {/each}
          </select>
          <input type="number" min="1" max="64" step="1" bind:value={newChSteps} class="add-ch-ctl add-ch-num" />
        </div>
        <button class="add-ch-btn" onclick={addChannel}>+ ADD CHANNEL</button>
      </div>
    </div>

      {#if channels[activeCh]}
        {@const ch = channels[activeCh]}
        {@const meta = getParamMeta(ch.name)}
        <div class="seq-stage">
          <div class="stage-hdr">
            <span class="tgt">&#8594; <b>{ch.name}</b></span>
            <span class="range">MIN <b>{meta.min}</b> · MAX <b>{meta.max}</b></span>
            <label class="len-input">
              LEN
              <input type="number" min="1" max="64" step="1" value={ch.numSteps}
                onchange={(e) => updateChannel(ch.name, "steps", Math.max(1, Math.min(64, Math.round(Number(e.target.value)))))} />
            </label>
            <span class="div-label">RATE {dividerLabel(ch.divider)}</span>
            <label class="phase-input">
              PHASE
              <input type="range" min="0" max="1" step="0.01" value={ch.phase || 0}
                oninput={(e) => updateChannel(ch.name, "phase", e.target.value)} />
              <span class="phase-val">{((ch.phase || 0) * 100).toFixed(0)}%</span>
            </label>
            {#if playing}
              <span class="play-status">
                <span class="play-dot"></span>
                step {String($seqSteps[ch.name] || ch.currentStep || 1).padStart(2, "0")}/{ch.numSteps}
              </span>
            {/if}
            <button class="ch-del-btn" onclick={() => removeChannel(ch.name)}>&#10005;</button>
          </div>

          <div class="grid-wrap">
            <div class="beat-ruler" style="grid-template-columns: repeat({ch.numSteps}, 1fr);">
              {#each Array(ch.numSteps) as _, i}
                {@const beat = Math.floor(i / 4) + 1}
                {@const sub = (i % 4) + 1}
                <span class:beat1={sub === 1}>{sub === 1 ? beat : "·"}</span>
              {/each}
            </div>

            <div class="fader-row">
              <div class="y-axis">
                <span>{meta.max}</span>
                <span>{((meta.min + meta.max) / 2).toFixed(1)}</span>
                <span>{meta.min}</span>
              </div>
              <div class="steps-grid" style="grid-template-columns: repeat({ch.numSteps}, 1fr);">
                {#each Array(ch.numSteps) as _, i}
                  {@const stepData = ch.steps[i]}
                  {@const locked = hasValue(stepData)}
                  {@const norm = locked ? normalize(stepData.value, meta.min, meta.max) : 0}
                  {@const barH = Math.max(2, Math.round(norm * 100))}
                  {@const isHead = ($seqSteps[ch.name] || ch.currentStep) === i + 1 && playing}
                  {@const easing = (stepData && stepData.morphEasing) || "smoothstep"}
                  <div class="step" class:on={locked} class:playhead={isHead}
                    onmousedown={(e) => { if (e.button === 0) onStepDrag(e, ch.name, i + 1, ch); }}
                    oncontextmenu={(e) => showStepCtx(e, ch.name, i + 1, ch)}>
                    <div class="bar" style="height:{barH}%"></div>
                    {#if locked}
                      <div class="bar-top" style="bottom:{barH}%"></div>
                    {/if}
                    <span class="step-val">
                      {#if locked}{fmtVal(stepData.value, meta.min, meta.max)}{:else}{i + 1}{/if}
                    </span>
                    {#if locked}
                      <span class="ease-badge">{easingAbbr(easing)}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>

          <div class="seq-help">
            <span><b>CLICK</b> toggle</span>
            <span><b>DRAG &#8597;</b> set value</span>
            <span><b>RIGHT-CLICK</b> value / easing</span>
          </div>
        </div>
      {/if}
    </div>
</div>

{#if ctxMenu}
  <div class="ctx-menu" bind:this={ctxMenuEl} style="left:{ctxPos.x}px; top:{ctxPos.y}px;">
    <div class="ctx-hdr">
      STEP <b>{String(ctxMenu.stepIdx).padStart(2, "0")}</b>
      <span class="ctx-tgt">{ctxMenu.chName}</span>
    </div>
    <div class="ctx-val-row">
      <label>VAL</label>
      <input id="ctx-val-input" type="number" step="any"
        min={ctxMenu.meta.min} max={ctxMenu.meta.max}
        value={fmtVal(ctxMenu.val, ctxMenu.meta.min, ctxMenu.meta.max)}
        onchange={ctxApplyValue} onblur={ctxApplyValue} />
    </div>
    <div class="ctx-range">range {ctxMenu.meta.min} … {ctxMenu.meta.max}</div>
    <div class="ctx-divider"></div>
    <button class="ctx-item" onclick={() => { toggleStep(ctxMenu.chName, ctxMenu.stepIdx); dismissCtx(); }}>
      {ctxMenu.locked ? "Deactivate step" : "Activate step"}
    </button>
    <div class="ctx-divider"></div>
    <div class="ctx-sub">EASING</div>
    <div class="ctx-dur-row">
      <label>TIME</label>
      <input id="ctx-dur-input" type="number" min="0" max="10000" step="10"
        value={ctxMenu.morphDuration}
        onchange={ctxApplyDuration} onblur={ctxApplyDuration} />
      <span class="ctx-dur-unit">ms</span>
    </div>
    {#each $easingNames as name}
      <button class="ease-row" class:on={ctxMenu.easing === name}
        onclick={() => ctxSelectEasing(name)}>
        <span class="ease-mark"></span>
        <span class="ease-name">{name}</span>
        <svg class="ease-preview" viewBox="0 0 44 16" preserveAspectRatio="none">
          <path d={easingPath(name)} fill="none" stroke="currentColor" stroke-width="1.2" />
        </svg>
      </button>
    {/each}
    <div class="ctx-divider"></div>
    <button class="ctx-item dest" onclick={() => clearStep(ctxMenu.chName, ctxMenu.stepIdx)}>Clear step</button>
  </div>
{/if}

<style>
  .seq-panel { display: flex; flex-direction: column; height: 100%; font-family: ui-monospace, monospace; font-size: 10px; }

  .seq-toolbar {
    display: flex; align-items: center; gap: 8px; padding: 6px 8px;
    border-bottom: 1px solid #333; flex-shrink: 0;
  }
  .tbtn {
    padding: 4px 10px; background: transparent; color: #ddd;
    border: 1px solid #555; cursor: pointer; font-family: inherit; font-size: 10px; letter-spacing: .1em;
  }
  .tbtn.active { background: rgba(90,154,106,.15); border-color: #5a9a6a; color: #5a9a6a; }
  .add-ch-row {
    padding: 8px; border-top: 1px dashed rgba(106,104,96,.35);
    display: flex; flex-direction: column; gap: 6px;
  }
  .add-ch-select {
    width: 100%; padding: 4px 6px; background: #2a2a30; color: #ddd;
    border: 1px solid #444; font-family: inherit; font-size: 10px;
  }
  .add-ch-opts {
    display: flex; gap: 4px;
  }
  .add-ch-ctl {
    flex: 1; padding: 3px 4px; background: #2a2a30; color: #ddd;
    border: 1px solid #444; font-family: inherit; font-size: 9px;
  }
  .add-ch-num { width: 3rem; flex: none; }
  .add-ch-btn {
    width: 100%; padding: 8px 0; background: #2a2a30; color: #888;
    border: 1px dashed #555; cursor: pointer; font-family: inherit;
    font-size: 10px; letter-spacing: .15em; text-align: center;
  }
  .add-ch-btn:hover { color: #ddd; border-color: #888; background: #333; }

  .seq-body {
    display: grid; grid-template-columns: 180px 1fr; flex: 1; min-height: 0; overflow: hidden;
  }

  .ch-list { border-right: 1px solid #333; display: flex; flex-direction: column; overflow: hidden; }
  .ch-list-hdr {
    padding: 6px 8px; font-size: 9px; color: #888; letter-spacing: .2em;
    border-bottom: 1px solid #333;
  }
  .ch-item {
    display: grid; grid-template-columns: 28px 1fr 32px; gap: 4px; align-items: center;
    padding: 6px 8px; border: none; border-bottom: 1px dashed rgba(106,104,96,.35);
    background: transparent; color: #aaa; cursor: pointer; text-align: left;
    font-family: inherit; font-size: 10px;
  }
  .ch-item:hover { background: rgba(230,228,220,.03); }
  .ch-item.active { background: #2a2a30; }
  .ch-item.active .ch-target { color: #c9a24a; }
  .ch-n { color: #666; font-size: 9px; letter-spacing: .15em; }
  .ch-target { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .ch-sub { color: #555; font-size: 8px; letter-spacing: .1em; margin-top: 1px; }
  .ch-steps { color: #666; font-size: 9px; text-align: right; }

  .seq-stage { display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .stage-hdr {
    display: flex; align-items: center; gap: 10px; padding: 6px 10px;
    border-bottom: 1px solid #333; font-size: 10px; color: #888; flex-shrink: 0; flex-wrap: wrap;
  }
  .tgt { color: #ddd; }
  .tgt b { color: #c9a24a; }
  .range b { color: #ddd; }
  .len-input {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 9px; color: #888; letter-spacing: .1em;
  }
  .len-input input {
    width: 3rem; padding: 2px 4px; background: #2a2a30; color: #ddd;
    border: 1px solid #444; font-family: inherit; font-size: 10px; text-align: center;
  }
  .div-label { color: #666; font-size: 9px; letter-spacing: .15em; }
  .phase-input {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 9px; color: #888; letter-spacing: .1em;
  }
  .phase-input input[type="range"] { width: 60px; accent-color: #c9a24a; cursor: pointer; }
  .phase-val { color: #666; font-size: 9px; min-width: 28px; }
  .play-status { display: flex; align-items: center; gap: 4px; color: #5a9a6a; }
  .play-dot {
    width: 6px; height: 6px; background: #5a9a6a; border-radius: 50%;
    animation: pulse 600ms ease-in-out infinite alternate;
  }
  @keyframes pulse { from { opacity: 1; } to { opacity: .4; } }
  .ch-del-btn {
    margin-left: auto; background: none; border: none; color: #744;
    cursor: pointer; font-size: 11px; padding: 2px 4px; font-family: inherit;
  }
  .ch-del-btn:hover { color: #c88; }

  .grid-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 6px 10px 0; }
  .beat-ruler {
    display: grid; padding-left: 30px; margin-bottom: 2px;
    font-size: 9px; color: #555; letter-spacing: .1em; gap: 3px;
  }
  .beat-ruler span { text-align: center; }
  .beat-ruler span.beat1 { color: #aaa; font-weight: 700; }

  .fader-row { display: grid; grid-template-columns: 30px 1fr; flex: 1; min-height: 0; max-height: 240px; }
  .y-axis {
    display: flex; flex-direction: column; justify-content: space-between;
    font-size: 8px; color: #666; padding: 2px 4px 2px 0; text-align: right;
  }
  .y-axis span:first-child { color: #999; }
  .y-axis span:last-child { color: #999; }

  .steps-grid { display: grid; gap: 3px; align-items: stretch; position: relative; }

  .step {
    position: relative; border: 1px solid #444; cursor: pointer;
    overflow: hidden; user-select: none;
    display: flex; flex-direction: column; justify-content: flex-end;
    min-height: 60px;
  }
  .step:hover { border-color: #6a6860; }
  .step.on { border-color: #c9a24a; }
  .step .bar {
    position: absolute; left: 0; right: 0; bottom: 0;
    background: rgba(201,162,74,.18); pointer-events: none;
  }
  .step.on .bar { background: rgba(201,162,74,.45); }
  .step .bar-top {
    position: absolute; left: -1px; right: -1px; height: 2px;
    background: #c9a24a; pointer-events: none;
  }
  .step-val {
    position: relative; z-index: 1; text-align: center; padding: 2px;
    font-size: 9px; font-weight: 700; color: #ddd;
    text-shadow: 0 1px 2px rgba(0,0,0,.8);
  }
  .step:not(.on) .step-val { color: #555; font-weight: 400; }
  .ease-badge {
    position: absolute; top: 2px; left: 2px; z-index: 1;
    font-size: 7px; color: #c9a24a; letter-spacing: .08em;
    padding: 0 2px; border: 1px solid #c9a24a; line-height: 9px;
  }
  .step.playhead { border-color: #5a9a6a; box-shadow: 0 0 0 1px #5a9a6a, 0 0 8px rgba(90,154,106,.5); }
  .step.playhead .step-val { color: #5a9a6a; }

  .seq-help {
    padding: 4px 10px; display: flex; gap: 14px; flex-shrink: 0;
    font-size: 9px; color: #555; letter-spacing: .1em;
    border-top: 1px dashed rgba(106,104,96,.35);
  }
  .seq-help b { color: #888; font-weight: 400; }



  /* Context menu */
  .ctx-menu {
    position: fixed; z-index: 200;
    background: #1a1a1e; border: 1.5px solid #6a6860;
    font-family: ui-monospace, monospace; font-size: 10px; color: #ddd;
    min-width: 240px; padding: 4px 0;
    box-shadow: 4px 4px 0 0 rgba(0,0,0,.4), 0 0 0 4px rgba(15,15,18,.5);
  }
  .ctx-hdr {
    padding: 6px 10px 4px; font-size: 9px; letter-spacing: .2em; color: #888;
    border-bottom: 1px dashed #444; margin-bottom: 4px;
    display: flex; align-items: center; gap: 6px;
  }
  .ctx-hdr b { color: #ddd; }
  .ctx-tgt { margin-left: auto; color: #c9a24a; }
  .ctx-val-row {
    display: grid; grid-template-columns: 28px 1fr; gap: 4px; align-items: center;
    padding: 4px 10px;
  }
  .ctx-val-row label { font-size: 8px; color: #666; letter-spacing: .2em; }
  .ctx-val-row input {
    font-family: inherit; font-size: 11px; color: #ddd;
    background: #2a2a30; border: 1px solid #444; padding: 3px 5px; width: 100%;
  }
  .ctx-val-row input:focus { outline: none; border-color: #c9a24a; }
  .ctx-range { padding: 0 10px 4px 42px; font-size: 8px; color: #555; letter-spacing: .1em; }
  .ctx-dur-row {
    display: grid; grid-template-columns: 32px 1fr auto; gap: 4px; align-items: center;
    padding: 4px 10px;
  }
  .ctx-dur-row label { font-size: 8px; color: #666; letter-spacing: .2em; }
  .ctx-dur-row input {
    font-family: inherit; font-size: 11px; color: #ddd;
    background: #2a2a30; border: 1px solid #444; padding: 3px 5px; width: 100%;
  }
  .ctx-dur-row input:focus { outline: none; border-color: #c9a24a; }
  .ctx-dur-unit { font-size: 8px; color: #666; letter-spacing: .1em; }
  .ctx-divider { height: 1px; background: #444; opacity: .5; margin: 4px 0; }
  .ctx-item {
    display: block; width: 100%; text-align: left;
    padding: 5px 10px; cursor: pointer; background: none; border: none;
    font-family: inherit; font-size: 10px; color: #ddd;
  }
  .ctx-item:hover { background: #2a2a30; color: #c9a24a; }
  .ctx-item.dest:hover { background: rgba(192,96,96,.2); color: #c06060; }
  .ctx-sub { padding: 6px 10px 2px; font-size: 8px; letter-spacing: .2em; color: #555; }

  .ease-row {
    display: grid; grid-template-columns: 12px 1fr 48px; gap: 6px; align-items: center;
    padding: 3px 10px; cursor: pointer; border: none; border-left: 2px solid transparent;
    background: none; font-family: inherit; font-size: 10px; color: #ddd; width: 100%; text-align: left;
  }
  .ease-row:hover { background: #2a2a30; }
  .ease-row.on { border-left-color: #c9a24a; background: rgba(201,162,74,.08); }
  .ease-mark {
    width: 8px; height: 8px; border: 1px solid #666; display: inline-block;
  }
  .ease-row.on .ease-mark { background: #c9a24a; border-color: #c9a24a; }
  .ease-name { font-size: 9px; }
  .ease-row.on .ease-name { color: #c9a24a; }
  .ease-preview { width: 48px; height: 14px; display: block; color: #888; }
  .ease-row.on .ease-preview { color: #c9a24a; }
</style>
