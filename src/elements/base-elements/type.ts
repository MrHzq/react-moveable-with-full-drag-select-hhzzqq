import { CSSProperties } from "react";

export type ElementType = {
  name: string;
  displayName: string;
  type: string;
  style: CSSProperties;
  children: ElementType[];
};
