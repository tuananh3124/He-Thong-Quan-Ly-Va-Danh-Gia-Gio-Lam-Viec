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

const ANNUAL_TARGET_HOURS = 1760;

export const Dashboard = () => {
  const navigate = useNavigate();
  const declarations = useDeclarations();
  const academicYears = useAcademicYears();

  useEffect(() => {
    declarations.fetchData();
    academicYears.fetchData();

    const refreshVisibleData = () => {
      if (document.visibilityState === 'visible') declarations.fetchData();
    };
    const interval = window.setInterval(refreshVisibleData, 15000);
    window.addEventListener('focus', refreshVisibleData);
    document.addEventListener('visibilitychange', refreshVisibleData);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshVisibleData);
      document.removeEventListener('visibilitychange', refreshVisibleData);
    };
  }, []);

  const items = declarations.data ?? [];
  const totalHours = items.reduce((total, item) => total + (item.calculatedHours ?? 0), 0);
  const submittedCount = items.filter((item) => item.status === 'SUBMITTED').length;
  const approvedCount = items.filter((item) => item.status === 'APPROVED').length;
  const progress = items.length ? Math.round((approvedCount / items.length) * 100) : 0;
  const remainingHours = Math.max(ANNUAL_TARGET_HOURS - totalHours, 0);
  const hoursProgress = Math.min(
    Math.round((totalHours / ANNUAL_TARGET_HOURS) * 100),
    100,
  );

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
                Tổng quan công việc
              </Typography.Title>
            </Flex>
            <Button
              className="dashboard-hero-action"
              ghost
              type="primary"
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/declarations')}
            >
              Xem kê khai
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

        <Card className="section-card" title="Tiến độ giờ làm việc" style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Statistic title="Đã có" value={totalHours} precision={2} suffix="giờ" />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Định mức năm học"
                value={ANNUAL_TARGET_HOURS}
                suffix="giờ"
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Còn thiếu để hoàn thành"
                value={remainingHours}
                precision={2}
                suffix="giờ"
                styles={{ content: { color: remainingHours ? '#d46b08' : '#2f855a' } }}
              />
            </Col>
          </Row>
          <Flex vertical gap="small" style={{ marginTop: 20 }}>
            <Flex justify="space-between">
              <Typography.Text strong>Tiến độ hoàn thành</Typography.Text>
              <Typography.Text type="secondary">{hoursProgress}%</Typography.Text>
            </Flex>
            <Progress percent={hoursProgress} strokeColor="#1769aa" />
            <Typography.Text type="secondary">
              Theo định mức tổng 1.760 giờ làm việc trong năm học.
            </Typography.Text>
          </Flex>
        </Card>

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
                <Progress type="circle" percent={progress} strokeColor="#1769aa" />
                <Typography.Text type="secondary">
                  {approvedCount}/{items.length} bản kê khai đã duyệt
                </Typography.Text>
              </Flex>
            </Card>
          </Col>
        </Row>
      </Page>
    </div>
  );
};
