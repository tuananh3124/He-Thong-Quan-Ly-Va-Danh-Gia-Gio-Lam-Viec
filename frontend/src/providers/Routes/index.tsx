import { createBrowserRouter, type RouteObject, RouterProvider } from 'react-router-dom';
import { useMemo } from 'react';
import { routes } from '@/routes';
import { LayoutProvider } from '../Layout';
import { RouteError } from '@/components';
import { useGlobal } from '@/hooks';
import { hasAnyPermission } from '@/utils';
import type { ILayoutType, IMenuPositionType, IRouteType } from '@/types';
import type { PERMISSION_TYPE, ROLE_TYPE } from '@projectname/shared';
import { adminRoutes } from '@/Admin/routes';

const normalizeRoutes = (
  routes: IRouteType[],
  params: {
    permissions: PERMISSION_TYPE[];
    role: ROLE_TYPE;
  },
): IRouteType[] => {
  const { permissions, role } = params;

  return routes.flatMap((route) => {
    const handle = {
      auth: true,
      layout: 'DEFAULT' as ILayoutType,
      permissions: [],
      ...route.handle,
      menu: route.handle?.menu
        ? {
            position: 'TOP' as IMenuPositionType,
            ...route.handle?.menu,
          }
        : undefined,
    };
    const { permissions: routePermissions } = handle;
    const routeRoles = handle.role ?? [];

    if (
      !hasAnyPermission(permissions, routePermissions) ||
      (routeRoles.length > 0 && !routeRoles.includes(role))
    ) {
      return [];
    }

    return [
      {
        ...route,
        handle,
        children: route.children
          ? normalizeRoutes(route.children, {
              permissions,
              role,
            })
          : undefined,
      },
    ];
  });
};

export const Routes = () => {
  const { permissions, role } = useGlobal();

  const finalRoutes = useMemo(() => {
    let mergedRoutes = routes;

    return normalizeRoutes(mergedRoutes, {
      permissions,
      role,
    });
  }, [permissions, role]);

  const finalAdminRoutes = useMemo(
    () =>
      normalizeRoutes(adminRoutes, {
        permissions,
        role,
      }),
    [permissions, role],
  );

  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: '/',
          element: <LayoutProvider routes={finalRoutes} />,
          children: finalRoutes as RouteObject[],
          errorElement: <RouteError />,
        },
        {
          path: '/admin',
          element: <LayoutProvider routes={finalAdminRoutes} />,
          children: finalAdminRoutes as RouteObject[],
          errorElement: <RouteError />,
        },
      ]),
    [finalRoutes, finalAdminRoutes],
  );

  return <RouterProvider router={router} />;
};
