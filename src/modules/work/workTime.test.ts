// Esecuzione: node --experimental-strip-types src/modules/work/workTime.test.ts
import assert from 'node:assert/strict'
import { advise, baseExit, DEFAULT_SETTINGS as S, exitTiers, paidOvertime, toHHMM, toMinutes } from './workTime.ts'

const entry = toMinutes('08:30')!
assert.equal(toHHMM(baseExit(entry, S)), '17:15') // 8h + 45 min di pausa
assert.equal(paidOvertime(29, S), 0)
assert.equal(paidOvertime(30, S), 30)
assert.equal(paidOvertime(40, S), 30)
assert.equal(paidOvertime(45, S), 45)
assert.equal(paidOvertime(59, S), 45)
assert.deepEqual(exitTiers(entry, S, 3).map((t) => toHHMM(t.at)), ['17:15', '17:45', '18:00', '18:15'])

// 40 minuti oltre: pagati 30, 10 gratis, restando altri 5 si arriva a 45.
const a = advise(entry, toMinutes('17:55')!, S)
assert.equal(a.phase, 'overtime')
if (a.phase === 'overtime') {
  assert.equal(a.paid, 30)
  assert.equal(a.unpaid, 10)
  assert.equal(a.nextPaid, 45)
  assert.equal(a.wait, 5)
}
// Prima della soglia: 10 minuti oltre, niente pagato, 20 minuti alla mezz'ora.
const b = advise(entry, toMinutes('17:25')!, S)
assert.ok(b.phase === 'overtime' && b.paid === 0 && b.wait === 20)
// Prima dell'uscita
const c = advise(entry, toMinutes('16:00')!, S)
assert.ok(c.phase === 'before' && c.minutesLeft === 75)
console.log('workTime: ok')
