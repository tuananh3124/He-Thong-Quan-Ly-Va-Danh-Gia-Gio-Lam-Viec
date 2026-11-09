import { useGlobal } from '@/hooks';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Button, Flex, Tag, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { ROLE, STAFF_CATEGORY } from '@projectname/shared';

const pageMeta: Record<string, { title: string }> = {
  '/dashboard': { title: 'Tổng quan' },
  '/declarations': { title: 'Kê khai hoạt động' },
  '/settings/general': { title: 'Hồ sơ cá nhân' },
  '/help': { title: 'Hướng dẫn sử dụng' },
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
        <Typography.Text strong>{meta.title}</Typography.Text>
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
