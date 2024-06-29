/* eslint-disable no-invalid-this */
const { MAX_SAFE_INTEGER } = Number;
const iteratorSymbol = Symbol.iterator;
const asyncIteratorSymbol = Symbol.asyncIterator;
const IntrinsicArray = Array;
const tooLongErrorMessage =
  "Input is too long and exceeded Number.MAX_SAFE_INTEGER times.";

function isConstructor(obj) {
  // eslint-disable-next-line
  if (obj != null) {
    const prox = new Proxy(obj, {
      construct() {
        return prox;
      }
    });
    try {
      new prox();

      return true;
    }
    catch (err) {
      return false;
    }
  }
  else {
    return false;
  }
}

/**
 * TODO: use Array.fromAsync
 *
 * https://github.com/es-shims/array-from-async/blob/main/index.mjs
 */
export async function fromAsync(items, mapfn, thisArg) {
  const itemsAreIterable = (
    asyncIteratorSymbol in items ||
    iteratorSymbol in items
  );

  if (itemsAreIterable) {
    const result = isConstructor(this)
      ? new this()
      : IntrinsicArray(0);

    let i = 0;

    for await (const v of items) {
      if (i > MAX_SAFE_INTEGER) {
        throw TypeError(tooLongErrorMessage);
      }

      else if (mapfn) {
        result[i] = await mapfn.call(thisArg, v, i);
      }

      else {
        result[i] = v;
      }

      i++;
    }

    result.length = i;

    return result;
  }


  // In this case, the items are assumed to be an arraylike object with
  // a length property and integer properties for each element.
  const { length } = items;
  const result = isConstructor(this)
    ? new this(length)
    : IntrinsicArray(length);

  let i = 0;

  while (i < length) {
    if (i > MAX_SAFE_INTEGER) {
      throw TypeError(tooLongErrorMessage);
    }

    const v = await items[i];

    if (mapfn) {
      result[i] = await mapfn.call(thisArg, v, i);
    }

    else {
      result[i] = v;
    }

    i++;
  }

  result.length = i;

  return result;
}
