import { Button, Card, Form, Input, Typography, Flex } from 'antd';
import { useLogin } from '@/services';
import { useNavigate } from 'react-router-dom';
import { useAuth, useGlobal, useMobile } from '@/hooks';
import type { ILoginRequestType } from '@projectname/shared';
import logo from '@/assets/logo/logo.svg';

const { Title, Text } = Typography;

export const Login = () => {
  const navigate = useNavigate();
  const { actions } = useGlobal();
  const mobile = useMobile();
  const { dashboardUrl } = useAuth();

  const [form] = Form.useForm();

  const { fetchData, loading } = useLogin({
    showLoading: true,
    success: {
      message: null,
      action: ({ data }) => {
        if (data) {
          actions.set({ token: data.accessToken, user: data.user, role: data.user.role });
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
    <Card
      variant="borderless"
      style={{ width: mobile ? '100%' : 420, boxShadow: '0 18px 50px rgba(23, 105, 170, .12)' }}
    >
      <Flex vertical align="center" gap="small" style={{ marginBottom: 28 }}>
        <img src={logo} alt="Giờ chuẩn" style={{ width: 56, height: 56 }} />
        <Title level={2} style={{ margin: 0 }}>
          Đăng nhập hệ thống
        </Title>
        <Text type="secondary">Quản lý và đánh giá giờ làm việc tiêu chuẩn</Text>
      </Flex>

      <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ width: '100%' }}>
        <Form.Item
          label="Email công vụ"
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
    </Card>
  );
};
