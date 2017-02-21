function categoryColorStrategy(state = getCategoryByImplementation, action) {
  switch (action.type) {
    case 'CHANGE_FLAME_CHART_COLOR_STRATEGY':
      return action.getCategory;
    default:
      return state;
  }
}

function labelingStrategy(state = getCategoryByImplementation, action) {
  switch (action.type) {
    case 'CHANGE_FLAME_CHART_NAMING_STRATEGY':
      return action.getCategory;
    default:
      return state;
  }
}
