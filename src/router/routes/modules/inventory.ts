import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';
import { t } from '/@/hooks/web/useI18n';
import { RoleEnum } from '/@/enums/roleEnum';

const dashboard: AppRouteModule = {
  path: '/inventory',
  name: 'Inventory',
  component: LAYOUT,
  redirect: '/reservations/stock',
  meta: {
    orderNo: 20,
    icon: 'ion:grid-outline',
    title: t('routes.inventory.inventory'),
    roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
  },
  children: [
    {
      path: 'stock',
      name: 'Stock',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.inventory.stock'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
    {
      path: 'timeSegmentEabled',
      name: 'TimeSegmentEabled',
      component: () => import('/@/views/dashboard/workbench/index.vue'),
      meta: {
        title: t('routes.inventory.time_segment_enabled'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
    {
      path: 'timeSegmentQuantity',
      name: 'TimeSegmentQuantity',
      component: () => import('/@/views/dashboard/workbench/index.vue'),
      meta: {
        title: t('routes.inventory.time_segment_quantity'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
  ],
};

export default dashboard;
