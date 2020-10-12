/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */





/**
 * VirtualList implements a virtualized component. This means it doesn't
 * render only the items that are currently displayed, and makes long list
 * manageable in the Web platform.
 * This implementation has some unique features that make it especially
 * performant, but also comes with constraints.
 *
 * The items are organized in chunks:
 *
 * .
 * | 16 items
 * |
 * -
 * |
 * | 16 items
 * |
 * -
 * |
 * | 16 items
 * .
 *
 * Depending on the current scroll position, the logic decides which chunk(s)
 * will be rendered. If `disableOverscan` is false (this is the default) we
 * render more items before and after the visible part so that when scrolling
 * the user doesn't see a white background while the app catches up.
 *
 * Using chunks avoids the need to render often, and thus improves performance.
 */
import * as React from "react";
import classNames from "classnames";
import range from "array-range";

import { CssPixels } from "../../types/units";

type RenderItem<Item> = (arg0: Item, arg1: number, arg2: number) => React.ReactNode;

type VirtualListRowProps<Item> = {
  readonly renderItem: RenderItem<Item>;
  readonly item: Item;
  readonly index: number;
  readonly columnIndex: number;
  // These properties are not used directly, but are needed for strict equality
  // checks so that the components update correctly.
  // * `forceRenderControl` is used when we want to update one row or a few rows only,
  //   this is typically when the selection changes and both the old and the new
  //   selection need to be changed.
  //   It needs to change whenever the row should be updated, so it should be
  //   computed from the values that control these update.
  readonly forceRenderItem: string;
  // * `items` contains the full items, so that we update the whole list
  //   whenever the source changes. This is necessary because often `item` is a
  //   native value (eg a number), and shallow checking only `item` won't always
  //   give the expected behavior.
  readonly items: ReadonlyArray<Item>;
  // * `forceRender` is passed through directly from the main VirtualList
  //   component to the row as a way to update the full list for reasons
  //   unbeknownst to this component. This can be used for example in chart-like
  //   panels where we'd want to redraw if some source value necessary to the
  //   computation changes.
  readonly forceRender?: number | string;
};

class VirtualListRow<Item> extends React.PureComponent<VirtualListRowProps<Item>> {

  render() {
    const {
      renderItem,
      item,
      index,
      columnIndex
    } = this.props;
    return renderItem(item, index, columnIndex);
  }
}

type VirtualListInnerChunkProps<Item> = {
  readonly className: string;
  readonly renderItem: RenderItem<Item>;
  readonly items: ReadonlyArray<Item>;
  readonly specialItems: ReadonlyArray<Item | void>;
  readonly visibleRangeStart: number;
  readonly visibleRangeEnd: number;
  readonly columnIndex: number;
  readonly forceRender?: number | string;
};

class VirtualListInnerChunk<Item> extends React.PureComponent<VirtualListInnerChunkProps<Item>> {

  render() {
    const {
      className,
      renderItem,
      items,
      specialItems,
      visibleRangeStart,
      visibleRangeEnd,
      columnIndex,
      forceRender
    } = this.props;

    return <div className={className}>
        {range(visibleRangeStart, Math.max(visibleRangeStart, visibleRangeEnd)).map(i => {
        const item = items[i];

        // We compute forceRenderItem from the first position of item in the list,
        // and the number of occurrences. Indeed we want to rerender this
        // specific item whenever one of these values changes.
        const firstPosOfItem = specialItems.indexOf(item);
        const countOfItem = specialItems.reduce((acc, specialItem) => specialItem === item ? acc + 1 : acc, 0);
        const forceRenderItem = `${firstPosOfItem}|${countOfItem}`;

        return <VirtualListRow key={i} index={i} columnIndex={columnIndex} renderItem={renderItem} item={item} items={items} forceRenderItem={forceRenderItem} forceRender={forceRender} />;
      })}
      </div>;
  }
}

type VirtualListInnerProps<Item> = {
  readonly itemHeight: CssPixels;
  readonly className: string;
  readonly renderItem: RenderItem<Item>;
  readonly items: ReadonlyArray<Item>;
  readonly specialItems: ReadonlyArray<Item | void>;
  readonly visibleRangeStart: number;
  readonly visibleRangeEnd: number;
  readonly columnIndex: number;
  readonly containerWidth: CssPixels;
  readonly forceRender?: number | string;
};

class VirtualListInner<Item> extends React.PureComponent<VirtualListInnerProps<Item>> {

  _container: HTMLElement | null | undefined;

  _takeContainerRef = (element: HTMLDivElement | null | undefined) => {
    this._container = element;
  };

  getBoundingClientRect() {
    if (this._container) {
      return this._container.getBoundingClientRect();
    }
    return new DOMRect(0, 0, 0, 0);
  }

  render() {
    const {
      itemHeight,
      className,
      renderItem,
      items,
      specialItems,
      visibleRangeStart,
      visibleRangeEnd,
      columnIndex,
      containerWidth,
      forceRender
    } = this.props;

    const chunkSize = 16;
    const startChunkIndex = Math.floor(visibleRangeStart / chunkSize);
    const endChunkIndex = Math.ceil(visibleRangeEnd / chunkSize);
    const chunks = range(startChunkIndex, Math.max(startChunkIndex, endChunkIndex)).map(c => c * chunkSize);

    return <div className={className} ref={this._takeContainerRef} // Add padding to list height to account for overlay scrollbars.
    style={{
      height: `${(items.length + 1) * itemHeight}px`,
      width: columnIndex === 1 ? containerWidth : undefined
    }}>
        <div className={`${className}TopSpacer`} key={-1} style={{ height: Math.max(0, visibleRangeStart) * itemHeight + 'px' }} />
        {chunks.map(chunkStart => {
        return <VirtualListInnerChunk className={`${className}InnerChunk`} key={chunkStart} visibleRangeStart={Math.max(chunkStart, visibleRangeStart)} visibleRangeEnd={Math.min(chunkStart + chunkSize, visibleRangeEnd)} columnIndex={columnIndex} renderItem={renderItem} items={items} specialItems={specialItems} forceRender={forceRender} />;
      })}
      </div>;
  }
}

type VirtualListProps<Item> = {
  readonly itemHeight: CssPixels;
  readonly className: string;
  readonly renderItem: RenderItem<Item>;
  readonly items: ReadonlyArray<Item>;
  readonly focusable: boolean;
  readonly specialItems: ReadonlyArray<Item | void>;
  readonly onKeyDown: (arg0: KeyboardEvent) => void;
  readonly onCopy: (arg0: Event) => void;
  // Set `disableOverscan` to `true` when you expect a lot of updates in a short
  // time: this will render only the visible part, which makes each update faster.
  readonly disableOverscan: boolean;
  readonly columnCount: number;
  readonly containerWidth: CssPixels;
  // `forceRender` is passed through directly from the main VirtualList
  // component to the row as a way to update the full list for reasons
  // unbeknownst to this component. This can be used for example in chart-like
  // panels where we'd want to redraw if some source value necessary to the
  // computation changes.
  readonly forceRender?: number | string;
  // The next 3 props will be applied to the underlying DOM element.
  // They're important for accessibility (especially focus and navigation).
  readonly ariaLabel?: string;
  readonly ariaRole?: string;
  // Aria-activedescendant specifies the children's "virtual" focus.
  readonly ariaActiveDescendant?: null | string;
};

type Geometry = {
  // getBoundingClientRect in the Flow definitions is wrong, and labels the return values
  // as a ClientRect, and not a DOMRect. https://github.com/facebook/flow/issues/5475
  //
  // Account for that here:
  outerRect: DOMRect | ClientRect;
  innerRectY: CssPixels;
};

class VirtualList<Item> extends React.PureComponent<VirtualListProps<Item>> {

  _container: {current: HTMLDivElement | null;} = React.createRef();
  _inner: {current: VirtualListInner<Item> | null;} = React.createRef();
  _geometry: Geometry | null | undefined;

  componentDidMount() {
    document.addEventListener('copy', this._onCopy, false);
    const container = this._container.current;
    if (!container) {
      throw new Error('The container was assumed to exist while mounting The VirtualList.');
    }
    container.addEventListener('scroll', this._onScroll);
    this._onScroll(); // for initial size
  }

  componentWillUnmount() {
    document.removeEventListener('copy', this._onCopy, false);
    const container = this._container.current;
    if (!container) {
      throw new Error('The container was assumed to exist while unmounting The VirtualList.');
    }
    container.removeEventListener('scroll', this._onScroll);
  }

  _onScroll = () => {
    this._geometry = this._queryGeometry();
    this.forceUpdate();
  };

  _onCopy = (event: Event) => {
    if (document.activeElement === this._container.current) {
      this.props.onCopy(event);
    }
  };

  _queryGeometry(): Geometry | void {
    const container = this._container.current;
    const inner = this._inner.current;
    if (!container || !inner) {
      return undefined;
    }
    const outerRect = container.getBoundingClientRect();
    const innerRectY = inner.getBoundingClientRect().top;
    return { outerRect, innerRectY };
  }

  computeVisibleRange() {
    const {
      itemHeight,
      disableOverscan
    } = this.props;
    if (!this._geometry) {
      return { visibleRangeStart: 0, visibleRangeEnd: 100 };
    }
    const {
      outerRect,
      innerRectY
    } = this._geometry;
    const overscan = disableOverscan ? 0 : 25;
    const chunkSize = 16;
    let visibleRangeStart = Math.floor((outerRect.top - innerRectY) / itemHeight) - overscan;
    let visibleRangeEnd = Math.ceil((outerRect.bottom - innerRectY) / itemHeight) + overscan;
    if (!disableOverscan) {
      visibleRangeStart = Math.floor(visibleRangeStart / chunkSize) * chunkSize;
      visibleRangeEnd = Math.ceil(visibleRangeEnd / chunkSize) * chunkSize;
    }
    return { visibleRangeStart, visibleRangeEnd };
  }

  scrollItemIntoView(itemIndex: number, offsetX: CssPixels) {
    const container = this._container.current;
    if (!container) {
      return;
    }
    const itemTop = itemIndex * this.props.itemHeight;
    const itemBottom = itemTop + this.props.itemHeight;

    if (container.scrollTop > itemTop) {
      container.scrollTop = itemTop;
    } else if (container.scrollTop + container.clientHeight < itemBottom) {
      container.scrollTop = Math.min(itemTop, itemBottom - container.clientHeight);
    }

    const interestingWidth = 400;
    const itemLeft = offsetX;
    const itemRight = itemLeft + interestingWidth;

    if (container.scrollLeft > itemLeft) {
      container.scrollLeft = itemLeft;
    } else if (container.scrollLeft + container.clientWidth < itemRight) {
      container.scrollLeft = Math.min(itemLeft, itemRight - container.clientWidth);
    }
  }

  focus() {
    const container = this._container.current;
    if (container) {
      container.focus();
    }
  }

  render() {
    const {
      itemHeight,
      className,
      renderItem,
      items,
      focusable,
      specialItems,
      onKeyDown,
      containerWidth,
      forceRender,
      ariaRole,
      ariaLabel,
      ariaActiveDescendant
    } = this.props;
    const columnCount = this.props.columnCount || 1;
    const {
      visibleRangeStart,
      visibleRangeEnd
    } = this.computeVisibleRange();
    return <div className={className} ref={this._container} tabIndex={focusable ? 0 : -1} onKeyDown={onKeyDown} role={ariaRole} aria-label={ariaLabel} aria-activedescendant={ariaActiveDescendant}>
        <div className={`${className}InnerWrapper`}>
          {range(columnCount).map(columnIndex => <VirtualListInner className={classNames(`${className}Inner`, `${className}Inner${columnIndex}`)} visibleRangeStart={Math.max(0, visibleRangeStart)} visibleRangeEnd={Math.min(items.length, visibleRangeEnd)} itemHeight={itemHeight} renderItem={renderItem} items={items} specialItems={specialItems} columnIndex={columnIndex} containerWidth={containerWidth} forceRender={forceRender} key={columnIndex} ref={columnIndex === 0 ? this._inner : undefined} />)}
        </div>
      </div>;
  }
}

export default VirtualList;