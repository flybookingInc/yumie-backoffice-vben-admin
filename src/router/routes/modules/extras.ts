import type { AppRouteModule } from '/@/router/types';

import { LAYOUT } from '/@/router/constant';
import { t } from '/@/hooks/web/useI18n';
import { RoleEnum } from '/@/enums/roleEnum';

const dashboard: AppRouteModule = {
  path: '/extras',
  name: 'Extras',
  component: LAYOUT,
  redirect: '/reservations/list',
  meta: {
    orderNo: 30,
    icon: 'ion:grid-outline',
    title: t('routes.extras.extras'),
    roles: [RoleEnum.SUPERADMIN, RoleEnum.ADMIN],
  },
};

export default dashboard;
