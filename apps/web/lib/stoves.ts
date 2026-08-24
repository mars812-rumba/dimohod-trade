import stoveData from "./stoves.generated.json";

export type StoveCatalogItem = {
  id: number;
  name: string;
  image: string;
};

export const STOVES_PER_PAGE = 21;
export const stoves = stoveData satisfies StoveCatalogItem[];
export const stovePageCount = Math.ceil(stoves.length / STOVES_PER_PAGE);

export function stovePagePath(page: number) {
  return page <= 1 ? "/pechi" : `/pechi/page/${page}`;
}

export function stovesForPage(page: number) {
  const offset = (page - 1) * STOVES_PER_PAGE;
  return stoves.slice(offset, offset + STOVES_PER_PAGE);
}

export function isValidStovePage(page: number) {
  return Number.isInteger(page) && page >= 1 && page <= stovePageCount;
}
