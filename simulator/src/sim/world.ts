import type { VirtualPhone } from './phone.ts';

export class World2D {
  public readonly sizeMeters: number;
  public readonly radioRangeMeters: number;
  public readonly cellSize: number;
  private readonly numCells: number;

  constructor(sizeMeters: number = 5000, radioRangeMeters: number = 50) {
    this.sizeMeters = sizeMeters;
    this.radioRangeMeters = radioRangeMeters;
    this.cellSize = radioRangeMeters;
    this.numCells = Math.ceil(sizeMeters / this.cellSize);
  }

  /**
   * Efficient O(N) neighbor discovery using spatial 2D cell hash grid.
   * Finds all unique pairs of phones with euclidean distance <= radioRangeMeters (50m).
   */
  public findMeetingPairs(phones: VirtualPhone[]): [VirtualPhone, VirtualPhone][] {
    const grid = new Map<number, VirtualPhone[]>();

    // 1. Populate grid cells
    for (const p of phones) {
      const cx = Math.min(Math.floor(p.x / this.cellSize), this.numCells - 1);
      const cy = Math.min(Math.floor(p.y / this.cellSize), this.numCells - 1);
      const cellKey = cx * this.numCells + cy;

      const cell = grid.get(cellKey);
      if (cell) {
        cell.push(p);
      } else {
        grid.set(cellKey, [p]);
      }
    }

    const meetingPairs: [VirtualPhone, VirtualPhone][] = [];
    const rangeSquared = this.radioRangeMeters * this.radioRangeMeters;

    // Offsets for neighbor cells to check (self + 4 forward neighbors to avoid duplicate pairs)
    const neighborOffsets = [
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ];

    for (let cx = 0; cx < this.numCells; cx++) {
      for (let cy = 0; cy < this.numCells; cy++) {
        const cellKey = cx * this.numCells + cy;
        const currentCell = grid.get(cellKey);
        if (!currentCell || currentCell.length === 0) continue;

        for (const [dx, dy] of neighborOffsets) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= this.numCells || ny < 0 || ny >= this.numCells) continue;

          const neighborKey = nx * this.numCells + ny;
          const neighborCell = grid.get(neighborKey);
          if (!neighborCell || neighborCell.length === 0) continue;

          const isSameCell = dx === 0 && dy === 0;

          for (let i = 0; i < currentCell.length; i++) {
            const pA = currentCell[i];
            const startJ = isSameCell ? i + 1 : 0;

            for (let j = startJ; j < neighborCell.length; j++) {
              const pB = neighborCell[j];
              const distSq = (pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2;

              if (distSq <= rangeSquared) {
                meetingPairs.push([pA, pB]);
              }
            }
          }
        }
      }
    }

    return meetingPairs;
  }
}

