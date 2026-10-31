/**
 * Hybrid Logical Clock (SRS §8.2).
 *
 * HLC = wall_ms : counter : node_id
 *
 * - wall_ms  = max(local wall clock, last seen remote wall_ms)
 * - counter  = tie-breaking counter within the same wall_ms
 * - node_id  = unique device identifier (first 8 hex chars of public key)
 *
 * Guarantees: every call to `tick()` or `receive()` produces a strictly
 * increasing (wall_ms, counter) pair, even if the local clock goes backward
 * or a peer's clock is far ahead.
 */

export class HLC {
  private wallMs: number;
  private counter: number;
  private readonly nodeId: string;

  /**
   * @param nodeId  Short identifier for this device (e.g. first 8 hex chars of pubkey).
   * @param nowMs   Optional initial wall-clock time (defaults to Date.now()).
   */
  constructor(nodeId: string, nowMs?: number) {
    this.nodeId = nodeId;
    this.wallMs = nowMs ?? Date.now();
    this.counter = 0;
  }

  /** Generate a new HLC timestamp for a local event. */
  tick(nowMs?: number): string {
    const now = nowMs ?? Date.now();
    if (now > this.wallMs) {
      this.wallMs = now;
      this.counter = 0;
    } else {
      // Clock hasn't advanced; bump counter
      this.counter += 1;
    }
    return this.toString();
  }

  /**
   * Merge with a remote HLC timestamp (received during sync).
   * Returns a new HLC string that is strictly greater than both the local
   * state and the remote timestamp.
   */
  receive(remoteHlcStr: string, nowMs?: number): string {
    const remote = HLC.parse(remoteHlcStr);
    const now = nowMs ?? Date.now();

    if (now > this.wallMs && now > remote.wallMs) {
      // Local clock is ahead of both — use it
      this.wallMs = now;
      this.counter = 0;
    } else if (this.wallMs === remote.wallMs) {
      // Same wall time — bump counter past both
      this.counter = Math.max(this.counter, remote.counter) + 1;
    } else if (remote.wallMs > this.wallMs) {
      // Remote is ahead — adopt its wall time, bump its counter
      this.wallMs = remote.wallMs;
      this.counter = remote.counter + 1;
    } else {
      // Local is ahead of remote — bump local counter
      this.counter += 1;
    }
    return this.toString();
  }

  /** Current HLC as a comparable string: "wall_ms:counter:node_id". */
  toString(): string {
    // Pad wall_ms to 13 digits and counter to 4 digits for lexicographic ordering
    const wStr = this.wallMs.toString().padStart(13, '0');
    const cStr = this.counter.toString().padStart(4, '0');
    return `${wStr}:${cStr}:${this.nodeId}`;
  }

  /** Parse an HLC string back into its components. */
  static parse(hlcStr: string): { wallMs: number; counter: number; nodeId: string } {
    const parts = hlcStr.split(':');
    if (parts.length !== 3) {
      throw new Error(`Invalid HLC format: "${hlcStr}"`);
    }
    return {
      wallMs: parseInt(parts[0], 10),
      counter: parseInt(parts[1], 10),
      nodeId: parts[2],
    };
  }

  /**
   * Compare two HLC strings.
   * Returns negative if a < b, 0 if equal, positive if a > b.
   */
  static compare(a: string, b: string): number {
    const pa = HLC.parse(a);
    const pb = HLC.parse(b);
    if (pa.wallMs !== pb.wallMs) return pa.wallMs - pb.wallMs;
    if (pa.counter !== pb.counter) return pa.counter - pb.counter;
    if (pa.nodeId < pb.nodeId) return -1;
    if (pa.nodeId > pb.nodeId) return 1;
    return 0;
  }

  /** Get the wall-clock millisecond component of an HLC string. */
  static wallMs(hlcStr: string): number {
    return HLC.parse(hlcStr).wallMs;
  }
}

