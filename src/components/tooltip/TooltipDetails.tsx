/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';

/*
 * This component enforces the HTML structure we use in the marker tooltips.
 * This is made necessary by our use of a grid layout that needs this strict
 * structure.
 *
 * It's used like this:
 *
 * <TooltipDetails>
 *   <TooltipDetail label="Property">Value of property</TooltipDetail>
 * </TooltipDetails>
 *
 * <TooltipDetail> won't render a line if the passed child is null, undefined,
 * or the empty string. This is to make it easier to pass random properties from
 * markers.
 *
 * <TooltipDetail> accepts also a non-native type as a child, like an HTML
 * element or even a react element. Even if that's theoretically possible with
 * the typing using fragments, it should never render more than 1 child.
 */

type DetailProps = {|
  +label: string,
  // Only one child is accepted.
  +children?: void | null | boolean | string | number | React.Element<any>,
|};

export function TooltipDetail({ label, children }: DetailProps) {
  if (children === null || children === undefined || children === '') {
    return null;
  }

  return (
    <>
      <div className="tooltipLabel">{label}:</div>
      {children}
    </>
  );
}

type TooltipDetailComponent = React.Element<typeof TooltipDetail>;
type Props = {|
  // This component accepts only TooltipDetail children.
  +children: React.ChildrenArray<TooltipDetailComponent | null>,
|};

export function TooltipDetails({ children }: Props) {
  return <div className="tooltipDetails">{children}</div>;
}
