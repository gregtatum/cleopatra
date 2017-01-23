import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import reducers from './reducers';
import threadDispatcher from '../common/thread-middleware';
import messages from './messages';
import handleMessages from '../common/message-handler';

/**
 * Isolate the store creation into a function, so that it can be used outside of the
 * app's execution context, e.g. for testing.
 * @return {object} Redux store.
 */
export default function initializeStore() {
  let Worker, workerPath;
  if (process.env.NODE_ENV === 'test') {
    workerPath = __dirname + '/../../dist/worker.js';
    Worker = require('workerjs');
  } else {
    workerPath = '/worker.js';
    Worker = window.Worker;
  }
  const worker = new Worker(workerPath);

  const store = createStore(
    combineReducers(Object.assign({}, reducers, {
      worker,
    })),
    applyMiddleware(...[
      thunk,
      threadDispatcher(worker, 'toWorker'),
      process.env.NODE_ENV === 'development'
        ? createLogger({titleFormatter: action => `content action ${action.type}`})
        : null,
    ].filter(fn => fn)));

  handleMessages(worker, store, messages);

  return store;
}
