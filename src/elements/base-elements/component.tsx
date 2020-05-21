import React from "react";
import classNames from "classnames";
import uuid from "uuid";

import "./style.scss";

export type ElementProps = {
  id?: string;
  children?: React.ReactElement;
  style?: React.CSSProperties;
  onMounted?: (id: string, element: HTMLElement | SVGAElement | null) => void;
  onUnmounted?: (id: string, element: HTMLElement | SVGAElement | null) => void;
};

type TranslateType = [number, number, number?];

type ElementState = {
  frame: {
    translate: TranslateType;
    rotate: number;
  };
  target?: HTMLElement;
  isSelected?: boolean;
};

export default class BaseElement extends React.PureComponent<
  ElementProps,
  ElementState
> {
  state: ElementState = {
    frame: {
      translate: [0, 0, 0],
      rotate: 0
    },
    isSelected: false
  };

  private id: string = uuid();

  componentDidMount(): void {
    if (typeof this.props.onMounted === "function") {
      this.props.onMounted(this.id, this.wrapper);
    }
  }

  componentWillUnmount() {
    if (typeof this.props.onUnmounted === "function") {
      this.props.onUnmounted(this.id, this.wrapper);
    }
  }

  private wrapper: HTMLElement | SVGAElement | null = null;

  handleWrapperRef = (r: HTMLDivElement) => {
    this.wrapper = r;
  };

  render() {
    const { id } = this.props;
    return (
      <React.Fragment>
        <div
          ref={this.handleWrapperRef}
          className={classNames("element__wrapper", {
            element__selected: this.state.isSelected
          })}
          style={this.props.style}
          data-key={id}
        >
          {this.props.children}
        </div>
      </React.Fragment>
    );
  }
}
