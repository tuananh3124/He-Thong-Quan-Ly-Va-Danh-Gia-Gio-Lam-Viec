import { BookOpen, CalendarDays, Gauge, Scale, Users } from 'lucide-react';
import type { IRouteType } from '@/types';
import { AdminLogin, Configuration, Users as UsersPage } from './pages';
import { AdminDashboard } from './pages/Dashboard';

export const adminRoutes: IRouteType[] = [
  {
    id: 'admin',
    path: '/admin',
    element: <AdminLogin />,
    handle: {
      auth: false,
      layout: 'BASIC',
    },
  },
  {
    id: 'admin/login',
    path: '/admin/login',
    element: <AdminLogin />,
    handle: {
      auth: false,
      layout: 'BASIC',
    },
  },
  {
    id: 'admin/dashboard',
    path: '/admin/dashboard',
    element: <AdminDashboard />,
    handle: {
      role: ['Admin'],
      menu: {
        label: 'Dashboard',
        icon: <Gauge size={18} />,
      },
    },
  },
  {
    id: 'admin/users',
    path: '/admin/users',
    element: <UsersPage />,
    handle: {
      role: ['Admin'],
      menu: {
        label: 'Người dùng & phân quyền',
        icon: <Users size={18} />,
      },
    },
  },
  {
    id: 'admin/academic-years',
    path: '/admin/academic-years',
    element: <Configuration />,
    handle: {
      role: ['Admin'],
      menu: {
        label: 'Năm học',
        icon: <CalendarDays size={18} />,
      },
    },
  },
  {
    id: 'admin/publication-sources',
    path: '/admin/publication-sources',
    element: <Configuration defaultTab="catalog" />,
    handle: {
      role: ['Admin'],
      menu: {
        label: 'Nguồn công bố',
        icon: <BookOpen size={18} />,
      },
    },
  },
  {
    id: 'admin/conversion-rules',
    path: '/admin/conversion-rules',
    element: <Configuration defaultTab="rules" />,
    handle: {
      role: ['Admin'],
      menu: {
        label: 'Luật quy đổi giờ',
        icon: <Scale size={18} />,
      },
    },
  },
];
