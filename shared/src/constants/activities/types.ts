import { ACTIVITY_TYPE } from '.';

export type ACTIVITY_TYPE_VALUE = (typeof ACTIVITY_TYPE)[keyof typeof ACTIVITY_TYPE];
