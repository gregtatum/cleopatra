import { combineReducers } from 'redux';
import { getCategoryByImplementation } from '../color-categories';

function getFunctionName(thread, stackIndex) {
  const frameIndex = thread.stackTable.frame[stackIndex];
  const funcIndex = thread.frameTable.func[frameIndex];
  return thread.stringTable.getString(thread.funcTable.name[funcIndex]);
}

function categoryColorStrategy(state = getCategoryByImplementation, action) {
  switch (action.type) {
    case 'CHANGE_FLAME_CHART_COLOR_STRATEGY':
      return action.categoryColorStrategy;
    default:
      return state;
  }
}

function labelingStrategy(state = getFunctionName, action) {
  switch (action.type) {
    case 'CHANGE_FLAME_CHART_LABELING_STRATEGY':
      return action.labelingStrategy;
    default:
      return state;
  }
}

export default combineReducers({ categoryColorStrategy, labelingStrategy });

export const getCategoryColorStrategy = state => state.flameChart.categoryColorStrategy;
export const getLabelingStrategy = state => state.flameChart.labelingStrategy;
