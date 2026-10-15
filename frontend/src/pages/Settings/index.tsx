import { Avatar, Card, Descriptions, Tag, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';
import { useGlobal } from '@/hooks';
import { ROLE, STAFF_CATEGORY } from '@projectname/shared';

export const Settings: React.FC = () => {
  const { user } = useGlobal();

  return (
    <Page title="Hồ sơ cá nhân">
      <Card>
        <Avatar size={72} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
        <Typography.Title level={4}>{user?.name ?? 'Người dùng'}</Typography.Title>
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
        </Descriptions>
      </Card>
    </Page>
  );
};
