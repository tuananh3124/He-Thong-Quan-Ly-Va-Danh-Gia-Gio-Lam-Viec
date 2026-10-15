import type { ROLE_TYPE, STAFF_CATEGORY_TYPE } from '../../constants/types';

export type ILoginRequestType = {
  email: string;
  password: string;
};

export type IAuthUserType = {
  id: string;
  name: string;
  email: string;
  role: ROLE_TYPE;
  staffCategory?: STAFF_CATEGORY_TYPE | null;
  academicTitle?: string | null;
  degree?: string | null;
  managementRole?: string | null;
};

export type ILoginResponseType = {
  accessToken: string;
  refreshToken: string;
  user: IAuthUserType;
};
