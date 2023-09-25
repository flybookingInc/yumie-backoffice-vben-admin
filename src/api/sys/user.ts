import { defHttp } from '/@/utils/http/axios';
import { LoginParams, LoginResultModel, GetUserInfoModel } from './model/userModel';

import { ErrorMessageMode } from '/#/axios';
import { signInWithEmailAndPassword, getAuth, signOut, User } from 'firebase/auth';

enum Api {
  Login = '/login',
  Logout = '/logout',
  GetUserInfo = '/getUserInfo',
  GetPermCode = '/getPermCode',
  TestRetry = '/testRetry',
}

/**
 * @description: user login api
 */
export const loginApi = async (
  params: LoginParams,
  _mode: ErrorMessageMode = 'modal',
): Promise<LoginResultModel> => {
  // implement login here

  const UserCredential = await signInWithEmailAndPassword(
    getAuth(),
    params.username,
    params.password,
  );
  // const idTokenResult = await UserCredential.user.getIdTokenResult();
  // const userId = UserCredential.user.uid;
  // const roles: RoleInfo[] = [
  //   { roleName: idTokenResult.claims.rule as string, value: idTokenResult.claims.rule as string },
  // ];
  const token = await UserCredential.user.getIdToken();

  return {
    // userId,
    token,
    // roles,
  };

  // return defHttp.post<LoginResultModel>(
  //   {
  //     url: Api.Login,
  //     params,
  //   },
  //   {
  //     errorMessageMode: mode,
  //   },
  // );
};

/**
 * @description: getUserInfo
 */
export const getUserInfo = async (user: User): Promise<GetUserInfoModel> => {
  const idTokenResult = await user.getIdTokenResult();
  if (!idTokenResult) {
    console.log('user not login');
    throw new Error('user not login');
  }
  const userInfo: GetUserInfoModel = {
    roles: [
      { roleName: idTokenResult.claims.rule as string, value: idTokenResult.claims.rule as string },
    ],
    userId: user.uid as string,
    username: user.email as string,
    realName: user.displayName as string,
    avatar: '',
  };
  return userInfo;
  // return defHttp.get<GetUserInfoModel>({ url: Api.GetUserInfo }, { errorMessageMode: 'none' });
};

export function getPermCode() {
  return defHttp.get<string[]>({ url: Api.GetPermCode });
}

export const doLogout = async () => {
  await signOut(getAuth());
  // return defHttp.get({ url: Api.Logout });
};

export function testRetry() {
  return defHttp.get(
    { url: Api.TestRetry },
    {
      retryRequest: {
        isOpenRetry: true,
        count: 5,
        waitTime: 1000,
      },
    },
  );
}
