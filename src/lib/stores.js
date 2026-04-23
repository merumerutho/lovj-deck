/**
 * stores.js — shared reactive state for LOVJ Deck.
 */

import { writable, derived } from "svelte/store";

/** Array of {index, name} — one per patch slot. */
export const slots = writable([]);

/** Currently selected slot index (1-based, matching LOVJ). */
export const selectedSlot = writable(1);

/** Schema for the selected slot: {slot, patchName, params:[...]} or null. */
export const schema = writable(null);

/** Patch name for the selected slot (derived). */
export const patchName = derived(schema, ($s) => ($s && $s.patchName) || "—");

/** Active modulators. */
export const modulators = writable([]);

/** Available LFO shapes. */
export const lfoShapes = writable([]);

/** Available easing curve names for modulator waveshaping. */
export const easingNames = writable(["linear"]);

/** Global sequencer state. */
export const sequencer = writable(null);

/** Available patches from cfg_patches. */
export const availablePatches = writable([]);

/** Slot shader info: {available, layers, shaderParams, enabled}. */
export const slotShaders = writable(null);

/** Savestates: { currentPatch: [id, ...], otherPatches: [{patchName, savestates: [id, ...]}] }. */
export const savestateList = writable({ currentPatch: [], otherPatches: [] });

/** Global scene sequencer state. */
export const sceneSequencer = writable(null);

/** Live parameter values from paramChanged broadcasts (modulated values). Map of "name" → value. */
export const liveValues = writable({});

/** Live shader parameter values from paramChanged broadcasts. Map of "name" → value. */
export const liveShaderValues = writable({});

/** Clock beat phase (0..4), updated at ~30Hz from backend clockTick messages. */
export const beatPhase = writable(0);

/** Live sequencer step positions: { channelName: stepNumber (1-based) }. Updated at ~30Hz. */
export const seqSteps = writable({});

/** Musical tempo divisions from the backend: [{label, beats}, ...]. */
export const tempoDivisions = writable([]);

/** Default creation configs per modulator type from backend: { lfo: {...}, envelope: {...} }. */
export const modulatorDefaults = writable({});

/** Per-field range constraints per modulator type from backend: { lfo: {...}, envelope: {...} }. */
export const modulatorConstraints = writable({});
