import { combineReducers } from 'redux';
import { getCategoryByImplementation } from '../color-categories';

function getFunctionName(thread, stackIndex) {
  const frameIndex = thread.stackTable.frame[stackIndex];
  const funcIndex = thread.frameTable.func[frameIndex];
  return thread.stringTable.getString(thread.funcTable.name[funcIndex]);
}

function getImplementationName(thread, stackIndex) {
  const frameIndex = thread.stackTable.frame[stackIndex];
  const implementation = thread.frameTable.implementation[frameIndex];
  if (implementation) {
    return implementation === 'baseline' ? 'JS Baseline' : 'JS Ion';
  }
  const funcIndex = thread.frameTable.func[frameIndex];
  return thread.funcTable.isJS[funcIndex] ? 'JS Interpreter' : 'Platform';
}

function categoryColorStrategy(state = getCategoryByImplementation, action) {
  switch (action.type) {
    case 'CHANGE_FLAME_CHART_COLOR_STRATEGY':
      return action.categoryColorStrategy;
    default:
      return state;
  }
}

function labelingStrategy(state = getImplementationName, action) {
  switch (action.type) {
    case 'CHANGE_FLAME_CHART_LABELING_STRATEGY':
      return action.labelingStrategy;
    default:
      return state;
  }
}

export default combineReducers({ categoryColorStrategy, labelingStrategy });

export const getFlameChart = state => state.flameChart;
export const getCategoryColorStrategy = state => getFlameChart(state).categoryColorStrategy;
export const getLabelingStrategy = state => getFlameChart(state).labelingStrategy;
