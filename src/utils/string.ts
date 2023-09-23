/**
 * 將數字加入逗號符號
 */
export const numberWithCommas = (x: number | string) => {
  if(typeof x === "number"){
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }else {
    return x.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
}