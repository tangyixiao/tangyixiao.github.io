import assert from 'node:assert/strict'
import test from 'node:test'
import { createResourceScope } from '../src/visual/resourceScope.ts'

test('resource scope disposes tracked resources in reverse order after initialization failure', () => {
  const events = []
  const scope = createResourceScope()
  scope.add(() => events.push('listener'))
  scope.track({ name: 'renderer' }, () => events.push('renderer'))
  scope.track({ name: 'geometry' }, () => events.push('geometry'))

  try {
    throw new Error('simulated initialization failure')
  } catch {
    scope.cleanup()
  }

  assert.deepEqual(events, ['geometry', 'renderer', 'listener'])
  scope.cleanup()
  assert.deepEqual(events, ['geometry', 'renderer', 'listener'])
})

test('resource scope attempts every cleanup even when one disposer throws', () => {
  const events = []
  const scope = createResourceScope()
  scope.add(() => events.push('last'))
  scope.add(() => { events.push('throws'); throw new Error('dispose failure') })
  scope.add(() => events.push('first'))

  assert.throws(() => scope.cleanup(), /dispose failure/)
  assert.deepEqual(events, ['first', 'throws', 'last'])
})
