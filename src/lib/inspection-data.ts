export const SPACES = [
  "客廳",
  "客廳玄關",
  "主臥室",
  "次臥室一",
  "次臥室二",
  "廚房",
  "主衛浴",
  "次衛浴",
  "工作陽台",
  "地下室車位",
] as const;

export const QUICK_CHIPS = [
  "髒污",
  "撞刮傷",
  "泥沙淤積",
  "未塗接",
  "空鼓/漆面不良",
  "含水率偏高",
] as const;

export type ChecklistCategory = {
  id: string;
  name: string;
  items: { id: string; title: string }[];
};

export const CATEGORIES: ChecklistCategory[] = [
  {
    id: "door-window",
    name: "門窗工程",
    items: [
      { id: "dw-1", title: "門片開闔順暢、無異音" },
      { id: "dw-2", title: "門鎖／把手作動正常" },
      { id: "dw-3", title: "窗框矽利康填縫完整" },
      { id: "dw-4", title: "玻璃無刮傷、無氣泡" },
      { id: "dw-5", title: "紗窗滑軌順暢、無變形" },
    ],
  },
  {
    id: "surface",
    name: "地面/牆面工程",
    items: [
      { id: "sf-1", title: "地磚平整度、無突角" },
      { id: "sf-2", title: "地磚敲擊無空鼓" },
      { id: "sf-3", title: "牆面油漆均勻、無流掛" },
      { id: "sf-4", title: "陰陽角垂直平整" },
      { id: "sf-5", title: "天花板無裂縫、無水漬" },
      { id: "sf-6", title: "踢腳板收邊密合" },
    ],
  },
  {
    id: "plumbing",
    name: "給排水/管道工程",
    items: [
      { id: "pl-1", title: "給水出水量正常、無滲漏" },
      { id: "pl-2", title: "排水順暢、無積水" },
      { id: "pl-3", title: "地排存水彎無異味" },
      { id: "pl-4", title: "管道間封堵完整" },
      { id: "pl-5", title: "洩水坡度正確" },
    ],
  },
  {
    id: "mep",
    name: "機電/設備工程",
    items: [
      { id: "me-1", title: "插座通電、極性正確" },
      { id: "me-2", title: "開關對應燈具正確" },
      { id: "me-3", title: "弱電／網路孔測試正常" },
      { id: "me-4", title: "排風扇運轉正常" },
      { id: "me-5", title: "冷氣排水管配置正確" },
    ],
  },
];

export const TOTAL_ITEMS = CATEGORIES.reduce((n, c) => n + c.items.length, 0);
