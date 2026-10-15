import { useGlobal } from '@/hooks';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Flex, Tag, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { ROLE, STAFF_CATEGORY } from '@projectname/shared';

const pageMeta: Record<string, { title: string; description: string }> = {
  '/dashboard': {
    title: 'Tổng quan',
    description: 'Theo dõi tiến độ hoàn thành giờ làm việc trong năm học',
  },
  '/declarations': {
    title: 'Kê khai hoạt động',
    description: 'Quản lý hoạt động giảng dạy, nghiên cứu và chuyên môn',
  },
  '/settings/general': {
    title: 'Hồ sơ cá nhân',
    description: 'Thông tin chức danh và tài khoản của bạn',
  },
  '/help': {
    title: 'Hướng dẫn sử dụng',
    description: 'Các bước kê khai và gửi minh chứng',
  },
};

export const Header = () => {
  const { collapsed, actions, user } = useGlobal();
  const { pathname } = useLocation();
  const meta = pageMeta[pathname] ?? pageMeta['/dashboard'];

  return (
    <Flex
      justify="space-between"
      align="center"
      style={{
        width: '100%',
      }}
    >
      <Flex align="center" gap="middle">
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => actions.set({ collapsed: !collapsed })}
          size="large"
        />
        <Flex vertical>
          <Typography.Text strong>{meta.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {meta.description}
          </Typography.Text>
        </Flex>
      </Flex>
      <Flex align="center" gap="small">
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
        <Typography.Text type="secondary" ellipsis style={{ maxWidth: 180 }}>
          {user?.name}
        </Typography.Text>
      </Flex>
    </Flex>
  );
};
