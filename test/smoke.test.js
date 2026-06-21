const { test } = require('node:test')
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

test('entry is valid JavaScript', () => {
  execFileSync('node', ['--check', join(__dirname, '..', 'index.js')])
})
