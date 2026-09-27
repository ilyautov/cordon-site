import { t } from './i18n'
/** Small feedback for the demonstration; it never executes agent tools. */
export function setupEnhancements(stopped: () => boolean) {
  const animations = new Set<Animation>()
  function animateFeedback(element: Element, frames: Keyframe[], duration = 200) {
    if (stopped()) return
    const animation = element.animate(frames, {duration, easing:'cubic-bezier(.23,1,.32,1)'})
    animations.add(animation)
    void animation.finished.catch(() => undefined).finally(() => animations.delete(animation))
  }
  function refreshMotion() { if (stopped()) { animations.forEach(a => a.cancel()); animations.clear() } }
  const progress = document.querySelector<HTMLElement>('.nav-progress i')!
  let frame = 0
  function updateProgress() {
    frame = 0
    const distance = document.documentElement.scrollHeight - innerHeight
    progress.style.transform = `scaleX(${distance > 0 ? Math.min(1, Math.max(0, scrollY / distance)) : 0})`
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(updateProgress) }
  window.addEventListener('scroll', schedule, {passive:true})
  window.addEventListener('resize', schedule)
  schedule()
  const budget = document.querySelector<HTMLElement>('.budget-display')!
  const tryButton = document.querySelector<HTMLButtonElement>('#budget-try')!
  const resetButton = document.querySelector<HTMLButtonElement>('#budget-reset')!
  const status = document.querySelector<HTMLElement>('#budget-status')!
  const decision = document.querySelector<HTMLElement>('#budget-decision')!
  const feedback = document.querySelector<HTMLElement>('#budget-feedback')!
  const bars = Array.from(document.querySelectorAll<HTMLElement>('.budget-bars i'))
  bars.forEach(bar => bar.classList.add('filled'))
  tryButton.addEventListener('click', event => {
    budget.dataset.blocked = 'true'
    status.textContent = t('21-й вызов отклонён')
    decision.textContent = 'DENY'
    feedback.textContent = t('Счётчик остаётся 20 / 20. В этом примере новый вызов не проходит: лимит на час исчерпан.')
    tryButton.disabled = true
    if (event.detail > 0) animateFeedback(decision, [
      { opacity: .4, transform: 'translateX(12px) scale(.97)' }, { opacity: 1, transform: 'translateX(0) scale(1)' },
    ], 250)
  })
  resetButton.addEventListener('click', () => {
    budget.dataset.blocked = 'false'
    status.textContent = t('Лимит на час выбран')
    decision.textContent = '20 / 20'
    feedback.textContent = t('Демонстрация лимита service: 20 сетевых вызовов в час. Подтверждение человека не снимает лимит.')
    tryButton.disabled = false
  })

  return { refreshMotion }
}
