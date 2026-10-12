import { useHttp } from '@/hooks';
import type { IHttpGenerics, IHttpType } from '@/hooks/types';

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type PublicationSource = {
  id: string;
  name: string;
  classificationId: string;
  classification?: { id: string; name: string };
};

export type Declaration = {
  id: string;
  activityType: string;
  name: string;
  status: string;
  calculatedHours: number | null;
  academicYearId: string;
  sourceId: string | null;
  rejectionReason?: string | null;
  authors?: Array<{
    id: string;
    authorName: string;
    roleType: string;
    allocatedHours: number | null;
  }>;
};

export type CreateDeclarationRequest = {
  activityType: string;
  name: string;
  academicYearId: string;
  sourceId?: string;
  url?: string;
};

export const useDeclarations = <
  T extends IHttpGenerics = { request: { status?: string }; response: Declaration[] },
>(
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: '/declarations',
    method: 'get',
    ...params,
  });

export const useCreateDeclaration = <
  T extends IHttpGenerics = { request: CreateDeclarationRequest; response: Declaration },
>(
  params: IHttpType<T>,
) =>
  useHttp<T>({
    url: '/declarations',
    method: 'post',
    ...params,
  });

export const useCalculateDeclaration = <
  T extends IHttpGenerics = { request: undefined; response: Declaration },
>(
  id: string,
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: `/declarations/${id}/calculate`,
    method: 'post',
    ...params,
  });

export const useSubmitDeclaration = <
  T extends IHttpGenerics = { request: undefined; response: Declaration },
>(
  id: string,
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: `/declarations/${id}/submit`,
    method: 'post',
    ...params,
  });

export const useAcademicYears = <
  T extends IHttpGenerics = { request: undefined; response: AcademicYear[] },
>(
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: '/academic-years?activeOnly=true',
    method: 'get',
    ...params,
  });

export const usePublicationSources = <
  T extends IHttpGenerics = { request: undefined; response: PublicationSource[] },
>(
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: '/publication-catalog/sources',
    method: 'get',
    ...params,
  });
