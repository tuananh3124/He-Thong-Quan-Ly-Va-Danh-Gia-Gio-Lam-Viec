import { Alert, Card, Col, Row, Statistic } from 'antd';
import { CheckCircleOutlined, FileProtectOutlined, SettingOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';

export const AdminDashboard = () => (
  <Page title="Tổng quan quản trị">
    <Alert
      showIcon
      type="info"
      message="Cấu hình năm học, nguồn công bố và quy tắc quy đổi giờ tại các phân hệ quản trị."
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
