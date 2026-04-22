/**
 * transport.js — WebSocket client for LOVJ Deck.
 */

import { writable } from "svelte/store";

export const connected = writable(false);

let ws = null;
let nextId = 1;
let reconnectTimer = null;
const pending = new Map();
const listeners = new Map();

const WS_URL = `ws://${location.hostname}:8765`;
const RECONNECT_MS = 2000;
const REQUEST_TIMEOUT_MS = 5000;

export function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

export function request(obj) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    obj.id = id;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("request timeout"));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    send(obj);
  });
}

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(fn);
  return () => listeners.get(type).delete(fn);
}

function teardown() {
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onopen = null;
    ws.onclose = null;
    ws.onerror = null;
    ws.onmessage = null;
    ws.close();
    ws = null;
  }
  connected.set(false);
  for (const [, p] of pending) {
    clearTimeout(p.timer);
    p.reject(new Error("connection closed"));
  }
  pending.clear();
}

export function reconnect() {
  teardown();
  connect();
}

export function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    connected.set(true);
    send({ type: "hello", id: nextId++ });
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }

    if (msg.id != null && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      clearTimeout(p.timer);
      pending.delete(msg.id);
      if (msg.type === "error") p.reject(new Error(msg.message));
      else p.resolve(msg);
    }

    const fns = listeners.get(msg.type);
    if (fns) fns.forEach((fn) => fn(msg));
  };

  ws.onerror = () => {};

  ws.onclose = () => {
    ws = null;
    connected.set(false);
    for (const [, p] of pending) {
      clearTimeout(p.timer);
      p.reject(new Error("connection closed"));
    }
    pending.clear();
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_MS);
  };
}
