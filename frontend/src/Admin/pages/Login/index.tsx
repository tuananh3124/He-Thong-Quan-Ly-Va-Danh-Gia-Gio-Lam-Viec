import { Button, Form, Input, Typography, Flex } from 'antd';
import { useAdminLogin } from '@/services';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGlobal, useMobile } from '@/hooks';
import type { ILoginRequestType } from '@projectname/shared';

const { Title, Text } = Typography;

export const AdminLogin = () => {
  const navigate = useNavigate();
  const { actions } = useGlobal();
  const { dashboardUrl } = useAuth();
  const mobile = useMobile();

  const [form] = Form.useForm();

  const { fetchData, loading } = useAdminLogin({
    showLoading: true,
    success: {
      message: null,
      action: ({ data }) => {
        if (data) {
          actions.set({ adminToken: data.accessToken, user: data.user, role: data.user.role });
          navigate(dashboardUrl);
        }
      },
    },
  });

  const handleSubmit = async (values: ILoginRequestType) => {
    fetchData({
      data: {
        email: values.email,
        password: values.password,
      },
    });
  };

  return (
    <Flex vertical align="center" gap="large" style={{ width: mobile ? '100%' : '50%' }}>
      <div style={{ textAlign: 'center' }}>
        <Title level={2}>Cổng quản trị</Title>
        <Text type="secondary">Đăng nhập để quản lý quy định và phê duyệt kê khai</Text>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ width: '100%' }}>
        <Form.Item
          label="Email quản trị"
          name="email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            {
              type: 'email',
              message: 'Email không hợp lệ',
            },
          ]}
        >
          <Input placeholder="m@example.com" />
        </Form.Item>

        <Form.Item
          label="Mật khẩu"
          name="password"
          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
        >
          <Input.Password onPressEnter={() => form.submit()} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Đăng nhập
          </Button>
        </Form.Item>
      </Form>
    </Flex>
  );
};
