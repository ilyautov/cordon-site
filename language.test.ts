import assert from 'node:assert/strict'
import { browserLanguage, preferredLanguage, readPreference, localizedUrl, readDemoState } from './language'
assert.equal(browserLanguage(['ru-RU', 'en-US']), 'ru')
assert.equal(browserLanguage(['en-US', 'ru-RU']), 'en')
assert.equal(browserLanguage(['RU']), 'ru')
assert.equal(browserLanguage(['fr-FR']), 'en')
assert.equal(browserLanguage([]), 'en')
assert.equal(preferredLanguage(['ru-RU'], 'en'), 'en')
assert.equal(preferredLanguage(['en-US'], 'ru'), 'ru')
assert.equal(readPreference({getItem:()=>{throw Error('blocked')}}), null)
assert.equal(readPreference({getItem:()=> 'javascript:alert(1)'}), null)
assert.equal(readPreference({getItem:()=> 'ru'}), 'ru')
for (const path of ['/v7/', '/v7/index.html', '/v7/ru/', '/v7/en/index.html']) {
 const url=localizedUrl('https://example.test'+path+'?case=files&branch=normal#story', 'en')
 assert.equal(url.pathname, '/v7/en/')
 assert.equal(url.search, '?case=files&branch=normal')
 assert.equal(url.hash, '#story')
 assert.equal(url.origin, 'https://example.test')
}
assert.deepEqual(readDemoState('?case=files&branch=normal&install=mcp&motion=off'), {selectedCase:'files',branch:'normal',install:'mcp',paused:true})
assert.deepEqual(readDemoState('?case=<script>&branch=wrong&install=unknown&motion=foo'), {selectedCase:'analytics',branch:'suspicious',install:'claude',paused:false})
console.log('Language preferences, blocked storage, locale URLs and demo state: passed.')
