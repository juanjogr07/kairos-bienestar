let lastScrollY = window.scrollY
let lastScrollTime = Date.now()
let scrollSpeeds: number[] = []

function measureScroll(): void {
  const now = Date.now()
  const deltaY = Math.abs(window.scrollY - lastScrollY)
  const deltaTime = (now - lastScrollTime) / 1000

  if (deltaTime > 0 && deltaY > 0) {
    const speed = deltaY / deltaTime
    scrollSpeeds.push(speed)
    if (scrollSpeeds.length > 20) scrollSpeeds.shift()
  }

  lastScrollY = window.scrollY
  lastScrollTime = now
}

function getAverageScrollSpeed(): number {
  if (scrollSpeeds.length === 0) return 0
  return scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length
}

function reportScrollData(): void {
  const avgSpeed = getAverageScrollSpeed()
  if (avgSpeed === 0) return

  chrome.runtime.sendMessage({
    type: "SCROLL_DATA",
    scroll_speed: Math.round(avgSpeed),
    timestamp: new Date().toISOString(),
  })

  scrollSpeeds = []
}

window.addEventListener("scroll", measureScroll, { passive: true })

const reportInterval = setInterval(reportScrollData, 30_000)

window.addEventListener("beforeunload", () => {
  reportScrollData()
  clearInterval(reportInterval)
})
