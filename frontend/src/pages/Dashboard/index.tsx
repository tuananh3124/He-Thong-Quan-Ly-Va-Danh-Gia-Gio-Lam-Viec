import { useEffect } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  List,
  Progress,
  Row,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Page } from '@/components/ui';
import { useAcademicYears, useDeclarations } from '@/services';

const statusLabel: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Cần bổ sung',
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const declarations = useDeclarations();
  const academicYears = useAcademicYears();

  useEffect(() => {
    declarations.fetchData();
    academicYears.fetchData();
  }, []);

  const items = declarations.data ?? [];
  const totalHours = items.reduce((total, item) => total + (item.calculatedHours ?? 0), 0);
  const submittedCount = items.filter((item) => item.status === 'SUBMITTED').length;
  const approvedCount = items.filter((item) => item.status === 'APPROVED').length;
  const progress = items.length ? Math.round((approvedCount / items.length) * 100) : 0;

  return (
    <div className="dashboard-page">
      <Page>
        <Card className="dashboard-hero" style={{ marginBottom: 16 }}>
          <Flex justify="space-between" align="center" gap="large" wrap="wrap">
            <Flex vertical gap="small" style={{ position: 'relative', zIndex: 1 }}>
              <Typography.Text style={{ color: 'rgba(255,255,255,.72)' }}>
                {academicYears.data?.[0]?.name ?? 'Năm học hiện tại'}
              </Typography.Text>
              <Typography.Title level={2} style={{ margin: 0 }}>
                Chào mừng bạn trở lại
              </Typography.Title>
              <Typography.Paragraph
                style={{ margin: 0, maxWidth: 620, color: 'rgba(255,255,255,.82)' }}
              >
                Khai báo hoạt động, đính kèm minh chứng và theo dõi số giờ làm việc tiêu chuẩn của
                bạn.
              </Typography.Paragraph>
            </Flex>
            <Button
              ghost
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/declarations')}
            >
              Mở danh sách kê khai
            </Button>
          </Flex>
        </Card>

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic title="Tổng kê khai" value={items.length} prefix={<FileTextOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="Giờ đã quy đổi"
                value={totalHours}
                suffix="giờ"
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="Chờ duyệt"
                value={submittedCount}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="stat-card">
              <Statistic
                title="Đã duyệt"
                value={approvedCount}
                prefix={<CheckCircleOutlined />}
                styles={{ content: { color: '#2f855a' } }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              className="section-card"
              title="Kê khai gần đây"
              extra={
                <Button type="link" onClick={() => navigate('/declarations')}>
                  Xem tất cả
                </Button>
              }
            >
              {items.length ? (
                <List
                  dataSource={items.slice(0, 5)}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta title={item.name} description={item.activityType} />
                      <Flex align="center" gap="middle">
                        <Typography.Text strong>{item.calculatedHours ?? 0} giờ</Typography.Text>
                        <Tag
                          color={
                            item.status === 'APPROVED'
                              ? 'green'
                              : item.status === 'REJECTED'
                                ? 'red'
                                : 'blue'
                          }
                        >
                          {statusLabel[item.status] ?? item.status}
                        </Tag>
                      </Flex>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty description="Chưa có bản kê khai" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card className="section-card" title="Tiến độ phê duyệt">
              <Flex vertical gap="middle">
                <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                  Tỷ lệ bản kê khai đã được duyệt trong năm học hiện tại.
                </Typography.Paragraph>
                <Progress type="circle" percent={progress} strokeColor="#1769aa" />
                <Typography.Text type="secondary">
                  Cập nhật tự động theo trạng thái hồ sơ của bạn.
                </Typography.Text>
              </Flex>
            </Card>
          </Col>
        </Row>
      </Page>
    </div>
  );
};
