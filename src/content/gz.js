let Worker, workerPath;
if (process.env.NODE_ENV === 'test') {
  workerPath = __dirname + '/../../src/content/zee-worker.js';
  Worker = require('workerjs');
} else {
  workerPath = '/zee-worker.js';
  Worker = window.Worker;
}
const zeeWorker = new Worker(workerPath);
const zeeCallbacks = [];

zeeWorker.onmessage = function (msg) {
  zeeCallbacks[msg.data.callbackID][msg.data.type](msg.data.data);
  zeeCallbacks[msg.data.callbackID] = null;
};

// Neuters data's buffer, if data is a typed array.
export function compress(data, compressionLevel) {
  const arrayData = (typeof data === 'string') ? (new TextEncoder()).encode(data) : data;
  return new Promise(function (resolve, reject) {
    zeeWorker.postMessage({
      request: 'compress',
      data: arrayData,
      compressionLevel: compressionLevel,
      callbackID: zeeCallbacks.length,
    }, [arrayData.buffer]);
    zeeCallbacks.push({
      success: resolve,
      error: reject,
    });
  });
}

// Neuters data's buffer, if data is a typed array.
export function decompress(data) {
  return new Promise(function (resolve, reject) {
    zeeWorker.postMessage({
      request: 'decompress',
      data: data,
      callbackID: zeeCallbacks.length,
    }, [data.buffer]);
    zeeCallbacks.push({
      success: resolve,
      error: reject,
    });
  });
}
