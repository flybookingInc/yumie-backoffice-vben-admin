import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';
import { t } from '/@/hooks/web/useI18n';
import { RoleEnum } from '/@/enums/roleEnum';

const dashboard: AppRouteModule = {
  path: '/settings',
  name: 'Settings',
  component: LAYOUT,
  redirect: '/reservations/list',
  meta: {
    orderNo: 50,
    icon: 'ion:grid-outline',
    title: t('routes.settings.settings'),
    roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
  },
  children: [
    {
      path: 'roomType',
      name: 'roomType',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.settings.roomType'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
    {
      path: 'plan',
      name: 'plan',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.settings.plan'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
    {
      path: 'system',
      name: 'system',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.settings.system'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
    {
      path: 'account',
      name: 'account',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.settings.account'),
        roles: [RoleEnum.SUPERADMIN],
      },
    },
  ],
};

export default dashboard;
