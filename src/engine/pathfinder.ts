import { Coord } from '../types/bot.types';

export type PassableFn = (c: Coord) => boolean;

function key(c: Coord): string {
  return `${c.x},${c.y},${c.z}`;
}

function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

function neighbors(c: Coord): Coord[] {
  return [
    { x: c.x + 1, y: c.y, z: c.z },
    { x: c.x - 1, y: c.y, z: c.z },
    { x: c.x, y: c.y + 1, z: c.z },
    { x: c.x, y: c.y - 1, z: c.z },
    { x: c.x, y: c.y, z: c.z + 1 },
    { x: c.x, y: c.y, z: c.z - 1 }
  ];
}

function reconstructPath(cameFrom: Map<string, string>, currentKey: string, end: Coord): Coord[] {
  const path: Coord[] = [];
  let cur = currentKey;
  while (cameFrom.has(cur)) {
    const [x, y, z] = cur.split(',').map((n) => Number(n));
    path.unshift({ x, y, z });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    cur = cameFrom.get(cur)!;
  }
  const [sx, sy, sz] = cur.split(',').map((n) => Number(n));
  path.unshift({ x: sx, y: sy, z: sz });
  // append goal if not present
  const last = path[path.length - 1];
  if (!last || last.x !== end.x || last.y !== end.y || last.z !== end.z) {
    path.push({ ...end });
  }
  return path;
}

/**
 * A* による最短経路探索（6 近傍 / コスト=1 / 3D グリッド）
 * - passable が false を返す座標は進入不可
 * - 経路が存在しない場合は空配列を返す
 */
export class PathFinder {
  static calcPath(start: Coord, goal: Coord, passable?: PassableFn): Coord[] {
    const isPassable = passable ?? (() => true);

    // 早期終了
    if (key(start) === key(goal)) {
      return [ { ...start } ];
    }

    const openSet = new Set<string>([key(start)]);
    const cameFrom = new Map<string, string>();

    const gScore = new Map<string, number>();
    gScore.set(key(start), 0);

    const fScore = new Map<string, number>();
    fScore.set(key(start), manhattan(start, goal));

    // シンプルな open リスト（要素数が小さい前提で線形探索）
    const getLowestF = (): string => {
      let best = '';
      let bestVal = Number.POSITIVE_INFINITY;
      const keys = Array.from(openSet);
      for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];
        const v = fScore.get(k) ?? Number.POSITIVE_INFINITY;
        if (v < bestVal) {
          bestVal = v;
          best = k;
        }
      }
      return best;
    };

    while (openSet.size > 0) {
      const currentKey = getLowestF();
      const [cx, cy, cz] = currentKey.split(',').map((n) => Number(n));
      const current: Coord = { x: cx, y: cy, z: cz };

      if (currentKey === key(goal)) {
        return reconstructPath(cameFrom, currentKey, goal);
      }

      openSet.delete(currentKey);

      // ループ構文制限に従い index ループで処理し、continue は使用しない
      const nbs = neighbors(current);
      for (let i = 0; i < nbs.length; i += 1) {
        const nb = nbs[i];
        if (isPassable(nb)) {
          const tentativeG = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + 1;
          const nbKey = key(nb);
          if (tentativeG < (gScore.get(nbKey) ?? Number.POSITIVE_INFINITY)) {
            cameFrom.set(nbKey, currentKey);
            gScore.set(nbKey, tentativeG);
            fScore.set(nbKey, tentativeG + manhattan(nb, goal));
            if (!openSet.has(nbKey)) openSet.add(nbKey);
          }
        }
      }
    }

    // 経路なし
    return [];
  }
}