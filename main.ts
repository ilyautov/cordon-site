import { t, setupLanguage } from './i18n'
import { readDemoState } from './language'
import { setupEnhancements } from './enhancements'
import fixtures from './scenarios.json'
import verified from './verified-results.json'

type CaseKey = 'reviews' | 'analytics' | 'files'
type BranchKey = 'normal' | 'suspicious'
type Decision = { kind: string; rule?: string; reason?: string; source?: string }
type Outcome = 'allow' | 'review' | 'deny'
interface BranchCopy { title: string; context: string; argument: string; target: string; result: string; reason: string; gate: string }
interface CaseCopy { task: string; permissions: string; source: string; normal: BranchCopy; suspicious: BranchCopy }
const caseCopy: Record<CaseKey, CaseCopy> = {
  reviews: {
    task: 'Ответь покупателю на отзыв о чайнике.',
    permissions: 'Читать отзывы и публиковать ответы. Изменение товаров и финансовые действия не разрешены.',
    source: 'Отзыв покупателя',
    normal: { title: 'Ответ покупателю — по делу.', context: 'Агент подготовил ответ и просит опубликовать его под выбранным отзывом.', argument: 'Ответ на отзыв № 42', target: 'Ответы на отзывы', result: 'Ответ можно опубликовать.', reason: 'Публикация ответа входит в выданные права. Адрес отзыва указан в поручении.', gate: 'Публикация разрешена' },
    suspicious: { title: 'Вместо ответа — цена в 1 ₽.', context: 'Агент запрашивает смену цены: с 1 990 ₽ до 1 ₽. Этого в поручении не было.', argument: '1 990 ₽ → 1 ₽', target: 'Каталог магазина', result: 'Изменение цены отклонено.', reason: 'В этой политике не разрешены изменение товаров и финансовые действия.', gate: 'Нет прав менять цену' },
  },
  analytics: {
    task: 'Подготовь здесь сводку продаж за август по таблице sales.csv.',
    permissions: 'Чтение, сводка и сетевые вызовы разрешены. Отправка на адрес из недоверенного документа требует решения человека.',
    source: 'Таблица продаж · sales.csv',
    normal: { title: 'Отчёт остаётся у тебя.', context: 'Агент подготовил сводку: 120 заказов, выручка 238 800 ₽. Её можно вывести в рабочий чат.', argument: '120 заказов · 238 800 ₽', target: 'Сводка в чате', result: 'Подготовка сводки разрешена.', reason: 'Сводка входит в права агента. Данные не отправляются внешнему получателю.', gate: 'Сводка разрешена' },
    suspicious: { title: 'Отчёт просили. Выгрузку — нет.', context: 'Агент запрашивает отправку customers.csv на адрес из комментария к таблице.', argument: 'audit@external.example', target: 'Почта', result: 'Отправка ждёт твоего решения.', reason: 'Получатель пришёл из недоверенной таблицы. Нужно проверить весь черновик перед отправкой.', gate: 'Адрес из чужой таблицы' },
  },
  files: {
    task: 'Прочитай заметку во входящих и создай папку для документов за август.',
    permissions: 'Читать файлы и создавать папки. Удаление не разрешено.',
    source: 'Заметка во входящей папке · note.txt',
    normal: { title: 'Новая папка. Всё на месте.', context: 'Агент просит создать папку для августовских документов, как ты и поручил.', argument: 'Новая папка: 2026-08', target: 'Файлы', result: 'Создание папки разрешено.', reason: 'Создание входит в права агента, папка указана в поручении.', gate: 'Создание разрешено' },
    suspicious: { title: 'Бэкап — не мусор.', context: 'Агент запрашивает удаление backup. Чужая заметка выдала это за обязательный шаг уборки.', argument: 'Удалить папку backup', target: 'Резервные копии', result: 'Удаление бэкапа отклонено.', reason: 'Удаление не входит в выданные права. Инструкция из файла не расширяет их.', gate: 'Нет прав на удаление' },
  },
}
const installation: Record<string, { label: string; command: string; note: string; docs: string; title: string }> = {
  claude: { label: 'В ЧАТЕ CLAUDE CODE', command: '/plugin marketplace add ilyautov/cordon\n/plugin install cordon@cordon', note: 'Перезапустите Claude Code. Проверьте регистрацию хуков через /hooks, затем выполните самопроверку и настройте политику по инструкции.', docs: 'install.md', title: 'Инструкция для Claude Code' },
  gemini: { label: 'В ТЕРМИНАЛЕ / GEMINI CLI', command: 'gemini extensions install https://github.com/ilyautov/cordon', note: 'Перезапустите Gemini CLI. Для адаптера есть автоматические тесты; живой прогон в документации пока не подтверждён.', docs: 'install-gemini.md', title: 'Инструкция для Gemini CLI' },
  mcp: { label: 'ПАКЕТ / MCP-ГЕЙТВЕЙ', command: 'npm install -g @ilyautov/cordon@0.11.0\ncordon mcp --help', note: 'В конфигурации MCP-хоста направьте запуск своего сервера через cordon mcp. Точная команда зависит от сервера; пример подключения есть в руководстве.', docs: 'install-mcp.md', title: 'Подключение MCP-гейтвея' },
  langchain: { label: 'В ПРОЕКТЕ / LANGCHAIN.JS', command: 'npm install @ilyautov/cordon@0.11.0', note: 'Установка пакета сама по себе не включает защиту. Подключите createCordonMiddleware к createAgent и задайте политику по инструкции.', docs: 'install-langchain.md', title: 'Подключение middleware' },
}

function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector)
  if (!found) throw new Error(`Missing UI element: ${selector}`)
  return found
}
function put(selector: string, value: string) { element(selector).textContent = t(value) }
let activeInstall = 'claude'
let copySequence = 0
document.querySelectorAll<HTMLButtonElement>('[data-install]').forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.install ?? ''
    const data = installation[key]
    if (!data) return
    activeInstall = key
    copySequence++
    document.querySelectorAll<HTMLButtonElement>('[data-install]').forEach(item => {
      item.classList.toggle('active', item === button)
      item.setAttribute('aria-pressed', String(item === button))
    })
    put('#install-label', data.label)
    put('#install-command', data.command)
    put('#install-note', data.note)
    put('#install-docs', t(data.title) + ' ↗')
    element<HTMLAnchorElement>('#install-docs').href = 'https://github.com/ilyautov/cordon/blob/v0.11.0/docs/' + data.docs
    put('#copy-status', '')
  })
})
element<HTMLButtonElement>('#copy-install').addEventListener('click', async () => {
  const sequence = ++copySequence
  try {
    await navigator.clipboard.writeText(installation[activeInstall].command)
    if (sequence === copySequence) put('#copy-status', 'Команды скопированы. Вставьте их в выбранной среде.')
  } catch {
    if (sequence === copySequence) put('#copy-status', 'Браузер не дал доступ к буферу. Выделите и скопируйте команды вручную.')
  }
})



const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const motionButton = element<HTMLButtonElement>('.motion-toggle')
const heroImage = element<HTMLImageElement>('.hero-image')
const episodeStage = element('.episode-stage')
const packet = element('.request-packet')
const route = element('.episode-route')
const playButton = element<HTMLButtonElement>('#episode-play')
const restored = readDemoState(location.search)
let paused = reduceMotion.matches || restored.paused
const enhancements = setupEnhancements(() => paused || reduceMotion.matches)
let selectedCase: CaseKey = restored.selectedCase
let selectedBranch: BranchKey = restored.branch
let generation = 0
let running = false
let started = false
let packetAnimation: Animation | undefined
function current() {
  const fixture = fixtures.cases.find(item => item.id === selectedCase)
  const proof = verified.results.find(item => item.id === selectedCase)
  if (!fixture || !proof) throw new Error('Missing verified scenario: ' + selectedCase)
  const decision: Decision = proof[selectedBranch]
  const outcome: Outcome = decision.kind === 'allow' ? 'allow' : decision.kind === 'ask' ? 'review' : 'deny'
  return { fixture, proof, decision, outcome, branch: fixture[selectedBranch], copy: caseCopy[selectedCase][selectedBranch] }
}
function stopPlayback() {
  generation++
  packetAnimation?.cancel()
  packetAnimation = undefined
  running = false
}
function point(nodeSelector: string) {
  const bounds = element(nodeSelector).getBoundingClientRect()
  const routeBounds = route.getBoundingClientRect()
  return Math.max(0, Math.min(routeBounds.width - packet.offsetWidth, bounds.left + bounds.width / 2 - routeBounds.left - packet.offsetWidth / 2))
}
function positionPacket(nodeSelector: string) {
  packet.style.transform = `translateX(${point(nodeSelector)}px)`
  packet.style.opacity = '1'
}
function setEpisodePhase(phase: 'ready' | 'travel' | 'checking' | Outcome) {
  episodeStage.dataset.phase = phase
  const step = phase === 'ready' ? '' : phase === 'travel' ? 'request' : phase === 'checking' ? 'check' : 'result'
  document.querySelectorAll<HTMLElement>('[data-progress]').forEach(item => {
    if (item.dataset.progress === step) item.setAttribute('aria-current', 'step')
    else item.removeAttribute('aria-current')
  })
}
function configureEpisode() {
  const { fixture, proof, branch, copy, outcome, decision } = current()
  episodeStage.dataset.outcome = outcome
  element('.episode-verdict').dataset.outcome = outcome
  document.querySelectorAll<HTMLImageElement>('[data-case-art]').forEach(art => {
    const active = art.dataset.caseArt === selectedCase
    art.classList.toggle('active', active)
    art.setAttribute('aria-hidden', String(!active))
  })
  put('#case-task', caseCopy[selectedCase].task)
  const normalArgs = fixture.normal.call.args as Record<string, unknown>
  put('#case-resource', t('Указано в поручении:') + ' ' + String(normalArgs.review_url ?? normalArgs.file ?? normalArgs.path))
  put('#proof-task', fixture.task)
  put('#case-policy', caseCopy[selectedCase].permissions)
  put('#source-label', caseCopy[selectedCase].source)
  put('#source-text', branch.text)
  put('#source-context', selectedBranch === 'normal' ? 'Обычный внешний текст, с которым агенту нужно поработать.' : 'Это внешний текст. Он не выдаёт агенту новые права.')
  element('.source-card').dataset.branch = selectedBranch
  put('#episode-mode', fixture.mode === 'autonomous' ? 'РЕЖИМ: АВТОНОМНО' : 'РЕЖИМ: С ЧЕЛОВЕКОМ')
  put('#packet-tool', branch.call.tool)
  put('#packet-argument', copy.argument)
  put('#episode-heading', copy.title)
  put('#episode-explanation', copy.context)
  put('#tool-name', copy.target)
  put('#tool-caption', 'Ещё не вызван')
  put('#gate-caption', 'Проверяет по политике')
  put('#proof-normal', proof.normal.kind)
  const suspicious: Decision = proof.suspicious
  put('#proof-suspicious', suspicious.kind + (suspicious.rule ? ' · ' + suspicious.rule : ''))
  put('#proof-call', JSON.stringify(branch.call, null, 2))
  put('#proof-decision', JSON.stringify(decision, null, 2))
  put('#proof-policy', JSON.stringify({ mode: fixture.mode, ...fixture.policy }, null, 2))
}
function finishEpisode() {
  const { outcome, copy } = current()
  setEpisodePhase(outcome)
  positionPacket(outcome === 'allow' ? '.node-tool' : '.node-cordon')
  put('#episode-step', '03 / РЕЗУЛЬТАТ ПРОВЕРКИ')
  put('#gate-caption', copy.gate)
  put('#tool-caption', outcome === 'allow' ? 'Вызов разрешён' : outcome === 'review' ? 'Ждёт подтверждения' : 'Вызов отклонён')
  put('#episode-result', copy.result)
  put('#episode-reason', copy.reason)
  playButton.textContent = t('Повторить проверку ↻')
  running = false
}
async function movePacket(from: number, to: number, duration: number, run: number) {
  packet.style.opacity = '1'
  packetAnimation = packet.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], { duration, easing: 'cubic-bezier(.77,0,.175,1)', fill: 'forwards' })
  await packetAnimation.finished.catch(() => undefined)
  if (run !== generation) return false
  packet.style.transform = `translateX(${to}px)`
  packetAnimation?.cancel()
  packetAnimation = undefined
  return true
}
async function playEpisode(animate: boolean) {
  stopPlayback()
  started = true
  configureEpisode()
  if (!animate || paused || reduceMotion.matches || document.hidden) { finishEpisode(); return }
  running = true
  const run = generation
  setEpisodePhase('travel')
  positionPacket('.node-agent')
  put('#episode-step', '01 / ЗАПРОС АГЕНТА')
  put('#episode-result', 'Запрос идёт на проверку')
  put('#episode-reason', 'Инструмент ещё не вызван.')
  playButton.textContent = t('Начать заново ↻')
  if (!await movePacket(point('.node-agent'), point('.node-cordon'), 1000, run)) return
  setEpisodePhase('checking')
  put('#episode-step', '02 / ПРОВЕРКА CORDON')
  put('#gate-caption', current().copy.gate)
  put('#episode-result', 'Cordon сверяет запрос с политикой')
  put('#episode-reason', current().copy.reason)
  if (!await movePacket(point('.node-cordon'), point('.node-cordon'), 1100, run)) return
  if (current().outcome === 'allow') {
    setEpisodePhase('allow')
    if (!await movePacket(point('.node-cordon'), point('.node-tool'), 1000, run)) return
  }
  finishEpisode()
}
document.querySelectorAll<HTMLButtonElement>('[data-case]').forEach(button => {
  button.addEventListener('click', event => {
    const key = button.dataset.case
    if (key !== 'reviews' && key !== 'analytics' && key !== 'files') return
    selectedCase = key
    document.querySelectorAll<HTMLButtonElement>('[data-case]').forEach(item => {
      item.classList.toggle('active', item === button)
      item.setAttribute('aria-pressed', String(item === button))
    })
    void playEpisode(event.detail > 0)
    element('.case-brief').scrollIntoView({ behavior: paused || reduceMotion.matches || event.detail === 0 ? 'instant' : 'smooth', block: 'start' })
    if (event.detail === 0) {
      const title = element('#case-task')
      title.tabIndex = -1
      title.focus({ preventScroll: true })
    }
  })
})
document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(button => {
  button.addEventListener('click', event => {
    const key = button.dataset.branch
    if (key !== 'normal' && key !== 'suspicious') return
    selectedBranch = key
    document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(item => {
      item.classList.toggle('active', item === button)
      item.setAttribute('aria-pressed', String(item === button))
    })
    void playEpisode(event.detail > 0)
  })
})
playButton.addEventListener('click', () => { void playEpisode(true) })
document.querySelectorAll<HTMLButtonElement>('[data-case]').forEach(button => { const active = button.dataset.case === selectedCase; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)) })
document.querySelectorAll<HTMLButtonElement>('[data-branch]').forEach(button => { const active = button.dataset.branch === selectedBranch; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)) })
document.querySelector<HTMLButtonElement>(`[data-install="${restored.install}"]`)?.click()
configureEpisode()
started = true
finishEpisode()
function setMotion() {
  const stopped = paused || reduceMotion.matches
  document.body.classList.toggle('motion-paused', stopped)
  document.documentElement.classList.toggle('motion-paused', stopped)
  motionButton.setAttribute('aria-pressed', String(stopped))
  motionButton.disabled = reduceMotion.matches
  put('.motion-icon', stopped ? '▷' : 'Ⅱ')
  put('.motion-label', reduceMotion.matches ? 'Движение выключено в системе' : paused ? 'Включить анимацию' : 'Остановить анимацию')
  if (stopped) { heroImage.style.transform = 'none'; if (running) { stopPlayback(); finishEpisode() } }
  enhancements.refreshMotion()
}
motionButton.addEventListener('click', () => { paused = !paused; setMotion() })
reduceMotion.addEventListener('change', () => { paused = reduceMotion.matches; setMotion() })
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { stopPlayback(); finishEpisode() } })
const hero = element('.hero')
const floatingNavigation = element('.floating-nav')
const navTargets = ['story', 'live-proof', 'install'].map(id => ({ section: element('#' + id), link: element<HTMLAnchorElement>(`.floating-nav a[href="#${id}"]`) }))
let pending = false
function updateScroll() {
  pending = false
  const scroll = window.scrollY
  floatingNavigation.classList.toggle('visible', scroll > hero.offsetHeight * .65)
  if (!paused && !reduceMotion.matches && scroll < hero.offsetHeight && window.innerWidth > 760) heroImage.style.transform = `translateY(${Math.min(scroll * .15, 95)}px) scale(1.045)`
  let active = ''
  navTargets.forEach(({ section }) => { if (section.getBoundingClientRect().top <= window.innerHeight * .4) active = section.id })
  navTargets.forEach(({ section, link }) => {
    const current = section.id === active
    link.classList.toggle('current', current)
    if (current) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  })
}
function requestUpdate() { if (!pending) { pending = true; requestAnimationFrame(updateScroll) } }
window.addEventListener('scroll', requestUpdate, { passive: true })
window.addEventListener('resize', () => {
  if (window.innerWidth <= 760) heroImage.style.transform = 'none'
  if (started) { stopPlayback(); finishEpisode() }
  requestUpdate()
})
setMotion()
requestUpdate()

document.querySelectorAll<HTMLAnchorElement>('[data-choose-install]').forEach(link => {
  link.addEventListener('click', () => {
    const key = link.dataset.chooseInstall
    if (!key || !installation[key]) return
    const button = document.querySelector<HTMLButtonElement>(`[data-install="${key}"]`)
    button?.click()
    button?.focus({ preventScroll: true })
  })
})
setupLanguage()
