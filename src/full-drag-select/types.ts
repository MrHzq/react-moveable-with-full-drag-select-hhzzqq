export type MouseDragDirection =
  | "LeftUp" // Drag from left bottom corner to right and up
  | "LeftDown" // Drag from left top corner to right and down
  | "RightUp" // Drag from right bottom corner to left and up
  | "RightDown"; // Drag from right top corner to left and down

export type SelectorPosition = {
  x: number;
  y: number;
  w: number;
  h: number;
  direction: MouseDragDirection;
};

export type DragSelectableProps = {
  container: Document | HTMLElement | null;
  locked?: boolean;
  selectAbleClass: string;
  observerAbleClass: string;
  onSelectChange?: Function;
  onMultipleSelectChange?: Function;
  selectables: {
    [id: string]: HTMLElement | SVGAElement | null;
  };
  onVisibleElementsChange?: Function;
};

export type DragSelectableState = {
  containerTop: number;
  containerLeft: number;
  onScreenElements: Array<HTMLElement | SVGAElement>;
  observerIdsCache: Array<string>;
};
