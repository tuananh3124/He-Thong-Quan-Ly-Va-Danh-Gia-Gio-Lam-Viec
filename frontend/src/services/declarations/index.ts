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
  url?: string | null;
  publicationYear?: number | null;
  doi?: string | null;
  status: string;
  calculatedHours: number | null;
  academicYearId: string;
  academicYear?: AcademicYear;
  sourceId: string | null;
  source?: PublicationSource | null;
  hasEvidence?: boolean;
  evidenceOriginalName?: string | null;
  evidenceSize?: number | null;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    academicTitle?: string | null;
  };
  authors?: Array<{
    id: string;
    authorName: string;
    roleType: string;
    allocatedHours: number | null;
    allocationPercentage?: number | null;
  }>;
};

export type DeclarationAuthorRequest = {
  authorName: string;
  roleType: 'MAIN_AUTHOR' | 'CO_AUTHOR';
  allocationPercentage?: number;
};

export type ReviewDeclarationRequest = {
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
};

export type CreateDeclarationRequest = {
  activityType: string;
  name: string;
  academicYearId: string;
  sourceId?: string;
  url?: string;
  publicationYear?: number;
  doi?: string;
  authors?: DeclarationAuthorRequest[];
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

export const useUpdateDeclaration = <
  T extends IHttpGenerics = { request: CreateDeclarationRequest; response: Declaration },
>(
  id: string,
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: `/declarations/${id}`,
    method: 'patch',
    ...params,
  });

export const useUploadDeclarationEvidence = <
  T extends IHttpGenerics = { request: FormData; response: Declaration },
>(
  id: string,
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: `/declarations/${id}/evidence`,
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

export const useReviewDeclaration = <
  T extends IHttpGenerics = { request: ReviewDeclarationRequest; response: Declaration },
>(
  id: string,
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: `/declarations/${id}/review`,
    method: 'patch',
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
