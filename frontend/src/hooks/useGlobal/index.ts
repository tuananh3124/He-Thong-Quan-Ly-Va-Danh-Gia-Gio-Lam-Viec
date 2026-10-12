import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IGlobalStateType, IStateType } from './types';
import { ROLE } from '@projectname/shared';

const initData: IStateType = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL + '/api/v1',
  token: '',
  adminToken: '',
  user: null,
  role: ROLE.Staff,
  permissions: [],
  collapsed: false,
};

export const useGlobal = create<IGlobalStateType>()(
  persist(
    (set) => ({
      ...initData,

      actions: {
        set,
        reset: (state) =>
          set({
            ...initData,
            ...state,
          }),
      },
    }),
    // Persistent configuration(localStorage)
    {
      name: 'projectname',
      partialize: ({ token, adminToken, collapsed, user, role }) => ({
        token,
        adminToken,
        collapsed,
        user,
        role,
      }),
    },
  ),
);
