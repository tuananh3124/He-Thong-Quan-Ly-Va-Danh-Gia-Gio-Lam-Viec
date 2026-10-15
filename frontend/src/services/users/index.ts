import { useHttp } from '@/hooks';
import type { IHttpGenerics, IHttpType } from '@/hooks/types';
import type { ROLE_TYPE, STAFF_CATEGORY_TYPE } from '@projectname/shared';

export type ManagedTenant = {
  id: string;
  businessName: string;
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: ROLE_TYPE;
  staffCategory: STAFF_CATEGORY_TYPE | null;
  tenantId: string | null;
  tenant: ManagedTenant | null;
  academicTitle: string | null;
  degree: string | null;
  managementRole: string | null;
};

export type CreateUserRequest = {
  name: string;
  email: string;
  password: string;
  role: ROLE_TYPE;
  staffCategory?: STAFF_CATEGORY_TYPE;
  tenantId?: string;
  academicTitle?: string;
  degree?: string;
  managementRole?: string;
};

export type UpdateUserRequest = Partial<Omit<CreateUserRequest, 'password'>>;

export const useManagedUsers = <
  T extends IHttpGenerics = { request: undefined; response: ManagedUser[] },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/users',
    method: 'get',
    ...params,
  });

export const useManagedTenants = <
  T extends IHttpGenerics = { request: undefined; response: ManagedTenant[] },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/users/tenants',
    method: 'get',
    ...params,
  });

export const useCreateUser = <
  T extends IHttpGenerics = { request: CreateUserRequest; response: ManagedUser },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/users',
    method: 'post',
    ...params,
  });

export const useUpdateUser = <
  T extends IHttpGenerics = { request: UpdateUserRequest; response: ManagedUser },
>(id: string, params?: IHttpType<T>) =>
  useHttp<T>({
    url: `/users/${id}`,
    method: 'patch',
    ...params,
  });