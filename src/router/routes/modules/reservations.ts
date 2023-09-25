import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';
import { t } from '/@/hooks/web/useI18n';
import { RoleEnum } from '/@/enums/roleEnum';

const dashboard: AppRouteModule = {
  path: '/reservations',
  name: 'Reservations',
  component: LAYOUT,
  redirect: '/reservations/list',
  meta: {
    orderNo: 10,
    icon: 'ion:grid-outline',
    title: t('routes.reservations.reservations'),
    roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
  },
  children: [
    {
      path: 'list',
      name: 'List',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.reservations.list'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
    {
      path: 'book',
      name: 'Book',
      component: () => import('/@/views/dashboard/workbench/index.vue'),
      meta: {
        title: t('routes.reservations.book'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
  ],
};

export default dashboard;
