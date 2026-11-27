import { Result, Button, Space } from 'antd';
import { useNavigate, useRouteError } from 'react-router-dom';
import React from 'react';
import type { ResultStatusType } from 'antd/es/result';
import { Layout } from '@/providers';
import { useAuth } from '@/hooks';

interface ErrorResultProps {
  status: ResultStatusType;
  title: string;
  subTitle?: string;
  extra?: React.ReactNode;
}

export const Error: React.FC<ErrorResultProps> = ({ status, title, subTitle, extra }) => {
  const navigate = useNavigate();
  const { logout, loginUrl } = useAuth();

  return (
    <Layout.Centered>
      <Result
        status={status}
        title={title}
        subTitle={subTitle}
        extra={
          extra || (
            <Space orientation="horizontal" size="middle" wrap>
              <Button
                onClick={() => {
                  logout({
                    message: null,
                  });
                  navigate(loginUrl, {
                    replace: true,
                  });
                }}
              >
                Quay lại đăng nhập
              </Button>
              <Button type="primary" onClick={() => window.location.reload()}>
                Thử lại
              </Button>
            </Space>
          )
        }
      />
    </Layout.Centered>
  );
};

export const ErrorPage = ({ status, errorMessage }: { status: number; errorMessage?: string }) => {
  const navigate = useNavigate();
  const { logout, loginUrl } = useAuth();

  switch (status) {
    case 401:
      return (
        <Error
          status="403"
          title="Yêu cầu đăng nhập"
          subTitle={errorMessage || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'}
          extra={
            <Button
              type="primary"
              onClick={() => {
                logout({
                  message: null,
                });
                navigate(loginUrl, {
                  replace: true,
                });
              }}
            >
              Đăng nhập để tiếp tục
            </Button>
          }
        />
      );
    case 403:
      return (
        <Error
          status="403"
          title="Không có quyền truy cập"
          subTitle={errorMessage || 'Bạn không có quyền truy cập trang này.'}
        />
      );
    case 404:
      return (
        <Error
          status="404"
          title="Không tìm thấy trang"
          subTitle={errorMessage || 'Trang bạn yêu cầu không tồn tại.'}
        />
      );
    default:
      return (
        <Error
          status="500"
          title="Đã xảy ra lỗi"
          subTitle={errorMessage || 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.'}
        />
      );
  }
};

export const RouteError: React.FC = () => {
  const error: any = useRouteError();
  const errorMessage = error.data || error.message || error.statusText;

  return <ErrorPage status={error.status} errorMessage={errorMessage} />;
};
