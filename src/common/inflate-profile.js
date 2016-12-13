const categories = {
  '16': 'other',
  '32': 'css',
  '64': 'js',
  '128': 'gc',
  '256': 'cc',
  '512': 'network',
  '1024': 'graphics',
  '2048': 'storage',
  '4096': 'events',
  '9000': 'other',
};

/**
 * This helper is useful for debugging, but probably shouldn't be used in production.
 * The data format for the profile is condensed into columns of data. This function
 * pulls all of the pieces of data into a single object that is easy to inspect.
 * @param {object} thread
 * @param {number} stackIndex
 * @return {object} The inflated stack, with all of the information re-assembled.
 */
export function inflateStack(thread, stackIndex) {
  const frameIndex = thread.stackTable.frame[stackIndex];
  inflateFrame(thread, frameIndex);
  const funcIndex = thread.frameTable.func[frameIndex];
}

/**
 * This helper is useful for debugging, but probably shouldn't be used in production.
 * The data format for the profile is condensed into columns of data. This function
 * pulls all of the pieces of data into a single object that is easy to inspect.
 * @param {object} thread
 * @param {number} frameIndex
 * @return {object} The inflated frame, with all of the information re-assembled.
 */
export function inflateFrame(thread, frameIndex) {
  const implementation = inflateString(thread.frameTable.implementation[frameIndex]);
  const optimizations = thread.frameTable.optimizations[frameIndex];
  const line = thread.frameTable.line[frameIndex];
  const category = categories[thread.frameTable.category[frameIndex]];
  const func = inflateFunc(thread.frameTable.func[frameIndex]);
  const address = inflateString(thread, thread.frameTable.address[frameIndex]);
  return { implementation, optimizations, line, category, func, address };
}

export function inflateFunc(thread, funcIndex) {
  const name = inflateString(thread, thread.funcTable.name[funcIndex]);
  const resource = inflateResouce(thread.funcTable.resource[funcIndex]);
  const address = thread.funcTable.address[funcIndex];
  const isJS = thread.funcTable.isJS[funcIndex];
  return { name, resource, address, isJS };
}

export function inflateResouce(thread, resourceIndex) {
  const type = thread.resourceTable.type[resourceIndex];
  const name = inflateString(thread, thread.resourceTable.name[resourceIndex]);
  const lib = inflateString(thread, thread.resourceTable.lib[resourceIndex]);
  const icon = inflateString(thread, thread.resourceTable.icon[resourceIndex]);
  const addonId = inflateString(thread, thread.resourceTable.addonId[resourceIndex]);
  const host = inflateString(thread, thread.resourceTable.host[resourceIndex]);
  return { type, name, lib, icon, addonId, host };
}

/**
 * This shouldn't actually be needed, but the worker serialization removes features
 * from the stringTable class.
 * @param {object} thread
 * @param {number} stringIndex
 * @return {string} The inflated string.
 */
export function inflateString(thread, stringIndex) {
  if (stringIndex > -1) {
    return thread.stringTable._array[stringIndex];
  }
}
