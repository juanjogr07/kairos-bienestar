/**
 * Burst de confetti DOM-puro alrededor de un punto (cx, cy).
 * Se mantiene fuera de React porque solo manipula nodos efímeros del body
 * y no tiene estado compartido.
 */
export function spawnConfetti(cx: number, cy: number): void {
  if (typeof document === "undefined") return;
  const colors = ["#4FFFB0", "#7B6FF0", "#FFD166", "#5AC8FF"];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "confetti go";
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const dist = 60 + Math.random() * 60;
    el.style.left = `${cx}px`;
    el.style.top = `${cy}px`;
    el.style.background = colors[i % colors.length];
    el.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    el.style.setProperty("--dy", `${Math.sin(angle) * dist + 30}px`);
    el.style.position = "fixed";
    el.style.zIndex = "60";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}
