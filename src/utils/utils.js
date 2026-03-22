export function mulV(lhs, rhs) {
  return lhs.map((_, i) => lhs[i] * rhs[i]);
}
export function mulS(lhs, scalar) {
  return lhs.map((_, i) => lhs[i] * scalar);
}
export function addV(lhs, rhs) {
  return lhs.map((_, i) => lhs[i] + rhs[i]);
}
export function subV(lhs, rhs) {
  return lhs.map((_, i) => lhs[i] - rhs[i]);
}
export function divV(lhs, rhs) {
  return lhs.map((_, i) => lhs[i] / rhs[i]);
}
export function floorV(lhs) {
  return lhs.map((v) => Math.floor(v));
}
export function dotV(lhs, rhs) {
  return lhs.map((v, i) => v * rhs[i]).reduce((s, v) => s + v, 0);
}
export function lenV(lhs) {
  return Math.sqrt(dotV(lhs, lhs));
}
export function normalizeV(lhs) {
  const len = lenV(lhs);
  return mulS(lhs, len < 1e-5 ? 1 : 1 / len);
}
export function equalV(lhs, rhs) {
  return lhs.every((v, i) => Math.abs(lhs[i] - rhs[i]) < 1e-5);
}
export function distToPlane(point, planePoint, planeNormal) {
  const toPoint = subV(point, planePoint);
  return dotV(toPoint, planeNormal);
}

export function getChunkPos(wpos, csize) {
  return floorV(divV(wpos, csize));
}
export function checkInside(wpos, rstart, rsize) {
  const rend = addV(rstart, rsize);
  return wpos.every((v, i) => v >= rstart[i] && v < rend[i]);
}
export function jpos2key(lhs) {
  return lhs.join("_");
}
export function jkey2pos(key) {
  return key.split("_").map((v) => +v);
}
export function polyHash(arr, p = 31, m = 10 ** 9 + 7) {
  const hash = arr.reduce((s, v) => (s * p + v) % m);
  return hash;
}
export function createCombinations(valuesArr) {
  // [[a,b], [1,2]] => [a,1],[b,1],[a,2],[b,2]
  return valuesArr.reduce(
    (combs, vs) => vs.map((v) => combs.map((comb) => [...comb, v])).flat(),
    [[]],
  );
}
export function jdeepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}
export function jdeepEqual(lhs, rhs) {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}
export function jgcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}
export function jlcm(a, b) {
  if (a === 0 || b === 0) {
    return 0;
  }
  const gcd = jgcd(a, b);
  return Math.abs(a * b) / gcd;
}
