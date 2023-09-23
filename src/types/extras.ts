export interface Extras {
  items: ExtraItem[];
}

export interface ExtraItem {
  itemId: number;
  itemAmt: number;
  itemName: string;
  itemPrice: number;
}