/* eslint-disable @typescript-eslint/no-empty-function */
import { useRef, useState } from 'react';
import axios, { type AxiosResponse } from 'axios';
import { nanoid } from 'nanoid';
import { useAuth, useGlobal, useMessage } from '@/hooks';
import type { IHttpGenerics, IHttpResponse, IUseHttpProps, UseHttpState } from './types';

const translateMessage = (value: unknown): string => {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  const translations: Array<[RegExp, string]> = [
    [/^Internal server error\.?$/i, 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.'],
    [/^System upgrade in progress\.?$/i, 'Hệ thống đang được cập nhật. Vui lòng thử lại sau.'],
    [/^Timed out$/i, 'Thao tác đã hết thời gian chờ.'],
    [/^An unknown error occurred\.?$/i, 'Đã xảy ra lỗi không xác định.'],
    [/^Successfully$/i, 'Đã thực hiện thành công.'],
    [/^Invalid password$/i, 'Mật khẩu không đúng.'],
    [/^Invalid or expired refresh token$/i, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
    [/^Invalid refresh token$/i, 'Mã phiên đăng nhập không hợp lệ.'],
    [/^(?:User not found|Tenant not found)$/i, 'Không tìm thấy thông tin yêu cầu.'],
    [/^Email is already registered$/i, 'Email này đã được đăng ký.'],
    [/^Only managers can access this report$/i, 'Chỉ tài khoản quản lý mới được xem báo cáo này.'],
    [/^Only draft or rejected declarations can be edited$/i, 'Chỉ được sửa bản nháp hoặc bản kê khai bị từ chối.'],
    [/^Only draft or rejected declarations can be deleted$/i, 'Chỉ được xóa bản nháp hoặc bản kê khai bị từ chối.'],
    [/^Only submitted declarations can be reviewed$/i, 'Chỉ được xem xét bản kê khai đã gửi.'],
    [/^A rejection reason is required$/i, 'Vui lòng nhập lý do từ chối.'],
    [/^The uploaded file is not a valid PDF$/i, 'Tệp tải lên không phải là PDF hợp lệ.'],
    [/^A PDF evidence file is required$/i, 'Vui lòng chọn tệp PDF minh chứng.'],
    [/^Evidence can only be changed on draft or rejected declarations$/i, 'Chỉ được thay tệp ở bản nháp hoặc bản kê khai bị từ chối.'],
    [/^No evidence file is attached$/i, 'Bản kê khai chưa có tệp minh chứng.'],
    [/^Declaration not found$/i, 'Không tìm thấy bản kê khai.'],
    [/^Academic year not found$/i, 'Không tìm thấy năm học.'],
    [/^Publication source not found$/i, 'Không tìm thấy nguồn công bố.'],
    [/^AI service is not configured$/i, 'Dịch vụ xử lý liên kết chưa được cấu hình.'],
    [/^Cannot analyze publication URL$/i, 'Không thể lấy thông tin từ liên kết này.'],
    [/^must be an? email/i, 'Email không hợp lệ.'],
    [/^.*must be a string/i, 'Giá trị phải là văn bản.'],
    [/^.*should not be empty/i, 'Trường này không được để trống.'],
    [/^.*must be a number/i, 'Giá trị phải là số.'],
    [/^.*must be an integer/i, 'Giá trị phải là số nguyên.'],
    [/^.*must be one of the following values/i, 'Giá trị được chọn không hợp lệ.'],
    [/^.*must not be less than/i, 'Giá trị thấp hơn mức cho phép.'],
    [/^.*must not be greater than/i, 'Giá trị vượt quá mức cho phép.'],
    [/^must be a numeric id$/i, 'Mã dữ liệu không hợp lệ.'],
  ];
  const match = translations.find(([pattern]) => pattern.test(text));
  return match ? match[1] : text || 'Đã xảy ra lỗi. Vui lòng thử lại.';
};

const handleHttpError = (
  error: any,
  httpStrategy?: Record<number, () => void>,
): { message: string; code: number } => {
  const status = error?.response?.status;
  const errorMap: Record<number, string> = {
    500: 'Hệ thống đang gặp lỗi. Vui lòng thử lại sau.',
    502: 'Hệ thống đang được cập nhật. Vui lòng thử lại sau.',
    504: 'Thao tác đã hết thời gian chờ.',
  };

  const errorMessage =
    errorMap[status] ||
    translateMessage(error?.response?.data?.meta?.message || error?.message);

  if (httpStrategy?.[status]) httpStrategy[status]();

  return {
    message: errorMessage,
    code: status || 0,
  };
};

const defaultPagination = {
  totalCount: 0,
  offset: 0,
  limit: 0,
  current: 0,
};

/**
 * useHttp hook
 * @param url Request URL
 * @param method HTTP method (default 'get')
 * @param data Request body
 * @param params Request parameters
 * @param headers Custom headers
 * @param success Success callback configuration
 *   - message: default success message;
 *       - for GET requests: null (no message shown)
 *       - for other requests: 'default' (message taken from response data if available)
 *   - action: optional callback executed after a successful request, receives { data, response, pagination }
 * @param error Error callback configuration
 *   - message: default error message; 'default' uses the message extracted from the HTTP error
 *   - action: optional callback executed after a failed request, receives { data: null, response }
 */
export const useHttp = <T extends IHttpGenerics = IHttpGenerics>({
  url,
  method = 'get',
  data,
  params,
  headers,
  success = {},
  error = {},
  showLoading,
  useAntdMessage,
}: IUseHttpProps<T['response']>) => {
  type IRequestType = T['request'];
  type IResponseType = T['response'];

  const { apiBaseUrl } = useGlobal();
  const { token } = useAuth();
  const message = useMessage();

  // default message config
  const isGet = !method || method === 'get';
  if (showLoading === undefined) {
    showLoading = !isGet;
  }
  if (success.message === undefined) {
    success.message = isGet ? null : 'default';
  }
  if (error.message === undefined) {
    error.message = 'default';
  }

  const latestRequestId = useRef(0);

  const [state, setState] = useState<UseHttpState<IRequestType, IResponseType>>({
    loading: false,
    data: null,
    errorMessage: null,
    pagination: defaultPagination,
    fetchData: async () => {},
    status: undefined,
  });

  const fetchData = async (overwriteBody?: { data?: IRequestType; params?: IRequestType }) => {
    const loadingKey = nanoid();
    if (showLoading) {
      if (useAntdMessage) {
        message.loading({
          content: 'Đang xử lý...',
          key: loadingKey,
        });
      } else {
        console.warn('showLoading only can use with antd, please set useAntdMessage to true.');
      }
    }

    const { data: overwriteData, params: overwriteParams } = overwriteBody || {};

    latestRequestId.current += 1;
    const requestId = latestRequestId.current;

    try {
      setState((prev) => ({
        ...prev,
        loading: true,
      }));

      const response: AxiosResponse<IHttpResponse<IResponseType>> = await axios({
        url: `${apiBaseUrl}${url}`,
        method,
        data: overwriteData || data,
        params: overwriteParams || params,
        headers: {
          ...headers,
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (requestId !== latestRequestId.current) return;

      const responseData = response.data;

      setState({
        data: responseData.data,
        errorMessage: null,
        loading: false,
        fetchData,
        pagination: responseData.meta?.pagination ?? defaultPagination,
        status: 200,
      });

      if (success.message) {
        const isDefault = success.message === 'default';
        const responseMessage =
          typeof responseData.data === 'string' ? translateMessage(responseData.data) : 'Đã thực hiện thành công.';
        const finalMessage = isDefault ? responseMessage : success.message;
        message.success({
          key: loadingKey,
          content: finalMessage,
        });
      } else if (showLoading) message.dismiss(loadingKey);

      success.action?.({
        data: responseData.data,
        response,
        pagination: responseData.meta?.pagination ?? {
          totalCount: 0,
          offset: 0,
          limit: 0,
          current: 0,
        },
      });
    } catch (err: any) {
      if (requestId !== latestRequestId.current) return;

      const { message: errorMessage } = handleHttpError(err);

      setState({
        data: null,
        errorMessage,
        loading: false,
        fetchData,
        pagination: defaultPagination,
        status: err?.response?.status || 400,
      });

      if (error.message) {
        message.error({
          key: loadingKey,
          content: error.message === 'default' ? errorMessage : error.message,
        });
      } else if (showLoading) message.dismiss(loadingKey);

      error.action?.({
        data: null,
        response: err?.response,
        status: err?.response?.status || 400,
      });
    }
  };

  return {
    ...state,
    fetchData,
  };
};
