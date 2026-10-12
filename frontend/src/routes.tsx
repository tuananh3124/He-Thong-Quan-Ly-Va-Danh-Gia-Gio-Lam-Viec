import { Navigate } from 'react-router-dom';
import { Dashboard, Declarations, HelpCenter, Login, Settings as SettingPage } from '@/pages';
import type { IRouteType } from '@/types';
import { ClipboardList, HelpCircle, LayoutDashboard, Settings } from 'lucide-react';

const NotFound = () => {
  throw new Response('Not Found', {
    status: 404,
    statusText: 'Not Found',
  });
};

export const routes: IRouteType[] = [
  {
    id: '/',
    path: '/',
    element: <Navigate to="/login" />,
    handle: {
      auth: false,
      layout: 'BASIC',
    },
  },
  {
    id: 'login',
    path: '/login',
    element: <Login />,
    handle: {
      auth: false,
      layout: 'BASIC',
    },
  },
  {
    id: 'dashboard',
    path: '/dashboard',
    element: <Dashboard />,
    handle: {
      menu: {
        label: 'Tổng quan',
        icon: <LayoutDashboard size={18} />,
      },
    },
  },
  {
    id: 'declarations',
    path: '/declarations',
    element: <Declarations />,
    handle: {
      menu: {
        label: 'Kê khai hoạt động',
        icon: <ClipboardList size={18} />,
      },
    },
  },
  {
    id: 'settings',
    path: '/settings',
    handle: {
      menu: {
        label: 'Cài đặt',
        icon: <Settings size={18} />,
      },
    },
    children: [
      {
        id: 'general',
        path: 'general',
        element: <SettingPage />,
        handle: {
          menu: {
            label: 'Hồ sơ cá nhân',
          },
        },
      },
    ],
  },
  {
    id: 'help',
    path: 'help',
    element: <HelpCenter />,
    handle: {
      menu: {
        label: 'Hướng dẫn sử dụng',
        icon: <HelpCircle size={18} />,
        position: 'BOTTOM',
      },
    },
  },
  {
    id: 'not-found',
    path: '*',
    element: <NotFound />,
  },
];
