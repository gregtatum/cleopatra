/**
 * The following functions are for debugging only. They fully reconstruct parts of the
 * profile data structure for easy debugging, as the profile data is structured as
 * large columns of indexed data. There is too much GC pressure from using lots of small
 * objects, so do not use these in production code.
 */

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
 * Build up an object with all of the stack information.
 * @param {object} thread - A single thread from the profile.
 * @param {number} stackIndex - Index of the stack in the stackTable.
 * @return {array} The inflated stack, with all of the information re-assembled.
 */
export function inflateStack(thread, stackIndex) {
  let nextStackIndex = stackIndex;
  const frames = [];
  do {
    const frameIndex = thread.stackTable.frame[nextStackIndex];
    frames.push(inflateFrame(thread, frameIndex));
    nextStackIndex = thread.stackTable.prefix[nextStackIndex];
  } while (nextStackIndex >= 0);
  return frames;
}

/**
 * Build up an object with all of the frame information.
 * @param {object} thread - A single thread from the profile.
 * @param {number} frameIndex - Index of the frame in the frameTable.
 * @return {object} The inflated frame, with all of the information re-assembled.
 */
export function inflateFrame(thread, frameIndex) {
  const implementation = inflateString(thread.frameTable.implementation[frameIndex]);
  const optimizations = thread.frameTable.optimizations[frameIndex];
  const line = thread.frameTable.line[frameIndex];
  const category = categories[thread.frameTable.category[frameIndex]];
  const func = inflateFunc(thread, thread.frameTable.func[frameIndex]);
  const address = inflateString(thread, thread.frameTable.address[frameIndex]);
  return { implementation, optimizations, line, category, func, address };
}

/**
 * Build up an object with all of the function information.
 * @param {object} thread - A single thread from the profile.
 * @param {number} funcIndex - Index of the function in the funcTable.
 * @return {object} The inflated function, with all of the information re-assembled.
 */
export function inflateFunc(thread, funcIndex) {
  const name = inflateString(thread, thread.funcTable.name[funcIndex]);
  const resource = inflateResouce(thread, thread.funcTable.resource[funcIndex]);
  const address = thread.funcTable.address[funcIndex];
  const isJS = thread.funcTable.isJS[funcIndex];
  return { name, resource, address, isJS };
}

/**
 * Build up an object with all of the resource information.
 * @param {object} thread - A single thread from the profile.
 * @param {number} resourceIndex - Index of the resource in the resourceTable.
 * @return {object} The inflated function, with all of the information re-assembled.
 */
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
 * @param {object} thread - A single thread from the profile.
 * @param {number} stringIndex - Index of the string in the stringTable.
 * @return {string} The inflated string.
 */
export function inflateString(thread, stringIndex) {
  if (stringIndex > -1) {
    return thread.stringTable._array[stringIndex];
  }
  return undefined;
}
