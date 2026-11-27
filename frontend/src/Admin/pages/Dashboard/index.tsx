import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Select, Space, Statistic, Typography } from 'antd';
import { CheckCircleOutlined, FileProtectOutlined, SettingOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';
import { useAcademicYears, useManagerSummary } from '@/services';

export const AdminDashboard = () => {
  const academicYears = useAcademicYears({ params: { activeOnly: false } });
  const [selectedYearId, setSelectedYearId] = useState<string>();
  const summary = useManagerSummary({
    params: selectedYearId ? { academicYearId: selectedYearId } : undefined,
  });

  useEffect(() => {
    academicYears.fetchData();
  }, []);

  useEffect(() => {
    if (!selectedYearId && academicYears.data?.length) {
      const activeYear = academicYears.data.find((year) => year.isActive) ?? academicYears.data[0];
      setSelectedYearId(activeYear.id);
    }
  }, [academicYears.data, selectedYearId]);

  useEffect(() => {
    summary.fetchData();
  }, [selectedYearId]);

  return (
    <Page
      title="Tổng quan quản trị"
      actions={
        <Space>
          <Typography.Text type="secondary">Năm học</Typography.Text>
          <Select
            value={selectedYearId}
            loading={academicYears.loading}
            placeholder="Chọn năm học"
            style={{ width: 170 }}
            options={(academicYears.data ?? []).map((year) => ({ label: year.name, value: year.id }))}
            onChange={setSelectedYearId}
          />
        </Space>
      }
    >
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
