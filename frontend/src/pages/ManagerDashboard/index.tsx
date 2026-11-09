import { useEffect } from 'react';
import { Card, Col, Progress, Row, Statistic, Table, Tag, Typography } from 'antd';
import { BarChart3 } from 'lucide-react';
import { Page } from '@/components/ui';
import { useManagerSummary } from '@/services';

const activityLabels: Record<string, string> = {
  TEACHING: 'Giảng dạy',
  RESEARCH: 'Nghiên cứu khoa học',
  KNOWLEDGE_TRANSFER: 'Chuyển giao tri thức',
  OTHER: 'Hoạt động khác',
};

export const ManagerDashboard = () => {
  const summary = useManagerSummary();

  useEffect(() => {
    summary.fetchData();
  }, []);

  const totals = summary.data?.totals;
  const reviewed = (totals?.approved ?? 0) + (totals?.rejected ?? 0);
  const reviewRate = totals?.total ? Math.round((reviewed / totals.total) * 100) : 0;

  return (
    <Page title="Thống kê đơn vị" actions={<BarChart3 size={22} />}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Tổng bản kê khai" value={totals?.total ?? 0} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Chờ duyệt" value={totals?.submitted ?? 0} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Đã duyệt" value={totals?.approved ?? 0} valueStyle={{ color: '#389e0d' }} /></Card></Col>
        <Col xs={24} sm={12} lg={6}><Card><Statistic title="Tổng giờ quy đổi" value={totals?.calculatedHours ?? 0} precision={2} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card title="Tiến độ xử lý">
            <Progress type="circle" percent={reviewRate} />
            <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
              Đã xử lý {reviewed}/{totals?.total ?? 0} bản kê khai
            </Typography.Paragraph>
            <Typography.Text>Nháp: {totals?.draft ?? 0}</Typography.Text><br />
            <Typography.Text type="warning">Từ chối: {totals?.rejected ?? 0}</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Giờ quy đổi theo loại hoạt động">
            <Table
              rowKey="activityType"
              pagination={false}
              loading={summary.loading}
              dataSource={summary.data?.activities ?? []}
              columns={[
                { title: 'Loại hoạt động', render: (_: unknown, item: { activityType: string }) => activityLabels[item.activityType] ?? item.activityType },
                { title: 'Số lượng', dataIndex: 'declarationCount' },
                { title: 'Giờ quy đổi', dataIndex: 'calculatedHours', render: (value: number) => value.toFixed(2) },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Thống kê theo cán bộ" style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          loading={summary.loading}
          dataSource={summary.data?.staff ?? []}
          scroll={{ x: 900 }}
          columns={[
            { title: 'Cán bộ', render: (_: unknown, item: { name: string; email: string }) => <><Typography.Text>{item.name}</Typography.Text><br /><Typography.Text type="secondary">{item.email}</Typography.Text></> },
            { title: 'Nhóm', dataIndex: 'staffCategory', render: (value: string | null) => value === 'RESEARCHER' ? <Tag>Nghiên cứu viên</Tag> : <Tag color="blue">Giảng viên</Tag> },
            { title: 'Số bản kê khai', dataIndex: 'declarationCount' },
            { title: 'Chờ duyệt', dataIndex: 'submittedCount' },
            { title: 'Đã duyệt', dataIndex: 'approvedCount' },
            { title: 'Giờ quy đổi', dataIndex: 'calculatedHours', render: (value: number) => value.toFixed(2) },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="Theo khoa">
            <Table
              rowKey="department"
              pagination={false}
              loading={summary.loading}
              dataSource={summary.data?.departments ?? []}
              columns={[
                { title: 'Khoa', dataIndex: 'department' },
                { title: 'Số bản kê khai', dataIndex: 'declarationCount' },
                { title: 'Giờ quy đổi', dataIndex: 'calculatedHours', render: (value: number) => value.toFixed(2) },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Theo phòng/bộ môn">
            <Table
              rowKey="room"
              pagination={false}
              loading={summary.loading}
              dataSource={summary.data?.rooms ?? []}
              columns={[
                { title: 'Phòng/Bộ môn', dataIndex: 'room' },
                { title: 'Số bản kê khai', dataIndex: 'declarationCount' },
                { title: 'Giờ quy đổi', dataIndex: 'calculatedHours', render: (value: number) => value.toFixed(2) },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </Page>
  );
};
