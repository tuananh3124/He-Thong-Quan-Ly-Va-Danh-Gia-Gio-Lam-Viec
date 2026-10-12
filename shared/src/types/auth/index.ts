import type { ROLE_TYPE } from '../../constants/roles/types';

export type ILoginRequestType = {
  email: string;
  password: string;
};

export type IAuthUserType = {
  id: string;
  name: string;
  email: string;
  role: ROLE_TYPE;
  academicTitle?: string | null;
  degree?: string | null;
  managementRole?: string | null;
};

export type ILoginResponseType = {
  accessToken: string;
  refreshToken: string;
  user: IAuthUserType;
};
