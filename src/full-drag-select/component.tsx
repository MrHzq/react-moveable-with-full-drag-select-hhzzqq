import React from "react";
// optional polyfill: Optionally add the polyfill and make sure it's
// required on your dependendencies for unsupporting browsers
import "intersection-observer";

import {
  MouseDragDirection,
  SelectorPosition,
  DragSelectableProps,
  DragSelectableState
} from "./types";
import { areObjectsEqual } from "./utils";

export default class ReactDragSelectable extends React.PureComponent<
  DragSelectableProps,
  DragSelectableState
> {
  state: DragSelectableState = {
    containerTop: 0,
    containerLeft: 0,
    onScreenElements: [],
    observerIdsCache: []
  };

  private selector: HTMLElement | null = null;
  private previousCursorPos: { x: number; y: number } = { x: 0, y: 0 };
  private initialCursorPos: { x: number; y: number } = { x: 0, y: 0 };
  private newCursorPos: { x: number; y: number } = { x: 0, y: 0 };
  private initialScroll: { x: number; y: number } = { x: 0, y: 0 };
  private mouseInteraction: boolean = false as boolean;
  private zoom: number = 1 as number;
  private break = false;
  private handleRef: any = (r: any) => {
    this.selector = r;
  };
  private autoScrollSpeed: number = 1 as number;

  componentDidMount(): void {
    const { container } = this.props;
    console.log("componentDidMount container", container);
    if (container) {
      container.addEventListener("mousedown", this.handleMouseDown);
    }
  }

  UNSAFE_componentWillReceiveProps(
    nextProps: Readonly<DragSelectableProps>,
    nextContext: any
  ): void {
    console.log("UNSAFE_componentWillReceiveProps");
    if (nextProps.container && nextProps.container !== this.props.container) {
      nextProps.container.addEventListener("mousedown", this.handleMouseDown);

      // set container offset if container is not Document
      if (nextProps.container instanceof HTMLElement) {
        const containerRect = nextProps.container
          .getBoundingClientRect()
          .toJSON();
        this.setState({
          containerTop: containerRect.top,
          containerLeft: containerRect.left
        });
      }
    }

    if (!areObjectsEqual(nextProps.selectables, this.props.selectables)) {
      Object.keys(nextProps.selectables).forEach(id => {
        const element = nextProps.selectables[id];
        if (this.state.observerIdsCache.indexOf(id) === -1 && element) {
          this.setState(
            {
              observerIdsCache: [...this.state.observerIdsCache, id]
            },
            () => {
              this.observer.observe(element);
            }
          );
        }
      });
    }
  }

  private observer = new IntersectionObserver(entries => {
    console.log("called observer");
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("element__selectable");
        if (
          this.state.onScreenElements.indexOf(entry.target as
            | HTMLElement
            | SVGAElement) === -1
        ) {
          this.setState(
            {
              onScreenElements: this.state.onScreenElements.concat(
                entry.target as HTMLElement | SVGAElement
              ) // [...this.state.onScreenElements, entry.target as HTMLElement | SVGAElement],
            },
            () => {
              if (typeof this.props.onVisibleElementsChange === "function") {
                this.props.onVisibleElementsChange(this.state.onScreenElements);
              }
            }
          );
        }
      } else {
        entry.target.classList.remove("element__selectable");
        this.setState(
          {
            onScreenElements: this.state.onScreenElements.filter(
              e => e !== entry.target
            )
          },
          () => {
            if (typeof this.props.onVisibleElementsChange === "function") {
              this.props.onVisibleElementsChange(this.state.onScreenElements);
            }
          }
        );
      }
    });
  });

  componentWillUnmount(): void {
    const { container } = this.props;
    if (container) {
      container.removeEventListener("mousedown", this.handleMouseDown);
    }

    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private handleMouseDown: any = (event: MouseEvent) => {
    console.log("handleMouseDown event", event);
    if (this.props.locked) {
      return;
    }
    if (event.buttons === 1) {
      this.handleClick(event);
      // eslint-disable-next-line no-underscore-dangle
      this._startUp(event);
    } else {
      event.preventDefault();
      // eslint-disable-next-line no-underscore-dangle
      this._end(event);
    }
  };

  isRightClick = (event: any) => {
    let isRightMB = false;
    if ("which" in event) {
      // Gecko (Firefox), WebKit (Safari/Chrome) & Opera
      isRightMB = event.which === 3;
    } else if ("button" in event) {
      // IE, Opera
      isRightMB = event.button === 2;
    }
    return isRightMB;
  };

  handleClick = (event: MouseEvent) => {
    if (this.mouseInteraction) {
      alert("xxx");
    }

    if (this.isRightClick(event)) {
      return;
    }

    const { selectAbleClass, onSelectChange } = this.props;

    const target = event.target as HTMLElement | SVGAElement;
    if (typeof onSelectChange === "function") {
      const newTarget =
        target && target.classList.contains(selectAbleClass) ? target : null;
      onSelectChange(newTarget, event);
    }
  };

  private _startUp: any = (event: MouseEvent) => this.startUp(event);
  private startUp(event: MouseEvent) {
    if (event.type === "touchstart") {
      event.preventDefault();
    }

    if (this.props.locked) {
      return;
    }

    if (this.isRightClick(event)) {
      return;
    }

    this.getStartingPositions(event);

    if (this.props.container) {
      /*eslint-disable no-underscore-dangle*/
      this.props.container.removeEventListener("mousedown", this._startUp);
      this.props.container.addEventListener("mousemove", this._handleMove);
      this.props.container.addEventListener("mouseup", this._end);
      /*eslint-enable*/
    }
  }

  _handleMove: any = (event: MouseEvent) => this.handleMove(event);
  handleMove = (event: MouseEvent) => {
    const { onMultipleSelectChange } = this.props;

    if (event.buttons === 1) {
      event.preventDefault();
      event.stopPropagation();
      // eslint-disable-next-line no-underscore-dangle
      const selectorPos = this._getPosition(event);

      const elements = this.getElementsInArea(selectorPos);
      if (typeof onMultipleSelectChange === "function") {
        onMultipleSelectChange(elements, event);
      }

      if (this.selector) {
        this.selector.className = "";
        this.selector.classList.add("lf__selector");
        this.selector.classList.add(`mouse__drag_${selectorPos.direction}`);
        this.selector.style.display = "block"; // hidden unless moved, fix for issue #8

        this.updatePos(this.selector, selectorPos);
      }

      // scroll area if area is scrollable
      // this.autoScroll(event);
    }
  };

  _getPosition = (event: MouseEvent) => {
    // eslint-disable-next-line no-underscore-dangle
    const cursorPosNew = this._getCursorPos(event, this.props.container);
    const scrollNew = this.getScroll(this.props.container);

    // save for later retrieval
    this.newCursorPos = cursorPosNew;

    // if area or document is scrolled those values have to be included aswell
    const scrollAmount = {
      x: scrollNew.x - this.initialScroll.x,
      y: scrollNew.y - this.initialScroll.y
    };

    const selectorPos: SelectorPosition = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      direction: "LeftUp"
    };

    const isAboveX = cursorPosNew.x > this.initialCursorPos.x - scrollAmount.x;
    const isAboveY = cursorPosNew.y > this.initialCursorPos.y - scrollAmount.y;

    selectorPos.x = isAboveX
      ? this.initialCursorPos.x + this.initialScroll.x
      : cursorPosNew.x + scrollNew.x;
    selectorPos.w = isAboveX
      ? cursorPosNew.x - this.initialCursorPos.x + scrollAmount.x
      : this.initialCursorPos.x - cursorPosNew.x - scrollAmount.x;

    selectorPos.y = isAboveY
      ? this.initialCursorPos.y + this.initialScroll.y
      : cursorPosNew.y + scrollNew.y;
    selectorPos.h = isAboveY
      ? cursorPosNew.y - this.initialCursorPos.y + scrollAmount.y
      : this.initialCursorPos.y - cursorPosNew.y - scrollAmount.y;

    let direction;
    direction = cursorPosNew.x - this.initialCursorPos.x > 0 ? "Left" : "Right";
    direction += cursorPosNew.y - this.initialCursorPos.y > 0 ? "Down" : "Up";
    selectorPos.direction = direction as MouseDragDirection;

    return selectorPos;
  };

  getStartingPositions = (event: MouseEvent) => {
    this.initialCursorPos = this.getCursorPos(
      event,
      this.props.container,
      true
    );
    this.newCursorPos = this.initialCursorPos;
    this.initialScroll = this.getScroll(this.props.container);

    const selectorPos: SelectorPosition = {
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      direction: "LeftUp"
    };
    selectorPos.x = this.initialCursorPos.x + this.initialScroll.x;
    selectorPos.y = this.initialCursorPos.y + this.initialScroll.y;
    selectorPos.w = 0;
    selectorPos.h = 0;
    this.updatePos(this.selector as HTMLElement, selectorPos);
  };

  getCursorPos = (
    event: MouseEvent,
    _area: Document | HTMLElement | null,
    ignoreScroll: boolean
  ) => {
    if (!event) {
      return { x: 0, y: 0 };
    }

    const area = _area || this.props.container;
    // eslint-disable-next-line no-underscore-dangle
    const pos = this._getCursorPos(event, area);
    const scroll = ignoreScroll ? { x: 0, y: 0 } : this.getScroll(area);

    if (pos) {
      return {
        x: pos.x + scroll.x,
        y: pos.y + scroll.y
      };
    }

    return { x: 0, y: 0 };
  };

  _getCursorPos = (event: MouseEvent, area: HTMLElement | Document | null) => {
    if (!event) {
      return { x: 0, y: 0 };
    }

    const cPos = {
      // event.clientX/Y fallback for <IE8
      x: event.pageX || event.clientX,
      y: event.pageY || event.clientY
    };

    const areaRect = this.getAreaRect(area || document);
    const docScroll = this.getScroll(); // needed when document is scrollable but area is not
    if (areaRect) {
      return {
        // if it’s constrained in an area the area should be substracted calculate
        x:
          (cPos.x - areaRect.left - docScroll.x + this.state.containerLeft) /
          this.zoom,
        y:
          (cPos.y - areaRect.top - docScroll.y + this.state.containerTop) /
          this.zoom
      };
    }

    return { x: 0, y: 0 };
  };

  getScroll = (area?: HTMLElement | Document | null) => {
    const body = {
      top:
        document.body.scrollTop > 0
          ? document.body.scrollTop
          : document.documentElement.scrollTop,
      left:
        document.body.scrollLeft > 0
          ? document.body.scrollLeft
          : document.documentElement.scrollLeft
    };

    let x;
    let y;

    // when the rectangle is bound to the document, no scroll is needed
    if (area && area instanceof HTMLElement && area.scrollTop >= 0) {
      y = area.scrollTop;
    } else {
      y = body.top;
    }

    if (area && area instanceof HTMLElement && area.scrollLeft >= 0) {
      x = area.scrollLeft;
    } else {
      x = body.left;
    }

    return { x, y };
  };

  getAreaRect = (area: HTMLElement | Document | null) => {
    if (area === document) {
      const size = {
        y:
          area.documentElement.clientHeight > 0
            ? area.documentElement.clientHeight
            : window.innerHeight,
        x:
          area.documentElement.clientWidth > 0
            ? area.documentElement.clientWidth
            : window.innerWidth
      };
      return {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: size.x,
        height: size.y
      };
    } else if (area instanceof HTMLElement) {
      const rect = area.getBoundingClientRect();
      return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: area.clientWidth || rect.width,
        height: area.clientHeight || rect.height
      };
    }

    return null;
  };

  /**
   * Check if the selector is near an edge of the area
   * @param {Object} [event] event object.
   * @param {(HTMLElement|SVGElement)} area the area.
   * @return {('top'|'bottom'|'left'|'right'|false)}
   */
  isCursorNearEdge = (
    event: MouseEvent,
    area: HTMLElement | Document | null
  ) => {
    // eslint-disable-next-line no-underscore-dangle
    const cursorPosition = this._getCursorPos(event, area);
    const areaRect = this.getAreaRect(document);
    if (!areaRect) {
      return false;
    }
    const tolerance = {
      x: Math.min(areaRect.width / 10, 30),
      y: Math.min(areaRect.height / 10, 30)
    };

    if (cursorPosition.y < tolerance.y) {
      return "top";
    } else if (areaRect.height - cursorPosition.y < tolerance.y) {
      return "bottom";
    } else if (areaRect.width - cursorPosition.x < tolerance.x) {
      return "right";
    } else if (cursorPosition.x < tolerance.x) {
      return "left";
    }
    return false;
  };

  /**
   * Automatically Scroll the area by selecting
   * @param {Object} event – event object.
   * @private
   */
  autoScroll = (event: MouseEvent) => {
    const edge = this.isCursorNearEdge(event, this.props.container);
    const docEl =
      document &&
      document.documentElement &&
      document.documentElement.scrollTop &&
      document.documentElement;

    /*eslint-disable no-underscore-dangle*/
    const _area = document.documentElement; // this.props.container === document ? docEl || document.body : this.props.container;
    if (!_area) {
      return;
    }
    if (edge === "top" && _area.scrollTop > 0) {
      _area.scrollTop -= Number(this.autoScrollSpeed);
    } else if (edge === "bottom") {
      _area.scrollTop += Number(this.autoScrollSpeed);
    } else if (edge === "left" && _area.scrollLeft > 0) {
      _area.scrollLeft -= Number(this.autoScrollSpeed);
    } else if (edge === "right") {
      _area.scrollLeft += Number(this.autoScrollSpeed);
    }
    /*eslint-enable*/
  };

  updatePos = (node: HTMLElement, pos: SelectorPosition) => {
    node.style.left = pos ? pos.x + "px" : "0";
    node.style.top = pos.y + "px";
    node.style.width = pos.w + "px";
    node.style.height = pos.h + "px";
    return node;
  };

  _end: any = (event: MouseEvent) => this.reset(event, false);
  reset = (event: MouseEvent, withCallback: boolean) => {
    /*eslint-disable no-underscore-dangle*/
    if (this.props.container) {
      this.previousCursorPos = this._getCursorPos(event, this.props.container);
      this.props.container.removeEventListener("mouseup", this._end);
      this.props.container.removeEventListener("mousemove", this._handleMove);
      this.props.container.addEventListener("mousedown", this._startUp);
    }

    if (this.break) {
      return false;
    }

    this.resetSelector();

    // debounce in order "onClick" to work
    setTimeout(() => {
      this.mouseInteraction = false;
    }, 100);

    return null;
  };

  private resetSelector() {
    if (this.selector) {
      this.selector.style.width = "0";
      this.selector.style.height = "0";
      this.selector.style.left = "0";
      this.selector.style.right = "0";
      this.selector.style.top = "0";
      this.selector.style.display = "none";
    }
  }

  public getElementsInArea = ({ x, y, w, h, direction }: SelectorPosition) => {
    const crossingSelect = direction === "RightUp" || direction === "RightDown";
    return this.state.onScreenElements.filter(element => {
      const bound = element.getBoundingClientRect().toJSON();

      const scrollLeft =
        window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop;

      if (
        bound.left &&
        bound.top &&
        bound.width &&
        bound.height &&
        bound.right &&
        bound.bottom
      ) {
        bound.x += scrollLeft;
        bound.left += scrollLeft;
        bound.y += scrollTop;
        bound.top += scrollTop;
        bound.bottom += scrollTop;
        bound.right += scrollLeft;

        if (crossingSelect) {
          const notInterSect =
            bound.left > x + w ||
            bound.right < x ||
            bound.top > y + h ||
            bound.bottom < y;
          if (!notInterSect) {
            return element;
          }
        } else if (
          bound.left > x &&
          bound.left + bound.width < x + w &&
          (bound.top > y && bound.top + bound.height < y + h)
        ) {
          return element;
        }
      }

      return null;
    });
  };

  render = () => {
    return (
      <React.Fragment>
        <div
          ref={this.handleRef}
          id="lf-selector"
          style={{ display: "none" }}
        />
        <div
          style={{
            position: "fixed",
            top: 30,
            right: 15
          }}
        >
          {`Selectables: ${this.state.onScreenElements.length}`}
        </div>
      </React.Fragment>
    );
  };
}
