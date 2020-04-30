import { $Call, $ReadOnly } from "utility-types";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import * as React from "react";
import { connect } from "react-redux";
import { Dispatch, State, ThunkAction, Action } from "../types/store";

type MapStateToProps<OwnProps extends Object, StateProps extends Object> = (state: State, ownProps: OwnProps) => StateProps;

type MapDispatchToProps<OwnProps extends Object, DispatchProps extends Object> = (dispatch: Dispatch, ownProps: OwnProps) => DispatchProps | DispatchProps;

type MergeProps<StateProps, DispatchProps extends Object, OwnProps extends Object, Props extends Object> = (stateProps: StateProps, dispatchProps: DispatchProps, ownProps: OwnProps) => Props;

type ConnectOptions = {
  pure?: boolean;
  areStatesEqual?: boolean;
  areOwnPropsEqual?: boolean;
  areStatePropsEqual?: boolean;
  areMergedPropsEqual?: boolean;
  storeKey?: boolean;
  forwardRef?: boolean;
};

/**
 * This function type describes the operation of taking a simple action creator, and
 * just returning it.
 */
type WrapActionCreator<Args> = ( // Take as input an action creator.
arg0 // If this function matches the above signature, do not modify it.
: (...args: Args) => Action) => (...args: Args) => Action;

/**
 * This function type describes the operation of removing the (Dispatch, GetState) from
 * a thunk action creator.
 * For instance:
 *   (...Args) => (Dispatch, GetState) => Returns
 *
 * Gets transformed into:
 *   (...Args) => Returns
 */
type WrapThunkActionCreator<Args, Returns> = ( // Take as input a ThunkAction.
arg0 // Return the wrapped action.
: (...args: Args) => ThunkAction<Returns>) => (...args: Args) => Returns;

/**
 * This type takes a Props object and wraps each function in Redux's connect function.
 * It is primarily exported for testing as explicitConnect should do this for us
 * automatically. It leaves normal action creators alone, but with ThunkActions it
 * removes the (Dispatch, GetState) part of a ThunkAction.
 */
export type WrapDispatchProps<DispatchProps extends Object> = $ObjMap<DispatchProps, WrapActionCreator<any> & WrapThunkActionCreator<any, any>>;

/**
 * This type takes a single action creator, and returns the type as if the dispatch
 * function was wrapped around it. It leaves normal action creators alone, but with
 * ThunkActions it removes the (Dispatch, GetState) part of a ThunkAction.
 */
export type WrapFunctionInDispatch<Fn extends Function> = $Call<WrapActionCreator<any> & WrapThunkActionCreator<any, any>, Fn>;

type ExplicitConnectOptions<OwnProps extends Object, StateProps extends Object, DispatchProps extends Object> = {
  mapStateToProps?: MapStateToProps<OwnProps, StateProps>;
  mapDispatchToProps?: MapDispatchToProps<OwnProps, DispatchProps>;
  mergeProps?: MergeProps<StateProps, DispatchProps, OwnProps, ConnectedProps<OwnProps, StateProps, DispatchProps>>;
  options?: ConnectOptions;
  component: React.ComponentType<ConnectedProps<OwnProps, StateProps, DispatchProps>>;
};

export type ConnectedProps<OwnProps extends Object, StateProps extends Object, DispatchProps extends Object> = $ReadOnly<OwnProps & StateProps & DispatchProps>;

export type ConnectedComponent<OwnProps extends Object, StateProps extends Object, DispatchProps extends Object> = React.ComponentType<ConnectedProps<OwnProps, StateProps, DispatchProps>> | React.StatelessFunctionalComponent<ConnectedProps<OwnProps, StateProps, DispatchProps>>;

/**
 * react-redux's connect function is too polymorphic and problematic. This function
 * is a wrapper to simplify the typing of connect and make it more explicit, and
 * less magical.
 */
export default function explicitConnect<OwnProps extends Object, StateProps extends Object, DispatchProps extends Object>(connectOptions: ExplicitConnectOptions<OwnProps, StateProps, DispatchProps>): React.ComponentType<OwnProps> {
  const {
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    options,
    component
  } = connectOptions;

  // Opt out of the flow-typed definition of react-redux's connect, and use our own.
  return (connect as any)(mapStateToProps, mapDispatchToProps, mergeProps, options)(component);
}
