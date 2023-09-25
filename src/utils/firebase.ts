/**
 * Firebase utils
 */
import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, IdTokenResult, User, onIdTokenChanged } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { useDataStore } from '/@/store/modules/reservations';
import Swal from 'sweetalert2';
import { getErrorMessage } from '/@/utils/error';
import { store } from '/@/store';
import { ref, computed } from 'vue';
import type { Ref } from 'vue';

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

let app: FirebaseApp;
let appCheck: AppCheck | undefined;
const user = ref<Nullable<User>>(null);

const dataStore = useDataStore(store);

const initFirebase = () => {
  const FIREBASE_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  };

  const apps = getApps();
  if (apps.length < 1) {
    app = initializeApp(FIREBASE_CONFIG);
  } else {
    app = apps[0];
  }

  const db = getFirestore(app);
  const functions = getFunctions(app, 'asia-east1');
  const auth = getAuth(app);
  auth.useDeviceLanguage();

  if (!import.meta.env.PROD) {
    // development mode, using Emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5008);
    connectAuthEmulator(auth, 'http://localhost:9099');
  }

  // TODO: Turn off phone auth app verification for development.
  if (!import.meta.env.PROD) {
    // enable on development mode
    // https://firebase.google.com/docs/reference/node/firebase.auth.AuthSettings
    auth.settings.appVerificationDisabledForTesting = true;
  }

  if (typeof window !== 'undefined') {
    // make sure the code excute on client side only
    // is enabled appCheck
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = !import.meta.env.PROD; // enable FIREBASE_APPCHECK_DEBUG_TOKEN on development mode
    // init AppCheck
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_APP_CHECK_KEY as string),
      isTokenAutoRefreshEnabled: true,
    });
  }

  authUserMap.set(app, user);
  setupOnAuthStateChanged(user, app);
  // register auth state change listener
  auth.onAuthStateChanged(handleAuthStateChanged);
};

const handleAuthStateChanged = async (user: User | null) => {
  if (user) {
    try {
      dataStore.user = user;
      const idTokenResult: IdTokenResult = await user.getIdTokenResult();
      dataStore.claims = idTokenResult.claims;
      const hotelGroup = idTokenResult.claims.hotelGroup as string[];
      if (hotelGroup.length === 0) {
        Swal.fire({
          icon: 'error',
          title: '無權限',
          text: '此帳號沒有所屬的旅館',
          confirmButtonColor: '#d33',
          confirmButtonText: '確定',
        });
        return;
      }
      const hotelId = hotelGroup[0];

      // fetch hotel data if not exist
      if (!dataStore.hotelData || dataStore.hotelData.hotelId !== hotelId) {
        await dataStore.fillHotelData(hotelId);
      }
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: '發生錯誤',
        text: getErrorMessage(e),
        confirmButtonColor: '#d33',
        confirmButtonText: '確定',
      });
      return;
    }
  } else {
    // User is signed out.
    // ...
  }
};

/**
 * Maps an application to a user
 * @internal
 */
export const authUserMap = new WeakMap<FirebaseApp, Ref<Nullable<User>>>();

/**
 * Map of user promises based on the firebase application. Used by `getCurrentUser()` to return a promise that resolves
 * the current user.
 * @internal
 */
export const initialUserMap = new WeakMap<FirebaseApp, _UserState>();

/**
 * Returns a reactive variable of the currently authenticated user in the firebase app. The ref is null if no user is
 * authenticated or when the user logs out. The ref is undefined when the user is not yet loaded. Note th
 * @param name - name of the application
 */
export function useCurrentUser() {
  // TODO: write a test
  if (process.env.NODE_ENV !== 'production' && !authUserMap.has(app)) {
    throw new Error(
      `[VueFire] useCurrentUser() called before the VueFireAuth module was added to the VueFire plugin. This will fail in production.`,
    );
  }
  return authUserMap.get(app)!;
}

/**
 * Helper that returns a computed boolean that becomes `true` as soon as the current user is no longer `undefined`. Note
 * this doesn't ensure the user is logged in, only if the initial signing process has run.
 *
 * @param name - name of the application
 */
export function useIsCurrentUserLoaded() {
  const currentUser = useCurrentUser();
  return computed(() => currentUser.value !== undefined);
}

/**
 * Forcibly sets the initial user state. This is used by the server auth module to set the initial user state and make
 * `getCurrentUser()` work on the server during navigation and such.
 *
 * @internal
 *
 * @param firebaseApp - the firebase application
 * @param user - the user to set
 */
export function _setInitialUser(app: FirebaseApp, user: Ref<Nullable<User>>) {
  initialUserMap.set(app, user);
}

// @internal
type _UserState =
  // state 1 waiting for the initial load: [Promise, resolveFn]
  | [Promise<Nullable<User>>, (user: Ref<Nullable<User>>) => void]
  // state 2 loaded
  | Ref<Nullable<User>>;

/**
 * @internal
 * @param name - name of the application
 */
function _getCurrentUserState() {
  if (!initialUserMap.has(app)) {
    let resolve!: (resolvedUser: Nullable<User>) => void;
    const promise = new Promise<Nullable<User>>((_resolve) => {
      resolve = _resolve;
    });

    const userState: _UserState = [
      promise,
      (user: Ref<Nullable<User>>) => {
        initialUserMap.set(app, user);
        // resolve the actual promise
        resolve(user.value);
      },
    ];

    initialUserMap.set(app, userState);
  }

  return initialUserMap.get(app)!;
}

export function getCurrentUser(): Promise<Nullable<User>> {
  const userOrPromise = _getCurrentUserState();

  return Array.isArray(userOrPromise) ? userOrPromise[0] : Promise.resolve(userOrPromise.value);
}

export function setupOnAuthStateChanged(user: Ref<Nullable<User>>, app?: FirebaseApp) {
  const auth = getAuth(app);

  // onAuthStateChanged doesn't trigger in all scenarios like when the user goes links an existing account and their
  // data is updated
  // https://github.com/firebase/firebase-js-sdk/issues/4227
  onIdTokenChanged(auth, (userData) => {
    console.log('fire onIdTokenChanged');
    const userOrPromise = _getCurrentUserState();
    user.value = userData;
    // setup the initial user
    // afterwards, this will never be an array
    if (Array.isArray(userOrPromise)) {
      userOrPromise[1](user);
    }
  });
}

export { appCheck, initFirebase };
