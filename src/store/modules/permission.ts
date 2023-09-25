import type { AppRouteRecordRaw, Menu } from '/@/router/types';

import { defineStore } from 'pinia';
import { store } from '/@/store';
import { useI18n } from '/@/hooks/web/useI18n';
import { useUserStore } from './user';
import { useAppStoreWithOut } from './app';
import { toRaw } from 'vue';
import { transformObjToRoute, flatMultiLevelRoutes } from '/@/router/helper/routeHelper';
import { transformRouteToMenu } from '/@/router/helper/menuHelper';

import projectSetting from '/@/settings/projectSetting';

import { PermissionModeEnum } from '/@/enums/appEnum';

import { asyncRoutes } from '/@/router/routes';
import { ERROR_LOG_ROUTE, PAGE_NOT_FOUND_ROUTE } from '/@/router/routes/basic';

import { filter } from '/@/utils/helper/treeHelper';

import { getMenuList } from '/@/api/sys/menu';
import { getPermCode } from '/@/api/sys/user';

import { useMessage } from '/@/hooks/web/useMessage';
import { PageEnum } from '/@/enums/pageEnum';

interface PermissionState {
  // Permission code list
  // 權限代碼列表
  permCodeList: string[] | number[];
  // Whether the route has been dynamically added
  // 路由是否動態添加
  isDynamicAddedRoute: boolean;
  // To trigger a menu update
  // 觸發菜單更新
  lastBuildMenuTime: number;
  // Backstage menu list
  // 後台菜單列表
  backMenuList: Menu[];
  // 菜單列表
  frontMenuList: Menu[];
}

export const usePermissionStore = defineStore({
  id: 'app-permission',
  state: (): PermissionState => ({
    // 權限代碼列表
    permCodeList: [],
    // Whether the route has been dynamically added
    // 路由是否動態添加
    isDynamicAddedRoute: false,
    // To trigger a menu update
    // 觸發菜單更新
    lastBuildMenuTime: 0,
    // Backstage menu list
    // 後台菜單列表
    backMenuList: [],
    // menu List
    // 菜單列表
    frontMenuList: [],
  }),
  getters: {
    getPermCodeList(state): string[] | number[] {
      return state.permCodeList;
    },
    getBackMenuList(state): Menu[] {
      return state.backMenuList;
    },
    getFrontMenuList(state): Menu[] {
      return state.frontMenuList;
    },
    getLastBuildMenuTime(state): number {
      return state.lastBuildMenuTime;
    },
    getIsDynamicAddedRoute(state): boolean {
      return state.isDynamicAddedRoute;
    },
  },
  actions: {
    setPermCodeList(codeList: string[]) {
      this.permCodeList = codeList;
    },

    setBackMenuList(list: Menu[]) {
      this.backMenuList = list;
      list?.length > 0 && this.setLastBuildMenuTime();
    },

    setFrontMenuList(list: Menu[]) {
      this.frontMenuList = list;
    },

    setLastBuildMenuTime() {
      this.lastBuildMenuTime = new Date().getTime();
    },

    setDynamicAddedRoute(added: boolean) {
      this.isDynamicAddedRoute = added;
    },
    resetState(): void {
      this.isDynamicAddedRoute = false;
      this.permCodeList = [];
      this.backMenuList = [];
      this.lastBuildMenuTime = 0;
    },
    async changePermissionCode() {
      const codeList = await getPermCode();
      this.setPermCodeList(codeList);
    },

    // 構建路由, 如果是依照ROLE角色決定權限，則需要在此依角色對路由進行過濾
    async buildRoutesAction(): Promise<AppRouteRecordRaw[]> {
      const { t } = useI18n();
      const userStore = useUserStore();
      const appStore = useAppStoreWithOut();

      let routes: AppRouteRecordRaw[] = [];
      let menuList: AppRouteRecordRaw[] = [];
      const roleList = toRaw(userStore.getRoleList) || [];
      const { permissionMode = projectSetting.permissionMode } = appStore.getProjectConfig;
      console.log('permissionMode=', permissionMode);
      // 路由過濾器 在 函數filter 作為回調傳入遍歷使用
      const routeFilter = (route: AppRouteRecordRaw) => {
        const { meta } = route;
        // 抽出角色
        const { roles } = meta || {};
        if (!roles) return true;
        // 進行角色權限判斷
        return roleList.some((role) => roles.includes(role));
      };

      const routeRemoveIgnoreFilter = (route: AppRouteRecordRaw) => {
        const { meta } = route;
        // ignoreRoute 為true 則路由僅用於菜單生成，不會在實際的路由表中出現
        const { ignoreRoute } = meta || {};
        // arr.filter 返回 true 表示該元素通過測試
        return !ignoreRoute;
      };

      /**
       * @description 根據設置的首頁path，修正routes中的affix標記（固定首頁）
       * */
      const patchHomeAffix = (routes: AppRouteRecordRaw[]) => {
        if (!routes || routes.length === 0) return;
        let homePath: string = userStore.getUserInfo.homePath || PageEnum.BASE_HOME;

        function patcher(routes: AppRouteRecordRaw[], parentPath = '') {
          if (parentPath) parentPath = parentPath + '/';
          routes.forEach((route: AppRouteRecordRaw) => {
            const { path, children, redirect } = route;
            const currentPath = path.startsWith('/') ? path : parentPath + path;
            if (currentPath === homePath) {
              if (redirect) {
                homePath = route.redirect! as string;
              } else {
                route.meta = Object.assign({}, route.meta, { affix: true });
                throw new Error('end');
              }
            }
            children && children.length > 0 && patcher(children, currentPath);
          });
        }

        try {
          patcher(routes);
        } catch (e) {
          // 已處理完畢跳出循環
        }
        return;
      };

      switch (permissionMode) {
        // 角色權限
        case PermissionModeEnum.ROLE:
          // 針對ROLE模式撰寫專屬的過濾器
          console.log(`permissionMode=${permissionMode} => ROLE模式`);
          console.log(`登入者role權限為=${roleList}`);
          const routeRoleFilter = (route: AppRouteRecordRaw) => {
            const { meta } = route;
            const { roles } = meta || {};
            if (!roles) {
              // console.log(`${route.name} 沒有設置roles => 通過`);
              return true;
            }
            // console.log(`${route.name} 設置roles => ${roles}`);
            const roleCheck = roleList?.some((role) => roles?.includes(role));
            // console.log(`${route.name} 設置roles => ${roles} => 通過與否：${roleCheck}`);
            return roleCheck;
          };
          // 對非一級路由進行過濾
          // console.log('before filter:', asyncRoutes);
          routes = filter(asyncRoutes, routeRoleFilter);
          // console.log('after filter:', routes);
          // 對一級路由根據角色權限過濾
          routes = routes.filter(routeRoleFilter);

          // add By Josh
          // 將路由轉換成菜單
          menuList = transformRouteToMenu(routes, true);
          console.log('menuList=', menuList);
          // 移除掉 ignoreRoute: true 的路由 非一級路由
          routes = filter(routes, routeRemoveIgnoreFilter);
          console.log('after routeRemoveIgnoreFilter non first class=', routes);
          // 移除掉 ignoreRoute: true 的路由 一級路由；
          routes = routes.filter(routeRemoveIgnoreFilter);
          console.log('after routeRemoveIgnoreFilter first class=', routes);
          // 對菜單進行排序
          menuList.sort((a, b) => {
            return (a.meta?.orderNo || 0) - (b.meta?.orderNo || 0);
          });
          console.log(`after sort menuList=${menuList}`);

          // 設置菜單列表
          this.setFrontMenuList(menuList);

          // Convert multi-level routing to level 2 routing
          // 將多級路由轉換為 2 級路由
          routes = flatMultiLevelRoutes(routes);
          break;

        // 路由映射， 默認進入該case
        case PermissionModeEnum.ROUTE_MAPPING:
          // 對非一級路由進行過濾
          routes = filter(asyncRoutes, routeFilter);
          // 對一級路由再次根據角色權限過濾
          routes = routes.filter(routeFilter);
          // 將路由轉換成菜單
          menuList = transformRouteToMenu(routes, true);
          // 移除掉 ignoreRoute: true 的路由 非一級路由
          routes = filter(routes, routeRemoveIgnoreFilter);
          // 移除掉 ignoreRoute: true 的路由 一級路由；
          routes = routes.filter(routeRemoveIgnoreFilter);
          // 對菜單進行排序
          menuList.sort((a, b) => {
            return (a.meta?.orderNo || 0) - (b.meta?.orderNo || 0);
          });

          // 設置菜單列表
          this.setFrontMenuList(menuList);

          // Convert multi-level routing to level 2 routing
          // 將多級路由轉換為 2 級路由
          routes = flatMultiLevelRoutes(routes);
          break;

        //  If you are sure that you do not need to do background dynamic permissions, please comment the entire judgment below
        //  如果確定不需要做後台動態權限，請在下方註釋整個判斷
        case PermissionModeEnum.BACK:
          const { createMessage } = useMessage();

          createMessage.loading({
            content: t('sys.app.menuLoading'),
            duration: 1,
          });

          // !Simulate to obtain permission codes from the background,
          // 模擬從後台獲取權限碼，
          // this function may only need to be executed once, and the actual project can be put at the right time by itself
          // 這個功能可能只需要執行一次，實際項目可以自己放在合適的時間
          let routeList: AppRouteRecordRaw[] = [];
          try {
            await this.changePermissionCode();
            routeList = (await getMenuList()) as AppRouteRecordRaw[];
          } catch (error) {
            console.error(error);
          }

          // Dynamically introduce components
          // 動態引入組件
          routeList = transformObjToRoute(routeList);

          //  Background routing to menu structure
          //  後台路由到菜單結構
          const backMenuList = transformRouteToMenu(routeList);
          this.setBackMenuList(backMenuList);

          // remove meta.ignoreRoute item
          // 刪除 meta.ignoreRoute 項
          routeList = filter(routeList, routeRemoveIgnoreFilter);
          routeList = routeList.filter(routeRemoveIgnoreFilter);

          routeList = flatMultiLevelRoutes(routeList);
          routes = [PAGE_NOT_FOUND_ROUTE, ...routeList];
          break;
      }

      routes.push(ERROR_LOG_ROUTE);
      patchHomeAffix(routes);
      return routes;
    },
  },
});

// Need to be used outside the setup
// 需要在設置之外使用
export function usePermissionStoreWithOut() {
  return usePermissionStore(store);
}
