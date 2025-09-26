/***** ====== 2048 이동 규칙 (스켈레톤과 동일한 이름/로직) ====== *****/

/**
 * 2048 게임에서, Map을 특정 방향으로 이동했을 때 결과를 반환하는 함수입니다.
 * @param {Map2048} map 2048 맵. 빈 공간은 null 입니다.
 * @param {"up"|"left"|"right"|"down"} direction 이동 방향
 * @returns {{result: Map2048, isMoved: boolean}} 이동 방향에 따른 결과와 이동되었는지 여부
 */
function moveMapIn2048Rule(map, direction) {
  if (!validateMapIsNByM(map)) throw new Error("Map is not N by M");

  const rotatedMap = rotateMapCounterClockwise(map, rotateDegreeMap[direction]);

  const { result, isMoved } = moveLeft(rotatedMap);

  return {
    result: rotateMapCounterClockwise(result, revertDegreeMap[direction]),
    isMoved,
  };
}

function validateMapIsNByM(map) {
  const firstColumnCount = map[0].length;
  return map.every((row) => row.length === firstColumnCount);
}

function rotateMapCounterClockwise(map, degree) {
  const rowLength = map.length;
  const columnLength = map[0].length;

  switch (degree) {
    case 0:
      return map;
    case 90:
      return Array.from({ length: columnLength }, (_, columnIndex) =>
        Array.from(
          { length: rowLength },
          (_, rowIndex) => map[rowIndex][columnLength - columnIndex - 1],
        ),
      );
    case 180:
      return Array.from({ length: rowLength }, (_, rowIndex) =>
        Array.from(
          { length: columnLength },
          (_, columnIndex) =>
            map[rowLength - rowIndex - 1][columnLength - columnIndex - 1],
        ),
      );
    case 270:
      return Array.from({ length: columnLength }, (_, columnIndex) =>
        Array.from(
          { length: rowLength },
          (_, rowIndex) => map[rowLength - rowIndex - 1][columnIndex],
        ),
      );
  }
}

function moveLeft(map) {
  const movedRows = map.map(moveRowLeft);
  const result = movedRows.map((movedRow) => movedRow.result);
  const isMoved = movedRows.some((movedRow) => movedRow.isMoved);
  return { result, isMoved };
}

function moveRowLeft(row) {
  const reduced = row.reduce(
    (acc, cell) => {
      if (cell === null) {
        return acc;
      } else if (acc.lastCell === null) {
        return { ...acc, lastCell: cell };
      } else if (acc.lastCell === cell) {
        return { result: [...acc.result, cell * 2], lastCell: null };
      } else {
        return { result: [...acc.result, acc.lastCell], lastCell: cell };
      }
    },
    { lastCell: null, result: [] },
  );

  const result = [...reduced.result, reduced.lastCell];
  const resultRow = Array.from(
    { length: row.length },
    (_, i) => result[i] ?? null,
  );

  return {
    result: resultRow,
    isMoved: row.some((cell, i) => cell !== resultRow[i]),
  };
}

const rotateDegreeMap = {
  up: 90,
  right: 180,
  down: 270,
  left: 0,
};

const revertDegreeMap = {
  up: 270,
  right: 180,
  down: 90,
  left: 0,
};

/***** ====== 여기서부터 게임 루프 / 렌더 / 저장 ====== *****/

const ROWS = 4;
const COLS = 4;
const TARGET_TILE = 128; // 필수 스펙: 128 타일 생성 시 게임 종료
const STORAGE_KEY = "hw-2048-state-v1";

let state = {
  map: createEmptyMap(ROWS, COLS),
  score: 0,
  finished: false,
};

// 시작
const saved = loadState();
if (saved) {
  state = saved;
  render();
} else {
  newGame();
}

// 이벤트
document.getElementById("newGame").addEventListener("click", () => newGame());
document.getElementById("restart").addEventListener("click", () => newGame());

window.addEventListener("keydown", (e) => {
  if (state.finished) return;
  const dir = keyToDirection(e.key);
  if (!dir) return;

  e.preventDefault();

  const beforeSum = sumMap(state.map);
  const { result, isMoved } = moveMapIn2048Rule(state.map, dir);

  if (!isMoved) return; // 움직임이 없으면 무시

  // 점수 = 이동으로 인해 늘어난 총합(병합 증가분). 새 타일은 아직 생성 전이므로 정확함.
  const afterSum = sumMap(result);
  state.score += (afterSum - beforeSum);

  state.map = result;

  // 새 타일 생성
  spawnRandomTile(state.map);

  // 128 달성 체크
  if (hasReachedTarget(state.map, TARGET_TILE)) {
    state.finished = true;
    showOverlay(true);
  }

  saveState();
  render();
});

/***** ====== 유틸/게임 보조 함수 ====== *****/

function newGame() {
  state.map = createEmptyMap(ROWS, COLS);
  state.score = 0;
  state.finished = false;
  spawnRandomTile(state.map);
  spawnRandomTile(state.map);
  saveState();
  render();
  showOverlay(false);
}

function createEmptyMap(r, c) {
  return Array.from({ length: r }, () => Array.from({ length: c }, () => null));
}

function emptyCells(map) {
  const list = [];
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[0].length; j++) {
      if (map[i][j] === null) list.push([i, j]);
    }
  }
  return list;
}

function spawnRandomTile(map) {
  const empties = emptyCells(map);
  if (empties.length === 0) return false;
  const [i, j] = empties[Math.floor(Math.random() * empties.length)];
  map[i][j] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function hasReachedTarget(map, target) {
  return map.some(row => row.some(v => v !== null && v >= target));
}

function sumMap(map) {
  return map.reduce((s, r) => s + r.reduce((a, v) => a + (v ?? 0), 0), 0);
}

function keyToDirection(key) {
  switch (key) {
    case "ArrowUp": return "up";
    case "ArrowRight": return "right";
    case "ArrowDown": return "down";
    case "ArrowLeft": return "left";
    default: return null;
  }
}

/***** ====== 렌더링 ====== *****/

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const overlayEl = document.getElementById("overlay");

function render() {
  // 보드 크기 보장
  boardEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell-size))`;

  boardEl.innerHTML = "";
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      const v = state.map[i][j];
      const cell = document.createElement("div");
      cell.className = "cell";
      if (v !== null) {
        cell.textContent = String(v);
        cell.classList.add(`tile-${v}`);
      } else {
        cell.textContent = "";
      }
      boardEl.appendChild(cell);
    }
  }
  scoreEl.textContent = String(state.score);
}

function showOverlay(show) {
  overlayEl.classList.toggle("hidden", !show);
}

/***** ====== 저장/복원 ====== *****/

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // storage가 막힌 환경 대비
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

/***** ====== 타입 주석 참고용 (JSDoc) ====== *****/
// typedefs (개발 편의용 주석)
/**
 * @typedef {(number|null)[][]} Map2048
 */
