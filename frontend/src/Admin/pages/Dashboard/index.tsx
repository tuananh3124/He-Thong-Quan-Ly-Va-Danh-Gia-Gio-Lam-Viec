import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';
import { CheckCircleOutlined, FileProtectOutlined, SettingOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';

export const AdminDashboard = () => (
  <Page title="Tổng quan quản trị">
    <Typography.Paragraph type="secondary">
      Quản lý danh mục, quy tắc quy đổi và theo dõi hồ sơ cần phê duyệt.
    </Typography.Paragraph>
    <Alert
      showIcon
      type="info"
      message="Khu vực quản trị đang được triển khai theo từng phân hệ"
      description="Bạn có thể bắt đầu bằng việc cấu hình năm học, nguồn công bố và quy tắc quy đổi giờ."
      style={{ marginBottom: 16 }}
    />
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Hồ sơ chờ duyệt" value={0} prefix={<FileProtectOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Quy tắc đang áp dụng" value={0} prefix={<CheckCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Danh mục cần cập nhật" value={0} prefix={<SettingOutlined />} />
        </Card>
      </Col>
    </Row>
  </Page>
);
