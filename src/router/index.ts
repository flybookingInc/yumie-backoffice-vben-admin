import type { RouteRecordRaw } from 'vue-router';
import type { App } from 'vue';

import { createRouter, createWebHashHistory } from 'vue-router';
import { basicRoutes } from './routes';

// 白名單應該包含基本靜態路由
const WHITE_NAME_LIST: string[] = [];
const getRouteNames = (array: any[]) =>
  array.forEach((item) => {
    WHITE_NAME_LIST.push(item.name);
    getRouteNames(item.children || []);
  });
getRouteNames(basicRoutes);

// app router
// 創建一個可以被 Vue 應用程序使用的路由實例
export const router = createRouter({
  // 創建一個 hash 歷史記錄。
  history: createWebHashHistory(import.meta.env.VITE_PUBLIC_PATH),
  // 應該添加到路由的初始路由列表。
  routes: basicRoutes as unknown as RouteRecordRaw[],
  // 是否應該禁止尾部斜槓。默認為假
  strict: true,
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// reset router
export function resetRouter() {
  router.getRoutes().forEach((route) => {
    const { name } = route;
    if (name && !WHITE_NAME_LIST.includes(name as string)) {
      router.hasRoute(name) && router.removeRoute(name);
    }
  });
}

// config router
// 配置路由器
export function setupRouter(app: App<Element>) {
  app.use(router);
}
