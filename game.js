function moveMapIn2048Rule(map, direction) {
  const rotated = rotateMap(map, rotateMapDeg[direction])
  const { result, isMoved, gained } = moveLeft(rotated)
  return { result: rotateMap(result, revertMapDeg[direction]), isMoved, gained }
}
function rotateMap(map, deg) {
  const R = map.length, C = map[0].length
  if (deg===0) return map
  if (deg===90) return Array.from({length:C},(_,c)=>Array.from({length:R},(_,r)=>map[r][C-c-1]))
  if (deg===180) return Array.from({length:R},(_,r)=>Array.from({length:C},(_,c)=>map[R-r-1][C-c-1]))
  if (deg===270) return Array.from({length:C},(_,c)=>Array.from({length:R},(_,r)=>map[R-r-1][c]))
}
function moveLeft(map) {
  const rows = map.map(moveRowLeft)
  const gained = rows.reduce((s,x)=>s+x.gained,0)
  return { result: rows.map(x=>x.result), isMoved: rows.some(x=>x.isMoved), gained }
}
function moveRowLeft(row) {
  const red = row.reduce((acc,cell)=>{
    if(cell===null) return acc
    if(acc.last===null) return {...acc,last:cell,gained:acc.gained}
    if(acc.last===cell && cell*2<=TARGET_TILE) return {result:[...acc.result,cell*2],last:null,gained:acc.gained+cell*2}
    return {result:[...acc.result,acc.last],last:cell,gained:acc.gained}
  },{last:null,result:[],gained:0})
  const arr=[...red.result,red.last]
  const out=Array.from({length:row.length},(_,i)=>arr[i]??null)
  return {result:out,isMoved:row.some((v,i)=>v!==out[i]),gained:red.gained}
}
const rotateMapDeg={up:90,right:180,down:270,left:0}
const revertMapDeg={up:270,right:180,down:90,left:0}
const ROWS=4,COLS=4
const TARGET_TILE=128
const STORAGE_KEY="hw-2048-state"
let state={map:emptyMap(ROWS,COLS),score:0,finished:false}
window.addEventListener("DOMContentLoaded",()=>{
  const board=document.getElementById("board")
  const score=document.getElementById("score")
  const overlay=document.getElementById("overlay")
  const title=document.getElementById("overlayTitle")
  const newBtn=document.getElementById("newGameBtn")
  const restartBtn=document.getElementById("restartBtn")
  const saved=load()
  if(saved)state=saved;else start()
  render()
  newBtn.addEventListener("click",start)
  restartBtn.addEventListener("click",start)
  window.addEventListener("keydown",e=>{
    if(state.finished)return
    const d=dir(e.key)
    if(!d)return
    e.preventDefault()
    const {result,isMoved,gained}=moveMapIn2048Rule(state.map,d)
    if(!isMoved)return
    state.score+=gained
    state.map=result
    if(reached(state.map,TARGET_TILE)){
      state.finished=true
      title.textContent="128 타일 달성"
      save()
      render()
      overlay.classList.remove("hidden")
      return
    }
    spawn(state.map)
    save()
    render()
  })
  function render(){
    board.innerHTML=""
    for(let i=0;i<ROWS;i++){
      for(let j=0;j<COLS;j++){
        const v=state.map[i][j]
        const cell=document.createElement("div")
        cell.className="cell"
        if(v!==null){
          cell.textContent=String(v)
          cell.classList.add(`tile-${v}`)
        }
        board.appendChild(cell)
      }
    }
    score.textContent=String(state.score)
  }
  function start(){
    state={map:emptyMap(ROWS,COLS),score:0,finished:false}
    spawn(state.map);spawn(state.map)
    overlay.classList.add("hidden")
    save()
    render()
  }
})
function emptyMap(r,c){return Array.from({length:r},()=>Array.from({length:c},()=>null))}
function empties(map){const out=[];for(let i=0;i<map.length;i++)for(let j=0;j<map[0].length;j++)if(map[i][j]===null)out.push([i,j]);return out}
function spawn(map){const e=empties(map);if(!e.length)return false;const[i,j]=e[Math.floor(Math.random()*e.length)];map[i][j]=Math.random()<0.9?2:4;return true}
function reached(map,t){return map.some(r=>r.some(v=>v!==null&&v>=t))}
function dir(k){if(k==="ArrowUp")return"up";if(k==="ArrowRight")return"right";if(k==="ArrowDown")return"down";if(k==="ArrowLeft")return"left";return null}
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}}
function load(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null}catch{return null}}
