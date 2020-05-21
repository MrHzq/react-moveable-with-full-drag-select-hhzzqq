// Copyright (c) 2019-present Ladifire, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from "react";
import classNames from "classnames";
import KeyController from "keycon";
import { ref } from "framework-utils";
import { Frame, setAlias } from "scenejs";

import ReactDragSelectable from "../full-drag-select";
import MoveAble, { OnRotateStart } from "react-moveable";
import Guides from "../guides";
import {
  MoveableManagerProps,
  OnDrag,
  OnDragGroupEnd,
  OnDragGroupStart,
  OnDragStart,
  OnResize,
  OnResizeGroup,
  OnResizeGroupStart,
  OnResizeStart,
  OnRotate,
  OnRotateGroup,
  OnRotateGroupEnd,
  OnRotateGroupStart,
  OnRender,
  OnRenderGroup,
  OnClick,
  OnClickGroup
} from "react-moveable";

import { ArtBoardContentType, Targets } from "./type";
import BaseElement from "../elements/base-elements";
import { ElementType } from "../elements/base-elements/type";

import "./style.scss";
import "../elements/base-elements/style.scss";

setAlias("tx", ["transform", "translateX"]);
setAlias("ty", ["transform", "translateY"]);
setAlias("tz", ["transform", "translateZ"]);
setAlias("rotate", ["transform", "rotate"]);
setAlias("sx", ["transform", "scaleX"]);
setAlias("sy", ["transform", "scaleY"]);
setAlias("matrix3d", ["transform", "matrix3d"]);

type ArtBoardProps = {
  /** Desktop, tablet or mobile view */
  viewMode: string;

  /** Should trigger when target length is changed, we need to notify target count changed*/
  onTargetCountChange?: (count: number) => void;
  onArtBoardDoubleClick?: Function;
};

type TranslateType = number[];

type ArtBoardState = {
  isLoading?: boolean;
  hasElementResizing?: boolean;
  frame: {
    translate: TranslateType;
    rotate: number;
  };
  target?: any;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  rKey?: boolean;
  verticalGuidelines?: number[];
  horizontalGuidelines?: number[];
  showRuler?: boolean;
  selectables: {
    [id: string]: HTMLElement | SVGAElement | null;
  };
  visibleElements?: Array<HTMLElement | SVGAElement>;
  lastSelectElement: {
    time?: number;
    element?: HTMLElement | SVGAElement | undefined | null;
  };
};

export default class ArtBoard extends React.PureComponent<
  ArtBoardProps,
  ArtBoardState
> {
  static defaultProps: ArtBoardProps = {
    viewMode: "desktop"
  };

  state: ArtBoardState = {
    isLoading: true,
    hasElementResizing: false,
    frame: {
      translate: [0, 0, 0],
      rotate: 0
    },
    showRuler: true,
    selectables: {},
    lastSelectElement: {
      time: 0,
      element: null
    }
  };

  /** MoveAble tooltip */
  private tooltip: HTMLElement | undefined;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  callback: Function = (selection: any, event: any) => {};
  private moveable: MoveableManagerProps<any>;
  private frameMap = new Map();

  private guides1: Guides | null = null;
  private guides2: Guides | null = null;
  private handleRenderGroup: any = ({ targets }: OnRenderGroup) => {
    targets.forEach(target => this.handleRender({ target }));
  };

  /**
   * Create new frame and assign it to frameMap*/
  newFrame = (el: HTMLElement | SVGAElement) => {
    const frame = new Frame({
      transform: {
        translateX: "0px",
        translateY: "0px",
        rotate: "0deg",
        scaleX: 1,
        scaleY: 1
      }
    });

    this.frameMap.set(el, frame);

    return frame;
  };

  getFrame = (target: HTMLElement | SVGAElement) => {
    return this.frameMap.get(target) || this.newFrame(target);
  };

  private handleRender: any = ({ target }: OnRender) => {
    // const {frame} = this.state;
    // target.style.transform = `translate(${frame.translate[0]}px, ${
    //     frame.translate[1]
    // }px) rotate(${frame.rotate}deg)`;

    target.style.cssText += this.getFrame(target as
      | HTMLElement
      | SVGAElement).toCSS();
  };

  private dragSelector: any;
  private handleDragSelectRef: any = (r: any) => {
    this.dragSelector = r;
  };

  private handleChildMounted: any = (
    id: string,
    element: HTMLElement | SVGAElement | null
  ) => {
    if (!this.state.selectables[id]) {
      setTimeout(() => {
        this.setState({
          selectables: {
            ...this.state.selectables,
            [id]: element
          }
        });
      });
    }
  };
  private handleChildUnmounted: any = (
    id: string,
    element: HTMLElement | SVGAElement | null
  ) => {};
  private handleVisibleElementsChange: any = (
    visibleElements: Array<HTMLElement | SVGAElement>
  ) => {
    this.setState({ visibleElements });
  };

  UNSAFE_componentWillMount(): void {
    this.fakeLoadingTimeout = setTimeout(() => {
      this.setState({ isLoading: false });
      clearTimeout(this.fakeLoadingTimeout);
    }, 1500);
  }

  componentDidMount(): void {
    this.tooltip = this.createTooltip();

    // setup guides
    window.addEventListener("resize", () => {
      if (this.guides1) {
        this.guides1.resize();
      }

      if (this.guides2) {
        this.guides2.resize();
      }
    });

    const keycon = new KeyController(window);
    keycon.keydown(["ctrl", "a"], event => {
      console.log("ctrl + A", event);
    });

    keycon
      .keydown("shift", () => {
        this.setState({ shiftKey: true });
      })
      .keyup("shift", () => {
        this.setState({ shiftKey: false });
      });

    keycon
      .keydown("ctrl", () => {
        this.setState({ ctrlKey: true });
      })
      .keyup("ctrl", () => {
        this.setState({ ctrlKey: false });
      });

    keycon
      .keydown("r", () => {
        if (!this.state.rKey) {
          console.log("r key press");
          this.setState({ rKey: true });
        }
      })
      .keyup("r", () => {
        if (this.state.rKey) {
          console.log("r key up");
          this.setState({ rKey: false });
        }
      });
  }

  fakeLoadingTimeout?: any;

  handleSelectChange = (
    newTarget?: HTMLElement | SVGAElement | undefined | null,
    event?: MouseEvent
  ) => {
    if (
      this.state.lastSelectElement &&
      this.state.lastSelectElement.element === newTarget &&
      this.state.lastSelectElement.time &&
      new Date().getTime() - this.state.lastSelectElement.time < 250
    ) {
      if (typeof this.props.onArtBoardDoubleClick === "function") {
        this.props.onArtBoardDoubleClick();
      }
    } else {
      this.setState({
        lastSelectElement: {
          time: new Date().getTime(),
          element: newTarget
        }
      });
    }
    let nextState: Targets = this.state.target || [];
    if (newTarget) {
      const index = nextState.indexOf(newTarget);
      if (index === -1) {
        if (this.state.ctrlKey) {
          nextState = [...nextState, newTarget];
        } else {
          nextState = [newTarget];
        }
      } else if (this.state.ctrlKey) {
        nextState.splice(index, 1);
        nextState = nextState.slice();
      }
    } else {
      nextState = [];
    }

    this.onTargetChange(nextState, () => {
      this.moveable.dragStart(event);
      if (this.state.target[0] === newTarget) {
        this.moveable.updateRect();
      }
    });
  };

  handleMultipleSelectChange = (
    elements: Array<HTMLElement | SVGAElement>,
    event: MouseEvent
  ) => {
    this.onTargetChange(elements, () => {
      // this.moveable.dragStart(event);
      // this.moveable.updateRect();
    });
  };

  private onTargetChange: any = (newTarget: any, callback?: Function) => {
    this.setState(
      {
        target: newTarget
      },
      () => {
        if (typeof callback === "function") {
          callback();
        }

        if (typeof this.props.onTargetCountChange === "function") {
          this.props.onTargetCountChange(
            this.state.target ? this.state.target.length : 0
          );
        }
      }
    );
  };

  private handleElementClick: any = () => {};

  private handleGroupClick: any = ({
    inputEvent,
    inputTarget,
    targets,
    target,
    isTarget,
    targetIndex
  }: OnClickGroup) => {
    if (!inputTarget.classList.contains("element__wrapper")) {
      return;
    }

    const index = targets.indexOf(inputTarget);
    let nextTargets = targets.slice();

    if (this.state.ctrlKey) {
      if (index === -1) {
        nextTargets = nextTargets.concat(inputTarget);
      } else {
        nextTargets.splice(index, 1);
      }
    } else {
      nextTargets = [inputTarget];
    }

    this.onTargetChange(nextTargets, () => {
      this.moveable.updateRect();
    });

    // this.setState({
    //     target: nextTargets,
    // }, () => {
    //     this.moveable.updateRect();
    // });
  };
  private handleDragGroupStart: any = ({ events }: OnDragGroupStart) => {
    this.lockSelector();

    events.forEach(this.handleDragStart);
  };
  private handleDragGroup: any = ({ events }: OnDragGroupStart) => {
    events.forEach(this.handleDrag);
  };
  private handleDragGroupEnd: any = ({
    targets,
    isDrag,
    clientX,
    clientY
  }: OnDragGroupEnd) => {
    this.unLockSelector();
    this.hideTooltip();
  };
  private handleResizeGroupStart: any = ({
    targets,
    events
  }: OnResizeGroupStart) => {
    this.lockSelector();
    events.forEach(this.handleResizeStart);
  };
  private handleResizeGroup: any = ({ targets, events }: OnResizeGroup) => {
    events.forEach(this.handleResize);
  };
  private handleResizeGroupEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  handleArtBoardRef = (r: HTMLDivElement) => {
    this.artBoard = r;
  };
  artBoard: HTMLElement | null = null;

  createTooltip = () => {
    const tooltip = document.createElement("div");

    tooltip.id = "lf-m-tooltip";
    tooltip.className = "lf__tooltip";
    tooltip.style.display = "none";
    const area = this.artBoard;
    if (area) {
      area.appendChild(tooltip);
    }

    return tooltip;
  };

  setTooltipContent = (clientX: number, clientY: number, text: string) => {
    if (this.tooltip) {
      this.tooltip.style.cssText = `display: block; transform: translate(${clientX +
        50}px, ${clientY - 10}px) translate(-100%, -100%);`;
      this.tooltip.innerHTML = text;
    }
  };

  hideTooltip = () => {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }
  };

  lockSelector = () => {
    this.setState({ hasElementResizing: true });
  };

  unLockSelector = () => {
    this.setState({ hasElementResizing: false });
  };

  private handleDragStart: any = ({ target, set }: OnDragStart) => {
    this.lockSelector();
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    set([
      parseFloat(frame.get("transform", "translateX")),
      parseFloat(frame.get("transform", "translateY"))
    ]);
  };

  private handleDrag: any = ({
    target,
    beforeTranslate,
    translate,
    delta,
    left,
    top,
    clientX,
    clientY,
    isPinch
  }: OnDrag) => {
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    if (this.state.shiftKey) {
      if (delta[0] !== 0) {
        frame.set("transform", "translateX", `${beforeTranslate[0]}px`);
      } else if (delta[1] !== 0) {
        frame.set("transform", "translateY", `${beforeTranslate[1]}px`);
      }
    } else {
      frame.set("transform", "translateX", `${beforeTranslate[0]}px`);
      frame.set("transform", "translateY", `${beforeTranslate[1]}px`);
    }

    if (!isPinch) {
      this.setTooltipContent(
        clientX,
        clientY,
        `X: ${Math.round(left)}px<br/>Y: ${Math.round(top)}px`
      );
    }
  };

  private handleDragEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  private handleResizeStart: any = ({
    target,
    setOrigin,
    dragStart
  }: OnResizeStart) => {
    this.lockSelector();
    setOrigin(["%", "%"]);
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    if (dragStart) {
      dragStart.set([parseFloat(frame.get("tx")), parseFloat(frame.get("ty"))]);
    }
  };

  private handleResize: any = ({
    target,
    width,
    height,
    drag,
    clientX,
    clientY,
    isPinch
  }: OnResize) => {
    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    frame.set("width", `${width}px`);
    frame.set("height", `${height}px`);
    frame.set("tx", `${drag.beforeTranslate[0]}px`);
    frame.set("ty", `${drag.beforeTranslate[1]}px`);

    // target.style.cssText += frame.toCSS();

    if (!isPinch) {
      this.setTooltipContent(
        clientX,
        clientY,
        `W: ${width.toFixed(0)}px<br/>H: ${height.toFixed(0)}px`
      );
    }
  };

  private handleResizeEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  private handleRotateStart: any = ({ target, set }: OnRotateStart) => {
    this.lockSelector();

    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    set(parseFloat(frame.get("transform", "rotate")));
  };

  private handleRotate: any = ({
    target,
    beforeRotate,
    clientX,
    clientY,
    isPinch,
    beforeDelta
  }: OnRotate) => {
    // const deg = parseFloat(this.state.frame.rotate) + beforeDelta;
    // if (!isPinch) {
    //     this.setTooltipContent(clientX, clientY, `R: ${deg.toFixed(1)}`);
    // }

    const frame = this.getFrame(target as HTMLElement | SVGAElement);
    const deg = parseFloat(frame.get("transform", "rotate")) + beforeDelta;
    frame.set("transform", "rotate", `${deg}deg`);
    target.style.cssText += frame.toCSS();
    this.moveable.updateRect();
  };

  private handleRotateEnd: any = () => {
    this.unLockSelector();
    this.hideTooltip();
  };

  private handleRotateGroupStart: any = ({
    targets,
    events
  }: OnRotateGroupStart) => {
    this.lockSelector();
    events.forEach(({ target, set, dragStart }) => {
      const frame = this.getFrame(target as HTMLElement | SVGAElement);
      const tx = parseFloat(frame.get("transform", "translateX")) || 0;
      const ty = parseFloat(frame.get("transform", "translateY")) || 0;
      const rotate = parseFloat(frame.get("transform", "rotate")) || 0;

      set(rotate);

      if (dragStart) {
        dragStart.set([tx, ty]);
      }
    });

    // events.forEach(this.handleRotateStart);
  };
  private handleRotateGroup: any = ({
    targets,
    events,
    set
  }: OnRotateGroup) => {
    // events.forEach(this.handleRotate);
    events.forEach(({ target, beforeRotate, drag }) => {
      const frame = this.getFrame(target as HTMLElement | SVGAElement);
      const beforeTranslate = drag.beforeTranslate;

      frame.set("transform", "rotate", `${beforeRotate}deg`);
      frame.set("transform", "translateX", `${beforeTranslate[0]}px`);
      frame.set("transform", "translateY", `${beforeTranslate[1]}px`);
      target.style.cssText += frame.toCSS();
    });
  };
  private handleRotateGroupEnd: any = ({
    targets,
    isDrag
  }: OnRotateGroupEnd) => {
    this.unLockSelector();
  };

  public setAlignment(alignment: string) {
    const { target } = this.state;

    if (target && target.length > 0) {
      const baseElement: HTMLElement | SVGAElement = target[0];
      if (target.length > 1) {
        // alignment to selection
        if (baseElement) {
          const baseElementRect = baseElement.getBoundingClientRect();
          if (baseElementRect) {
            for (let i = 1; i < target.length; i++) {
              const currentRect = target[i].getBoundingClientRect();
              const frame = this.getFrame(target[i]);
              if (frame) {
                // old transform
                const oldTransformX = parseFloat(
                  frame.get("transform", "translateX")
                );
                const oldTransformY = parseFloat(
                  frame.get("transform", "translateY")
                );
                let translateX = 0;
                let translateY = 0;
                if (alignment === "left") {
                  translateX = baseElementRect.x - currentRect.x;
                } else if (alignment === "center") {
                  translateX =
                    baseElementRect.x +
                    baseElementRect.width / 2 -
                    (currentRect.x + currentRect.width / 2);
                } else if (alignment === "right") {
                  translateX =
                    baseElementRect.x -
                    currentRect.x +
                    (baseElementRect.width - currentRect.width);
                } else if (alignment === "top") {
                  translateY = baseElementRect.y - currentRect.y;
                } else if (alignment === "middle") {
                  translateY =
                    baseElementRect.y +
                    baseElementRect.height / 2 -
                    (currentRect.y + currentRect.height / 2);
                } else if (alignment === "bottom") {
                  translateY =
                    baseElementRect.y +
                    baseElementRect.height -
                    currentRect.y -
                    currentRect.height;
                }

                if (translateX !== 0) {
                  frame.set(
                    "transform",
                    "translateX",
                    `${oldTransformX + translateX}px`
                  );
                }

                if (translateY !== 0) {
                  frame.set(
                    "transform",
                    "translateY",
                    `${oldTransformY + translateY}px`
                  );
                }

                // update target css
                target[i].style.cssText += frame.toCSS();
                this.moveable.updateRect();
              }
            }
          }
        }
      } else if (target.length === 1) {
        // alignment to art board
        alert("should align to art board");
      }
    }
  }

  private distributeElements = (
    elements: (HTMLElement | SVGAElement)[],
    distribution: string
  ) => {
    if (elements && elements.length > 0) {
      if (elements.length > 2) {
        let firstElement: HTMLElement | SVGAElement | null = null;
        let lastElement: HTMLElement | SVGAElement | null = null;
        if (distribution === "vertical") {
          // we need to sort elements by the y coordination of middle line
          elements.sort(
            (e1: HTMLElement | SVGAElement, e2: HTMLElement | SVGAElement) => {
              const e1Rect = e1.getBoundingClientRect();
              const e2Rect = e2.getBoundingClientRect();

              return e1Rect.y - e2Rect.y;
            }
          );

          firstElement = elements[0];
          const firstElementRect = firstElement.getBoundingClientRect();
          const firstElementMiddle =
            firstElementRect.y + firstElementRect.height / 2;
          lastElement = elements[elements.length - 1];
          const lastElementRect = lastElement.getBoundingClientRect();

          const totalElements = elements.length;
          const totalSpacing = Math.abs(
            firstElementRect.y -
              firstElementRect.height / 2 -
              (lastElementRect.y - lastElementRect.height / 2)
          );

          if (totalSpacing > 0) {
            const averageSpacing = totalSpacing / (totalElements - 1);
            for (let i = 1; i < totalElements - 1; i++) {
              // calculate distance from middle of this element to middle of first element
              const currentElementRect = elements[i].getBoundingClientRect();
              const oldDistance =
                currentElementRect.y +
                currentElementRect.height / 2 -
                firstElementMiddle;

              const frame = this.getFrame(elements[i]);
              if (frame) {
                // old transform
                const oldTransformY = parseFloat(
                  frame.get("transform", "translateY")
                );
                frame.set(
                  "transform",
                  "translateY",
                  `${oldTransformY - (oldDistance - averageSpacing * i)}px`
                );

                // update target css
                elements[i].style.cssText += frame.toCSS();
              }
            }
            this.moveable.updateRect();
          }
        } else if (distribution === "horizontal") {
          // we need to sort elements by the y coordination of middle line
          elements.sort(
            (e1: HTMLElement | SVGAElement, e2: HTMLElement | SVGAElement) => {
              const e1Rect = e1.getBoundingClientRect();
              const e2Rect = e2.getBoundingClientRect();

              return e1Rect.x - e2Rect.x;
            }
          );

          firstElement = elements[0];
          const firstElementRect = firstElement.getBoundingClientRect();
          const firstElementMiddle =
            firstElementRect.x + firstElementRect.width / 2;
          lastElement = elements[elements.length - 1];
          const lastElementRect = lastElement.getBoundingClientRect();

          const totalElements = elements.length;
          const totalSpacing = Math.abs(
            firstElementRect.x -
              firstElementRect.width / 2 -
              (lastElementRect.x - lastElementRect.width / 2)
          );

          if (totalSpacing > 0) {
            const averageSpacing = totalSpacing / (totalElements - 1);
            for (let i = 1; i < totalElements - 1; i++) {
              // calculate distance from middle of this element to middle of first element
              const currentElementRect = elements[i].getBoundingClientRect();
              const oldDistance =
                currentElementRect.x +
                currentElementRect.width / 2 -
                firstElementMiddle;

              const frame = this.getFrame(elements[i]);
              if (frame) {
                // old transform
                const oldTransformX = parseFloat(
                  frame.get("transform", "translateX")
                );
                frame.set(
                  "transform",
                  "translateX",
                  `${oldTransformX - (oldDistance - averageSpacing * i)}px`
                );

                // update target css
                elements[i].style.cssText += frame.toCSS();
              }
            }
            this.moveable.updateRect();
          }
        }
      }
    }
  };

  public setDistribution(distribution: string) {
    const { target } = this.state;

    return this.distributeElements(target, distribution);
  }

  renderMoveable = () => {
    const { horizontalGuidelines, verticalGuidelines } = this.state;

    return (
      <MoveAble
        ref={ref(this, "moveable")}
        // edge={true}
        target={this.state.target}
        draggable={true}
        snappable={true}
        snapCenter={true}
        throttleDrag={0}
        origin={false}
        resizable={true}
        throttleResize={0}
        rotatable={true}
        rotationAtCorner={false}
        scrollable={true}
        scrollContainer={document.documentElement}
        scrollThreshold={1}
        keepRatio={this.state.shiftKey}
        throttleRotate={this.state.shiftKey ? 30 : 0}
        onRender={this.handleRender}
        onRenderGroup={this.handleRenderGroup}
        elementGuidelines={this.state.visibleElements}
        verticalGuidelines={verticalGuidelines}
        horizontalGuidelines={horizontalGuidelines}
        onDragStart={this.handleDragStart}
        onDrag={this.handleDrag}
        onDragEnd={this.handleDragEnd}
        onRotateStart={this.handleRotateStart}
        onRotate={this.handleRotate}
        onRotateEnd={this.handleRotateEnd}
        onResizeStart={this.handleResizeStart}
        onResize={this.handleResize}
        onResizeEnd={this.handleResizeEnd}
        onResizeGroupStart={this.handleResizeGroupStart}
        onResizeGroup={this.handleResizeGroup}
        onResizeGroupEnd={this.handleResizeGroupEnd}
        onClick={this.handleElementClick}
        onClickGroup={this.handleGroupClick}
        onDragGroupStart={this.handleDragGroupStart}
        onDragGroup={this.handleDragGroup}
        onDragGroupEnd={this.handleDragGroupEnd}
        onRotateGroupStart={this.handleRotateGroupStart}
        onRotateGroup={this.handleRotateGroup}
        onRotateGroupEnd={this.handleRotateGroupEnd}
      />
    );
  };

  renderGuides = () => {
    return (
      <React.Fragment>
        <div className="box" />
        <div className={classNames("ruler", "horizontal")}>
          <Guides
            ref={ref(this, "guides1")}
            type="horizontal"
            rulerStyle={{
              left: "20px",
              width: "calc(100% - 20px)",
              height: "100%"
            }}
            setGuides={guides => {
              this.setState({ horizontalGuidelines: guides.map(g => g + 20) });
            }}
          />
        </div>
        <div className={classNames("ruler", "vertical")}>
          <Guides
            ref={ref(this, "guides2")}
            type="vertical"
            rulerStyle={{
              top: "0",
              height: "100%",
              width: "100%"
            }}
            setGuides={guides => {
              this.setState({ verticalGuidelines: guides.map(g => g + 20) });
            }}
          />
        </div>
      </React.Fragment>
    );
  };

  renderLoading = () => {
    return <span>{"Fake loading..."}</span>;
  };

  renderDemo = () => {
    const demoElements = [];

    // custom element, you can wrap any thing in <BaseElement/>

    const customElement = (
      <BaseElement
        key={`custom__element`}
        style={{
          top: 30,
          left: 100,
          backgroundColor: "#aaa",
          padding: 10
        }}
        onMounted={this.handleChildMounted}
        onUnmounted={this.handleChildUnmounted}
      >
        <div>
          <div>
            <p>This is paragraph</p>
          </div>
          <button>Button</button>
        </div>
      </BaseElement>
    );

    const customElement2 = (
      <BaseElement
        key={`custom__element2`}
        style={{
          top: 30,
          left: 250,
          backgroundColor: "#aaa",
          padding: 10
        }}
        onMounted={this.handleChildMounted}
        onUnmounted={this.handleChildUnmounted}
      >
        <div>
          <img
            alt="test"
            src="https://hackernoon.com/hn-images/1*OVenkpgBSpBJKwgwRwrYkg.jpeg"
            height={150}
            width={150}
          />
        </div>
      </BaseElement>
    );

    demoElements.push(customElement);
    demoElements.push(customElement2);

    let index = 0;
    for (let column = 0; column < 1; column++) {
      for (let i = 0; i < 2; i++) {
        index++;
        demoElements.push(
          <BaseElement
            key={`column__${column}_element__${i}`}
            style={{
              top: i === 0 ? 250 : i * 250 + 100,
              left: column * 150 + 60,
              backgroundColor: "#aaa",
              padding: 10
            }}
            onMounted={this.handleChildMounted}
            onUnmounted={this.handleChildUnmounted}
          >
            <div>{`test__${index}`}</div>
          </BaseElement>
        );
      }
    }

    return demoElements;
  };

  renderContent = () => {
    const { viewMode } = this.props;

    return (
      <div className={classNames("art_board_area", `art_board__${viewMode}`)}>
        {this.renderDemo()}
      </div>
    );
  };

  render() {
    const { isLoading, showRuler } = this.state;
    return (
      <React.Fragment>
        <div
          ref={this.handleArtBoardRef}
          className={classNames("art_board_wrapper", {
            art_board__loading: isLoading,
            show__ruler: showRuler
          })}
        >
          {isLoading && this.renderLoading()}
          {!isLoading && this.renderContent()}
          {this.renderMoveable()}
        </div>
        {!isLoading && showRuler && this.renderGuides()}
        <ReactDragSelectable
          ref={this.handleDragSelectRef}
          container={this.artBoard}
          observerAbleClass="element__wrapper"
          selectAbleClass="element__selectable"
          onSelectChange={this.handleSelectChange}
          onMultipleSelectChange={this.handleMultipleSelectChange}
          locked={this.state.hasElementResizing}
          selectables={this.state.selectables}
          onVisibleElementsChange={this.handleVisibleElementsChange}
        />
      </React.Fragment>
    );
  }
}
