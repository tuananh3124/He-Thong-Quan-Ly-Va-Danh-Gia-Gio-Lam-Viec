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
  conversionRuleCode?: string | null;
  quantity?: number;
  hasEvidence?: boolean;
  evidenceOriginalName?: string | null;
  evidenceSize?: number | null;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  aiConfidence?: number | null;
  aiProcessedAt?: string | null;
  aiRawResult?: {
    activity_type?: string;
    title?: string | null;
    authors?: string[];
    doi?: string | null;
    publication_year?: number | null;
    needs_review?: boolean;
    model?: string;
  } | null;
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
  name?: string;
  academicYearId: string;
  conversionRuleCode?: string;
  quantity?: number;
  sourceId?: string;
  url?: string;
  publicationYear?: number;
  doi?: string;
  authors?: DeclarationAuthorRequest[];
};

export type DeclarationUrlMetadata = {
  source_url: string;
  content_type: string;
  document_type: string;
  activity_type: string;
  suggested_rule_code?: string | null;
  title?: string | null;
  authors?: string[];
  doi?: string | null;
  publication_year?: number | null;
  source_name?: string | null;
  confidence: number;
  needs_review: boolean;
  model: string;
  warnings?: string[];
};

export type ConversionRule = {
  id: string;
  code?: string | null;
  label?: string | null;
  activityType: string;
  unit?: string | null;
  hours: number;
  minHours?: number | null;
  maxHours?: number | null;
  priority: number;
  classificationId?: string | null;
  classification?: { id: string; name: string } | null;
  conditions?: string | null;
  academicYearId?: string | null;
  academicYear?: AcademicYear | null;
};

export type ManagerSummary = {
  totals: {
    total: number;
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    calculatedHours: number;
  };
  staff: Array<{
    id: string;
    name: string;
    email: string;
    staffCategory?: string | null;
    declarationCount: number;
    calculatedHours: number;
    submittedCount: number;
    approvedCount: number;
    rejectedCount: number;
    department?: string | null;
    room?: string | null;
  }>;
  departments: Array<{ department: string; declarationCount: number; calculatedHours: number }>;
  rooms: Array<{ room: string; declarationCount: number; calculatedHours: number }>;
  activities: Array<{
    activityType: string;
    declarationCount: number;
    calculatedHours: number;
  }>;
};

export type PublicationClassification = {
  id: string;
  name: string;
  description?: string | null;
  sources?: PublicationSource[];
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

export const useAnalyzeDeclarationUrl = <
  T extends IHttpGenerics = { request: { url: string }; response: DeclarationUrlMetadata },
>(
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: '/declarations/metadata-from-url',
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
    url: '/academic-years',
    method: 'get',
    params: { activeOnly: true },
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

export const useConversionRules = <
  T extends IHttpGenerics = { request: { activityType?: string }; response: ConversionRule[] },
>(
  params?: IHttpType<T>,
) =>
  useHttp<T>({
    url: '/conversion-rules',
    method: 'get',
    ...params,
  });

export const useManagerSummary = <
  T extends IHttpGenerics = { request: undefined; response: ManagerSummary },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/declarations/manager-summary',
    method: 'get',
    ...params,
  });

export const usePublicationClassifications = <
  T extends IHttpGenerics = { request: undefined; response: PublicationClassification[] },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/publication-catalog/classifications',
    method: 'get',
    ...params,
  });

export const useCreatePublicationClassification = <
  T extends IHttpGenerics = {
    request: { name: string; description?: string };
    response: PublicationClassification;
  },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/publication-catalog/classifications',
    method: 'post',
    ...params,
  });

export const useCreatePublicationSource = <
  T extends IHttpGenerics = {
    request: { name: string; classificationId: string };
    response: PublicationSource;
  },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/publication-catalog/sources',
    method: 'post',
    ...params,
  });

export const useCreateAcademicYear = <
  T extends IHttpGenerics = {
    request: { name: string; startDate: string; endDate: string; isActive?: boolean };
    response: AcademicYear;
  },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/academic-years',
    method: 'post',
    ...params,
  });

export const useCreateConversionRule = <
  T extends IHttpGenerics = {
    request: {
      code?: string;
      label?: string;
      activityType: string;
      unit?: string;
      classificationId?: string;
      academicYearId?: string;
      hours: number;
      minHours?: number;
      maxHours?: number;
      priority?: number;
      conditions?: string;
    };
    response: ConversionRule;
  },
>(params?: IHttpType<T>) =>
  useHttp<T>({
    url: '/conversion-rules',
    method: 'post',
    ...params,
  });
