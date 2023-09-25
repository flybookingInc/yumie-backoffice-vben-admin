import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';
import { t } from '/@/hooks/web/useI18n';
import { RoleEnum } from '/@/enums/roleEnum';

const dashboard: AppRouteModule = {
  path: '/statstastics',
  name: 'Statstastics',
  component: LAYOUT,
  redirect: '/reservations/list',
  meta: {
    orderNo: 40,
    icon: 'ion:grid-outline',
    title: t('routes.statstastics.statstastics'),
    roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
  },
  children: [
    {
      path: 'sms',
      name: 'Sms',
      component: () => import('/@/views/dashboard/analysis/index.vue'),
      meta: {
        // affix: true,
        title: t('routes.statstastics.sms'),
        roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
      },
    },
  ],
};

export default dashboard;
