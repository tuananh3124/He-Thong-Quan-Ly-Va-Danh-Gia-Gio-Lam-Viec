import { Avatar, Button, Card, Descriptions, Form, Input, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';
import { useGlobal } from '@/hooks';
import { useUpdateProfile } from '@/services';
import { ROLE, STAFF_CATEGORY } from '@projectname/shared';

export const Settings: React.FC = () => {
  const { user, actions } = useGlobal();
  const [form] = Form.useForm();
  const updateProfile = useUpdateProfile({
    success: {
      message: 'Đã cập nhật hồ sơ',
      action: ({ data }) => actions.set({ user: data.user }),
    },
  });

  return (
    <Page title="Hồ sơ cá nhân">
      <Card>
        <Avatar size={72} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
        <Typography.Title level={4}>{user?.name ?? 'Người dùng'}</Typography.Title>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: user?.name,
            academicTitle: user?.academicTitle ?? undefined,
            degree: user?.degree ?? undefined,
            managementRole: user?.managementRole ?? undefined,
            department: user?.department ?? undefined,
            room: user?.room ?? undefined,
          }}
          onFinish={(values) => updateProfile.fetchData({ data: values })}
        >
          <Form.Item name="name" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="academicTitle" label="Chức danh"><Input /></Form.Item>
          <Form.Item name="degree" label="Trình độ"><Input /></Form.Item>
          <Form.Item name="managementRole" label="Chức vụ quản lý"><Input /></Form.Item>
          <Form.Item name="department" label="Khoa"><Input /></Form.Item>
          <Form.Item name="room" label="Phòng/Bộ môn"><Input /></Form.Item>
          <Button type="primary" htmlType="submit" loading={updateProfile.loading}>Lưu hồ sơ</Button>
        </Form>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Vai trò">
            <Tag color="blue">
              {user?.role === ROLE.Admin
                ? 'Quản trị viên'
                : user?.role === ROLE.Manager
                  ? 'Quản lý'
                  : user?.staffCategory === STAFF_CATEGORY.Researcher
                    ? 'Nghiên cứu viên'
                    : user?.staffCategory === STAFF_CATEGORY.Lecturer
                      ? 'Giảng viên'
                      : 'Cán bộ'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Nhóm cán bộ">
            {user?.staffCategory === STAFF_CATEGORY.Researcher
              ? 'Nghiên cứu viên'
              : user?.staffCategory === STAFF_CATEGORY.Lecturer
                ? 'Giảng viên'
                : 'Chưa cập nhật'}
          </Descriptions.Item>
          <Descriptions.Item label="Chức danh">
            {user?.academicTitle ?? 'Chưa cập nhật'}
          </Descriptions.Item>
          <Descriptions.Item label="Trình độ">{user?.degree ?? 'Chưa cập nhật'}</Descriptions.Item>
          <Descriptions.Item label="Chức vụ quản lý">
            {user?.managementRole ?? 'Không có'}
          </Descriptions.Item>
          <Descriptions.Item label="Khoa/Phòng">
            {[user?.department, user?.room].filter(Boolean).join(' / ') || 'Chưa cập nhật'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Page>
  );
};
