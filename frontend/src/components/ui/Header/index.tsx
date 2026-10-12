import { Flex, Tag, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { useGlobal } from '@/hooks';

const { Title, Text } = Typography;

type IPropsType = {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
};

export const Header = ({ icon, title, description, action }: IPropsType) => {
  const location = useLocation();
  const { user } = useGlobal();
  const pageTitle =
    location.pathname === '/dashboard'
      ? 'Tổng quan'
      : location.pathname === '/declarations'
        ? 'Kê khai hoạt động'
        : title;

  return (
    <Flex align="center" justify="space-between" style={{ margin: '12px 0' }} wrap="wrap">
      <Flex align="center" gap="middle">
        {icon && (
          <Flex justify="center" align="center">
            {icon}
          </Flex>
        )}
        <Flex vertical>
          <Title level={5} style={{ margin: 0 }}>
            {pageTitle}
          </Title>
          {description && <Text type="secondary">{description}</Text>}
        </Flex>
      </Flex>
      <Flex align="center" gap="middle">
        {user && <Tag color="blue">{user.role === 'Admin' ? 'Quản trị viên' : 'Cán bộ'}</Tag>}
        {action}
      </Flex>
    </Flex>
  );
};
