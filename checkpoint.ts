/** One scroll-authored scene. Buttons keep every step available without scrolling. */
type CheckpointOptions = { stopped: () => boolean; busy: () => boolean; showStep: (step: number) => void }
export function setupCheckpoint(options: CheckpointOptions) {
  const workbench = document.querySelector<HTMLElement>('.demo-workbench')!
  const orbit = document.querySelector<HTMLElement>('.console-orbit')!
  const output = document.querySelector<HTMLElement>('.demo-output')!
  const chapters = [...document.querySelectorAll<HTMLElement>('[data-chapter]')]
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-console-step]')]
  const desktop = matchMedia('(min-width: 1100px) and (min-height: 680px) and (hover: hover)')
  let step = 2
  let pending = 0
  let followScroll = false
  let visible = false
  let cinematic = false
  let manual = false

  function chooseManually() { manual = true; followScroll = false }

  function measure() {
    const wasCinematic = cinematic
    // A pinned scene is useful only when its controls AND explanation fit on screen.
    cinematic = desktop.matches && !options.stopped() && output.offsetHeight <= innerHeight - 100
    workbench.classList.toggle('scroll-scene', cinematic)
    if (!cinematic) orbit.style.transform = 'none'
    // Content wrapping must not undo a deliberate button selection.
    if (cinematic !== wasCinematic) schedule()
  }

  function reflect(next: number) {
    step = next
    buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.consoleStep) === step)))
    chapters.forEach((chapter, index) => chapter.classList.toggle('chapter-current', index === step))
  }
  function render() {
    pending = 0
    const syncStep = followScroll
    followScroll = false
    if (document.hidden || !visible) return
    if (!cinematic) { orbit.style.transform = 'none'; return }
    const bounds = workbench.getBoundingClientRect()
    const progress = Math.min(1, Math.max(0, (120 - bounds.top) / Math.max(1, bounds.height - innerHeight * .6)))
    // Apply the transform to this one element, without inherited animated CSS variables.
    orbit.style.transform = `rotateX(${7 - progress * 7}deg) rotateY(${-13 + progress * 13}deg)`
    if (manual || !syncStep || options.busy() || bounds.top > innerHeight * .55 || bounds.bottom < 180) return
    let next = 0
    chapters.forEach((chapter, index) => { if (chapter.getBoundingClientRect().top <= innerHeight * .46) next = index })
    if (next !== step) options.showStep(next)
  }
  function schedule(syncStep = false) {
    followScroll ||= syncStep
    if (!pending) pending = requestAnimationFrame(render)
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    if (visible) schedule(true)
  }, { rootMargin: '100px' })
  observer.observe(workbench)
  buttons.forEach(button => button.addEventListener('click', () => {
    // Buttons select instantly and never move focus or seize the user's scroll position.
    chooseManually()
    options.showStep(Number(button.dataset.consoleStep))
  }))
  // Focus and scrollIntoView also emit scroll events. Resume the story only when
  // the visitor deliberately scrolls, not when a button receives keyboard focus.
  window.addEventListener('wheel', () => { manual = false }, { passive: true })
  window.addEventListener('touchmove', () => { manual = false }, { passive: true })
  window.addEventListener('pointerdown', event => {
    if (event.clientX >= document.documentElement.clientWidth) manual = false
  }, { passive: true })
  window.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('input,textarea,select,[contenteditable]')) return
    if (event.key === ' ' && target?.closest('button,a')) return
    manual = false
  })
  window.addEventListener('scroll', () => schedule(true), { passive: true })
  window.addEventListener('resize', () => { measure(); schedule() })
  desktop.addEventListener('change', measure)
  new ResizeObserver(measure).observe(output)
  document.addEventListener('visibilitychange', () => schedule())
  return {
    reflect,
    chooseManually,
    refresh() {
      measure()
      schedule()
    },
  }
}
