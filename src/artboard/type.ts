// Copyright (c) 2019-present Ladifire, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/*Select individual objects by clicking them.
 Drag from left to right to select all objects that are entirely enclosed in the selection rectangle or lasso (window selection).
 Drag from right to left to select all objects that are crossed by the selection rectangle or lasso (crossing selection).*/
import { CSSProperties } from "react";

import { ElementType } from "../elements/base-elements/type";

export type MouseDragDirection =
  | "LeftUp" // Drag from left bottom corner to right and up
  | "LeftDown" // Drag from left top corner to right and down
  | "RightUp" // Drag from right bottom corner to left and up
  | "RightDown"; // Drag from right top corner to left and down

type Position = {
  x?: number;
  y?: number;
};

export type SelectorPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
  direction: MouseDragDirection;
};

export type ArtBoardContentType = {
  elements?: ElementType[];
};

export type Targets = Array<HTMLElement | SVGElement>;
