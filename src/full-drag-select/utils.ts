// Taken from http://stackoverflow.com/questions/1068834/object-comparison-in-javascript and modified slightly
export function areObjectsEqual(x, y) {
  let p;
  const leftChain = [];
  const rightChain = [];

  // Remember that NaN === NaN returns false
  // and isNaN(undefined) returns true
  if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
      return true;
  }

  // Compare primitives and functions.
  // Check if both arguments link to the same object.
  // Especially useful on step when comparing prototypes
  if (x === y) {
      return true;
  }

  // Works in case when functions are created in constructor.
  // Comparing dates is a common scenario. Another built-ins?
  // We can even handle functions passed across iframes
  if ((typeof x === 'function' && typeof y === 'function') ||
      (x instanceof Date && y instanceof Date) ||
      (x instanceof RegExp && y instanceof RegExp) ||
      (x instanceof String && y instanceof String) ||
      (x instanceof Number && y instanceof Number)) {
      return x.toString() === y.toString();
  }

  if (x instanceof Map && y instanceof Map) {
      return areMapsEqual(x, y);
  }

  // At last checking prototypes as good a we can
  if (!(x instanceof Object && y instanceof Object)) {
      return false;
  }

  if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      return false;
  }

  if (x.constructor !== y.constructor) {
      return false;
  }

  if (x.prototype !== y.prototype) {
      return false;
  }

  // Check for infinitive linking loops
  if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      return false;
  }

  // Quick checking of one object being a subset of another.
  for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
          return false;
      } else if (typeof y[p] !== typeof x[p]) {
          return false;
      }
  }

  for (p in x) { //eslint-disable-line guard-for-in
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
          return false;
      } else if (typeof y[p] !== typeof x[p]) {
          return false;
      }

      switch (typeof (x[p])) {
      case 'object':
      case 'function':

          leftChain.push(x);
          rightChain.push(y);

          if (!areObjectsEqual(x[p], y[p])) {
              return false;
          }

          leftChain.pop();
          rightChain.pop();
          break;

      default:
          if (x[p] !== y[p]) {
              return false;
          }
          break;
      }
  }

  return true;
}

export function areMapsEqual(a, b) {
  if (a.size !== b.size) {
      return false;
  }

  for (const [key, value] of a) {
      if (!b.has(key)) {
          return false;
      }

      if (!areObjectsEqual(value, b.get(key))) {
          return false;
      }
  }

  return true;
}