import assert from 'node:assert/strict'
import test from 'node:test'
import { BELT, beltPoint, GALACTIC, rayleigh, orbitFrame, ellipsePoint } from '../src/visual/solarData.ts'

const DEG = Math.PI / 180
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const norm = (a) => Math.hypot(a[0], a[1], a[2])

// The asteroid belt must share the planetary reference plane. The planets build their
// orbits in the ecliptic XY plane (ellipsePoint), so a belt particle with zero
// inclination has to stay at z = 0 -- the old code placed it in the XZ plane instead,
// which is exactly the "asteroid belt stands vertical" defect.
test('a belt particle with zero inclination lies in the ecliptic plane', () => {
  for (let k = 0; k < 64; k++) {
    const E = k / 64 * Math.PI * 2
    const a = 2.2 + (k % 7) * .15
    const node = k * 1.13
    const p = beltPoint(a, .1, E, 0, node, [0, 0, 0])
    assert.ok(Math.abs(p[2]) < 1e-12, `z must vanish at zero inclination (E=${E}, node=${node})`)
    // the radial distance stays between perihelion and aphelion of the given ellipse
    const r = Math.hypot(p[0], p[1])
    assert.ok(r > a * (1 - .1) - 1e-9 && r < a * (1 + .1) + 1e-9, `radius ${r} outside the ellipse for a=${a}`)
  }
})

// Inclination must tilt the orbit out of the ecliptic by exactly inc. The orbit normal
// is the cross product of two in-plane points, and its angle to +z (the ecliptic pole)
// is the inclination by definition.
test('inclination tilts the belt orbit out of the ecliptic by exactly the given angle', () => {
  for (const inc of [0, 3, 5.145, 11.5, 30, 77]) {
    const node = .7, a = 2.8
    const p1 = beltPoint(a, 0, 0, inc * DEG, node, [0, 0, 0])
    const p2 = beltPoint(a, 0, Math.PI / 2, inc * DEG, node, [0, 0, 0])
    const n = [p1[1] * p2[2] - p1[2] * p2[1], p1[2] * p2[0] - p1[0] * p2[2], p1[0] * p2[1] - p1[1] * p2[0]]
    const tilt = Math.acos(Math.abs(dot(n, [0, 0, 1])) / norm(n)) / DEG
    assert.ok(Math.abs(tilt - inc) < 1e-9, `inclination ${inc} deg produced a ${tilt} deg tilt`)
  }
})

// The belt and the planets must agree on the plane, not merely each be self-consistent:
// an inclined belt orbit crosses the ecliptic exactly twice per revolution, and the
// ascending node sits where the planet pipeline would put one with the same node.
test('an inclined belt orbit and an inclined planet orbit share one reference plane', () => {
  const node = 2.1, inc = 11.5 * DEG
  // planet-style frame for a body with omega = 0 (perihelion at the node)
  const frame = orbitFrame({ inc: inc / DEG, node: node / DEG, peri: node / DEG })
  // z from the planet pipeline is Z*px + R*py, and Z = 0 when omega = 0, so z = py*sin(i)
  const ePlanet = ellipsePoint(2.8, 0, frame, Math.PI / 2, [0, 0, 0])
  const eBelt = beltPoint(2.8, 0, Math.PI / 2, inc, node, [0, 0, 0])
  assert.ok(Math.abs(ePlanet[2] - eBelt[2]) < 1e-12, `out-of-plane heights disagree: ${ePlanet[2]} vs ${eBelt[2]}`)
  const sPlanet = ellipsePoint(2.8, 0, frame, 0, [0, 0, 0])
  const sBelt = beltPoint(2.8, 0, 0, inc, node, [0, 0, 0])
  assert.ok(Math.abs(sPlanet[0] - sBelt[0]) < 1e-12 && Math.abs(sPlanet[1] - sBelt[1]) < 1e-12, 'nodes disagree')
  // the nodal crossings sit in the ecliptic (E = 0 and E = pi both give py = 0)
  const crossings = [0, .25, .5, .75].map(f => beltPoint(2.8, 0, f * Math.PI * 2, inc, node, [0, 0, 0])[2])
  assert.ok(Math.abs(crossings[0]) < 1e-12 && Math.abs(crossings[2]) < 1e-12, 'the nodal crossings must sit exactly in the ecliptic')
  assert.ok(crossings[1] > 0 && crossings[3] < 0, 'the orbit must pass to both sides of the ecliptic')
})

test('the galactic basis is orthonormal and puts 60.19 degrees between the two planes', () => {
  const { centre, l90, pole } = GALACTIC
  for (const [u, v] of [[centre, l90], [centre, pole], [l90, pole]]) {
    // the constants carry ~10 significant digits, so 1e-6 (~0.0001 deg) is the noise floor
    assert.ok(Math.abs(dot(u, v)) < 1e-5, `basis vectors must be orthogonal`)
  }
  for (const v of [centre, l90, pole]) assert.ok(Math.abs(norm(v) - 1) < 1e-5, 'basis vectors must be unit length')
  // the galactic pole is beta_NGP above the ecliptic, so the planes meet at 90 - beta
  const beta = Math.asin(pole[2]) / DEG
  assert.ok(Math.abs(beta - 29.8114) < .001, `north galactic pole latitude ${beta}`)
  const angle = Math.acos(Math.abs(pole[2])) / DEG
  assert.ok(Math.abs(angle - 60.1886) < .001, `ecliptic/galactic angle ${angle}`)
  // the centre must point at ecliptic longitude 266.84 and hang 5.54 degrees south
  const lambda = (Math.atan2(centre[1], centre[0]) / DEG + 360) % 360
  assert.ok(Math.abs(lambda - 266.8396) < .001, `galactic centre longitude ${lambda}`)
  assert.ok(Math.abs(Math.asin(centre[2]) / DEG + 5.5363) < .001, 'galactic centre latitude')
  // the Sun runs toward l = 90 (Cygnus); that axis sits at ecliptic longitude 347.34
  const cygnus = (Math.atan2(l90[1], l90[0]) / DEG + 360) % 360
  assert.ok(Math.abs(cygnus - 347.3399) < .001, `l=90 axis sits at ecliptic longitude ${cygnus}`)
  assert.ok(Math.abs(Math.asin(l90[2]) / DEG - 59.5742) < .001, 'l=90 axis ecliptic latitude')
  // right-handedness: centre x l90 must be the pole, not its negation
  const cross = [centre[1] * l90[2] - centre[2] * l90[1], centre[2] * l90[0] - centre[0] * l90[2], centre[0] * l90[1] - centre[1] * l90[0]]
  assert.ok(dot(cross, pole) > .999, 'the triple must be right-handed')
})

test('the Kirkwood gaps sit at the real jovian resonances and inside the belt', () => {
  const expected = [2.502, 2.825, 2.958]      // 3:1, 5:2, 7:3
  assert.deepEqual(BELT.gaps.map(g => g[0]), expected)
  for (const [au] of BELT.gaps) assert.ok(au > BELT.innerAU && au < BELT.outerAU, `gap ${au} outside the belt`)
  // boundaries follow the 4:1 and 2:1 resonances
  assert.ok(Math.abs(BELT.innerAU - 2.065) < 1e-9 && Math.abs(BELT.outerAU - 3.279) < 1e-9)
})

test('the Rayleigh sampler reproduces the observed inclination distribution', () => {
  const sigma = BELT.coreSigma * DEG
  let sum = 0, peak = 0, below = 0
  const n = 20000
  for (let k = 0; k < n; k++) {
    const inc = rayleigh(k / n, sigma)
    sum += inc
    peak = Math.max(peak, inc)
    if (inc < 10 * DEG) below++
  }
  // Rayleigh( sigma ) has its mode at sigma and its mean at sigma*sqrt(pi/2)
  assert.ok(Math.abs(sum / n / DEG - sigma * Math.sqrt(Math.PI / 2) / DEG) < .05, `mean ${sum / n / DEG} deg`)
  // the extreme of n Rayleigh draws is sigma*sqrt(2 ln n); with n = 20000 that is ~4.45 sigma
  assert.ok(peak / DEG < sigma / DEG * 5, `tail runs away: max ${peak / DEG} deg`)
  assert.ok(below / n > .85, `only ${below / n} of the core population is under 10 deg`)
})
