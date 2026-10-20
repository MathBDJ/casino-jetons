let ctx = null

// À appeler depuis un clic (les navigateurs interdisent le son automatique)
export function activerSon() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return true
  } catch {
    return false
  }
}

export const sonActif = () => !!ctx && ctx.state === 'running'

export function bip() {
  if (!ctx) return
  ;[880, 660, 880, 660].forEach((f, i) => {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'square'
    o.frequency.value = f
    g.gain.value = 0.15
    o.connect(g)
    g.connect(ctx.destination)
    const t = ctx.currentTime + i * 0.25
    o.start(t)
    o.stop(t + 0.2)
  })
}