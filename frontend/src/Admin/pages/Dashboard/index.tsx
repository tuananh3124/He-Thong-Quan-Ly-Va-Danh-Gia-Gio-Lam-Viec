import { useEffect } from 'react';
import { Alert, Card, Col, Row, Statistic } from 'antd';
import { CheckCircleOutlined, FileProtectOutlined, SettingOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';
import { useManagerSummary } from '@/services';

export const AdminDashboard = () => {
  const summary = useManagerSummary();

  useEffect(() => {
    summary.fetchData();
  }, []);

  return (
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
            <Statistic title="Hồ sơ chờ duyệt" value={summary.data?.totals.submitted ?? 0} prefix={<FileProtectOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Hồ sơ đã duyệt" value={summary.data?.totals.approved ?? 0} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="Tổng giờ quy đổi" value={summary.data?.totals.calculatedHours ?? 0} precision={2} prefix={<SettingOutlined />} />
          </Card>
        </Col>
      </Row>
    </Page>
  );
};
