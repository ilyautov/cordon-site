// Node.js 22+. Install: npm install @ilyautov/cordon@0.11.0
// Run: node reproduce.mjs [file:///absolute/path/to/cordon/dist/index.js]
// Gate-only fixtures: none of the six named tools is implemented or executed.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

const fixtures = JSON.parse(readFileSync(new URL('./scenarios.json', import.meta.url), 'utf8'))
const { Cordon, DEFAULT_POLICY, VERSION } = await import(process.argv[2] ?? '@ilyautov/cordon')
assert.equal(VERSION, '0.11.0', 'Use the pinned Cordon version for this reproduction')
assert.equal(fixtures.version, VERSION)
assert.deepEqual(fixtures.cases.map(({ id }) => id), ['reviews', 'analytics', 'files'])
const expected = {
  reviews: { kind: 'deny', rule: 'certificate' },
  analytics: { kind: 'ask', rule: 'provenance' },
  files: { kind: 'deny', rule: 'certificate' },
}
const results = []
for (const scenario of fixtures.cases) {
  const row = { id: scenario.id }
  for (const branch of ['normal', 'suspicious']) {
    const fixture = scenario[branch]
    const home = mkdtempSync(join(tmpdir(), 'cordon-v6-proof-'))
    try {
      const policy = structuredClone(DEFAULT_POLICY)
      policy.mode = scenario.mode
      policy.profile.effects = structuredClone(scenario.policy.effects)
      policy.tools = structuredClone(scenario.policy.tools)
      policy.arguments = structuredClone(scenario.policy.arguments)
      policy.notify.file = null
      const cordon = new Cordon({ policy, cordonHome: home, sessionId: `${scenario.id}-${branch}` })
      cordon.onUserPrompt(scenario.task)
      cordon.observe(fixture.text, fixture.source)
      const decision = cordon.gate(fixture.call)
      assert.equal(decision.kind, branch === 'normal' ? 'allow' : expected[scenario.id].kind,
        `${scenario.id}/${branch}: unexpected decision ${JSON.stringify(decision)}`)
      if (branch === 'suspicious') {
        assert.equal(decision.rule, expected[scenario.id].rule,
          `${scenario.id}/${branch}: unexpected rule ${JSON.stringify(decision)}`)
      }
      row[branch] = decision
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  }
  results.push(row)
}
const result = {
  version: VERSION,
  results,
  boundary: 'Real Cordon gate decisions over synthetic fixtures with explicit custom policy mappings. No model, tool execution, live service, file operation, email delivery or end-to-end integration was tested.',
}
writeFileSync(new URL('./verified-results.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify(result, null, 2))
