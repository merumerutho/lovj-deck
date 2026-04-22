<script>
  import { connected, reconnect } from "../lib/transport.js";
</script>

<div class="status">
  <span class="dot" class:up={$connected}></span>
  {$connected ? "Connected" : "Disconnected"}
  <button class="reconnect-btn" onclick={reconnect} title="Reconnect and refresh">&#x21bb;</button>
</div>

<style>
  .status {
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #999;
  }
  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: #a44;
    transition: background 0.2s;
  }
  .dot.up { background: #4a8; }
  .reconnect-btn {
    background: transparent;
    border: 1px solid #444;
    border-radius: 3px;
    color: #999;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.1rem 0.35rem;
    line-height: 1;
    transition: all 0.15s;
  }
  .reconnect-btn:hover { color: #ddd; border-color: #666; }
</style>
