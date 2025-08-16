import { expect } from 'chai';
import { PathFinder } from '../../src/engine/pathfinder';
import { Coord } from '../../src/types/bot.types';

function manhattan(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

describe('PathFinder.calcPath (A*)', () => {
  it('returns the shortest path in free 3D grid (Manhattan distance)', () => {
    const start: Coord = { x: 0, y: 60, z: 0 };
    const goal: Coord = { x: 3, y: 60, z: 2 };

    const path = PathFinder.calcPath(start, goal);
    expect(path.length).to.be.greaterThan(0);
    expect(path[0]).to.deep.equal(start);
    expect(path[path.length - 1]).to.deep.equal(goal);

    const expectedSteps = manhattan(start, goal);
    expect(path.length - 1).to.equal(expectedSteps);

    // 連続ノードが 6-近傍で接していることを確認
    for (let i = 1; i < path.length; i += 1) {
      const dx = Math.abs(path[i].x - path[i - 1].x);
      const dy = Math.abs(path[i].y - path[i - 1].y);
      const dz = Math.abs(path[i].z - path[i - 1].z);
      expect(dx + dy + dz).to.equal(1);
    }
  });

  it('finds a detour around simple obstacles', () => {
    const start: Coord = { x: 0, y: 60, z: 0 };
    const goal: Coord = { x: 3, y: 60, z: 0 };

    // x=1 の直線上に障害物を配置 (y,z は固定)
    const blocked = new Set(['1,60,0', '1,60,1', '1,60,-1']);
    const passable = (c: Coord) => !blocked.has(`${c.x},${c.y},${c.z}`);

    const path = PathFinder.calcPath(start, goal, passable);
    expect(path.length).to.be.greaterThan(0);
    expect(path[0]).to.deep.equal(start);
    expect(path[path.length - 1]).to.deep.equal(goal);

    // 直進 3 歩よりは長い（回り道になっている）
    expect(path.length - 1).to.be.greaterThan(3);
  });
  it('start===goal の場合は [start] を返す', () => {
    const s: Coord = { x: 1, y: 2, z: 3 };
    const g: Coord = { ...s };
    const path = PathFinder.calcPath(s, g);
    expect(path).to.deep.equal([s]);
  });

  it('ゴールが通行不可なら空配列を返す', () => {
    const s: Coord = { x: 0, y: 60, z: 0 };
    const g: Coord = { x: 3, y: 60, z: 2 };
    const passable = (c: Coord) => !(c.x === g.x && c.y === g.y && c.z === g.z);
    const path = PathFinder.calcPath(s, g, passable);
    expect(path).to.deep.equal([]);
  });
});