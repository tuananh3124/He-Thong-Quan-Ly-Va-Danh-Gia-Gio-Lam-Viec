import { useEffect, useState } from 'react';
import { Button, Card, Col, Descriptions, Empty, Flex, Modal, Progress, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { BarChart3 } from 'lucide-react';
import { Page } from '@/components/ui';
import { useAcademicYears, useManagerSummary } from '@/services';
import type { ManagerSummary } from '@/services';
import { downloadCsv } from '@/utils';
import { STAFF_CATEGORY } from '@projectname/shared';

const activityLabels: Record<string, string> = {
  TEACHING: 'Giảng dạy',
  RESEARCH: 'Nghiên cứu khoa học',
  KNOWLEDGE_TRANSFER: 'Chuyển giao tri thức',
  OTHER: 'Hoạt động khác',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Cần bổ sung',
};

const staffCategoryLabel = (value?: string | null) => value === STAFF_CATEGORY.LecturerResearcher
  ? 'Giảng viên & nghiên cứu viên'
  : value === STAFF_CATEGORY.Researcher
    ? 'Nghiên cứu viên'
    : 'Giảng viên';

export const ManagerDashboard = () => {
  const academicYears = useAcademicYears({ params: { activeOnly: false } });
  const [selectedYearId, setSelectedYearId] = useState<string>();
  const summary = useManagerSummary({
    params: selectedYearId ? { academicYearId: selectedYearId } : undefined,
  });
  const [selectedStaff, setSelectedStaff] = useState<ManagerSummary['staff'][number] | null>(null);

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

  const totals = summary.data?.totals;
  const reviewed = (totals?.approved ?? 0) + (totals?.rejected ?? 0);
  const reviewRate = totals?.total ? Math.round((reviewed / totals.total) * 100) : 0;
  const staff = summary.data?.staff ?? [];
  const approvedHoursTotal = staff.reduce((total, item) => total + item.approvedHours, 0);
  const targetHoursTotal = staff.reduce((total, item) => total + item.targetHours, 0);
  const unitProgress = targetHoursTotal
    ? Math.min(Math.round((approvedHoursTotal / targetHoursTotal) * 100), 100)
    : 0;
  const activities = summary.data?.activities ?? [];
  const activityHoursTotal = activities.reduce((total, item) => total + item.calculatedHours, 0);
  const topStaff = [...staff]
    .sort((first, second) => second.approvedHours - first.approvedHours)
    .slice(0, 6);
  const topStaffMaxHours = Math.max(...topStaff.map((item) => item.approvedHours), 0);
  const selectedDeclarations = selectedStaff?.declarations ?? [];
  const selectedStatusCounts = selectedDeclarations.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
  const selectedActivityHours = selectedDeclarations
    .filter((item) => item.status === 'APPROVED')
    .reduce<Record<string, number>>((hours, item) => {
      hours[item.activityType] = (hours[item.activityType] ?? 0) + (item.calculatedHours ?? 0);
      return hours;
    }, {});
  const selectedActivityTotal = Object.values(selectedActivityHours).reduce((total, value) => total + value, 0);
  const selectedCompletedHours = selectedStaff?.approvedHours ?? 0;
  const selectedPendingHours = selectedStaff?.pendingHours ?? 0;
  const selectedMissingHours = selectedStaff
    ? Math.max(selectedStaff.targetHours - selectedCompletedHours - selectedPendingHours, 0)
    : 0;
  const selectedHoursTotal = selectedCompletedHours + selectedMissingHours + selectedPendingHours;
  const selectedCompletedPercent = selectedHoursTotal ? (selectedCompletedHours / selectedHoursTotal) * 100 : 0;
  const selectedMissingPercent = selectedHoursTotal ? (selectedMissingHours / selectedHoursTotal) * 100 : 0;
  const selectedMissingEnd = selectedCompletedPercent + selectedMissingPercent;
  const selectedPieBackground = `conic-gradient(#52c41a 0 ${selectedCompletedPercent}%, #ff4d4f ${selectedCompletedPercent}% ${selectedMissingEnd}%, #1677ff ${selectedMissingEnd}% 100%)`;
  const statusChart = [
    { key: 'APPROVED', label: 'Đã duyệt', color: '#52c41a' },
    { key: 'SUBMITTED', label: 'Chờ duyệt', color: '#1677ff' },
    { key: 'REJECTED', label: 'Cần bổ sung', color: '#ff4d4f' },
    { key: 'DRAFT', label: 'Bản nháp', color: '#8c8c8c' },
  ];

  const exportSummary = () => {
    downloadCsv(
      `bao-cao-don-vi-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Cán bộ', 'Email', 'Nhóm', 'Số bản kê khai', 'Chờ duyệt', 'Đã duyệt', 'Bị từ chối', 'Giờ quy đổi'],
      (summary.data?.staff ?? []).map((item) => [
        item.name,
        item.email,
        staffCategoryLabel(item.staffCategory),
        item.declarationCount,
        item.submittedCount,
        item.approvedCount,
        item.rejectedCount,
        item.calculatedHours,
      ]),
    );
  };

  return (
    <Page
      title="Tổng quan đơn vị"
      actions={
        <Space wrap>
          <Typography.Text type="secondary">Năm học</Typography.Text>
          <Select
            value={selectedYearId}
            loading={academicYears.loading}
            placeholder="Chọn năm học"
            style={{ width: 170 }}
            options={(academicYears.data ?? []).map((year) => ({ label: year.name, value: year.id }))}
            onChange={(value) => {
              setSelectedStaff(null);
              setSelectedYearId(value);
            }}
          />
          <Button icon={<DownloadOutlined />} onClick={exportSummary}>
            Xuất báo cáo
          </Button>
          <BarChart3 size={22} />
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Đang xem dữ liệu năm học: <Typography.Text strong>{summary.data?.academicYear?.name ?? 'Chưa có năm học'}</Typography.Text>
      </Typography.Paragraph>
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

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card title="Tiến độ định mức toàn đơn vị">
            <Flex vertical align="center" gap="small">
              <Progress type="circle" percent={unitProgress} strokeColor="#1769aa" />
              <Typography.Text strong>
                {approvedHoursTotal.toFixed(2)} / {targetHoursTotal.toFixed(2)} giờ đã duyệt
              </Typography.Text>
              <Typography.Text type="secondary">
                Tổng hợp theo từng nhân viên trong đơn vị
              </Typography.Text>
            </Flex>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Phân bố giờ theo hoạt động">
            <Space direction="vertical" style={{ width: '100%' }}>
              {activities.length ? activities.map((activity) => {
                const percent = activityHoursTotal
                  ? Math.round((activity.calculatedHours / activityHoursTotal) * 100)
                  : 0;
                return (
                  <div key={activity.activityType}>
                    <Flex justify="space-between" align="center">
                      <Typography.Text>{activityLabels[activity.activityType] ?? activity.activityType}</Typography.Text>
                      <Typography.Text strong>{activity.calculatedHours.toFixed(2)} giờ</Typography.Text>
                    </Flex>
                    <Progress percent={percent} showInfo={false} strokeColor="#6b5dd3" />
                  </div>
                );
              }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu" />}
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Nhân viên có nhiều giờ đã duyệt nhất">
            <Space direction="vertical" style={{ width: '100%' }}>
              {topStaff.length ? topStaff.map((item) => (
                <div key={item.id}>
                  <Flex justify="space-between" align="center">
                    <Typography.Link onClick={() => setSelectedStaff(item)}>{item.name}</Typography.Link>
                    <Typography.Text strong>{item.approvedHours.toFixed(2)} giờ</Typography.Text>
                  </Flex>
                  <Progress
                    percent={topStaffMaxHours ? Math.round((item.approvedHours / topStaffMaxHours) * 100) : 0}
                    showInfo={false}
                    strokeColor="#2f855a"
                  />
                </div>
              )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu" />}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title="Thống kê theo cán bộ"
        extra={<Typography.Text type="secondary">Bấm vào một nhân viên để xem chi tiết</Typography.Text>}
        style={{ marginTop: 16 }}
      >
        <Table
          rowKey="id"
          loading={summary.loading}
          dataSource={summary.data?.staff ?? []}
          scroll={{ x: 900 }}
          onRow={(item) => ({
            onClick: () => setSelectedStaff(item),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'Cán bộ',
              render: (_: unknown, item: ManagerSummary['staff'][number]) => <>
                <Typography.Text strong>{item.name}</Typography.Text><br />
                <Typography.Text type="secondary">{item.email}</Typography.Text>
              </>,
            },
            {
              title: 'Nhóm',
              dataIndex: 'staffCategory',
              render: (value: string | null) => <Tag color={value === STAFF_CATEGORY.LecturerResearcher ? 'purple' : value === STAFF_CATEGORY.Researcher ? undefined : 'blue'}>{staffCategoryLabel(value)}</Tag>,
            },
            { title: 'Số bản kê khai', dataIndex: 'declarationCount' },
            { title: 'Chờ duyệt', dataIndex: 'submittedCount' },
            { title: 'Đã duyệt', dataIndex: 'approvedCount' },
            { title: 'Giờ đã duyệt', dataIndex: 'approvedHours', render: (value: number) => value.toFixed(2) },
            { title: 'Còn thiếu', dataIndex: 'remainingHours', render: (value: number) => `${value.toFixed(2)} giờ` },
            { title: 'Tiến độ', dataIndex: 'progressPercent', render: (value: number) => `${value}%` },
          ]}
        />
      </Card>

      <Modal
        open={Boolean(selectedStaff)}
        title={selectedStaff ? `Tiến độ của ${selectedStaff.name}` : 'Chi tiết nhân viên'}
        footer={null}
        width={900}
        onCancel={() => setSelectedStaff(null)}
      >
        {selectedStaff ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Nhóm">{staffCategoryLabel(selectedStaff.staffCategory)}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedStaff.email}</Descriptions.Item>
              <Descriptions.Item label="Định mức">{selectedStaff.targetHours.toFixed(2)} giờ</Descriptions.Item>
              <Descriptions.Item label="Đã duyệt">{selectedStaff.approvedHours.toFixed(2)} giờ</Descriptions.Item>
              <Descriptions.Item label="Còn thiếu">{selectedStaff.remainingHours.toFixed(2)} giờ</Descriptions.Item>
              <Descriptions.Item label="Tiến độ">{selectedStaff.progressPercent}%</Descriptions.Item>
            </Descriptions>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Typography.Text strong>Phân bổ giờ theo tiến độ</Typography.Text>
                <Flex align="center" gap="large" style={{ marginTop: 12 }}>
                  <div
                    role="img"
                    aria-label={`Đã hoàn thành ${selectedCompletedHours.toFixed(2)} giờ, còn thiếu ${selectedMissingHours.toFixed(2)} giờ, đang chờ duyệt ${selectedPendingHours.toFixed(2)} giờ`}
                    style={{
                      width: 156,
                      height: 156,
                      borderRadius: '50%',
                      background: selectedPieBackground,
                      position: 'relative',
                      flex: '0 0 auto',
                    }}
                  >
                    <Flex
                      vertical
                      align="center"
                      justify="center"
                      style={{
                        position: 'absolute',
                        inset: 22,
                        borderRadius: '50%',
                        background: '#fff',
                      }}
                    >
                      <Typography.Text strong style={{ fontSize: 20 }}>
                        {selectedStaff.progressPercent}%
                      </Typography.Text>
                      <Typography.Text type="secondary">đã duyệt</Typography.Text>
                    </Flex>
                  </div>
                  <Space direction="vertical" size="small">
                    <Flex align="center" gap="small">
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#52c41a' }} />
                      <Typography.Text>Đã hoàn thành: {selectedCompletedHours.toFixed(2)} giờ</Typography.Text>
                    </Flex>
                    <Flex align="center" gap="small">
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4d4f' }} />
                      <Typography.Text>Còn thiếu: {selectedMissingHours.toFixed(2)} giờ</Typography.Text>
                    </Flex>
                    <Flex align="center" gap="small">
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1677ff' }} />
                      <Typography.Text>Đang chờ duyệt: {selectedPendingHours.toFixed(2)} giờ</Typography.Text>
                    </Flex>
                  </Space>
                </Flex>
              </Col>
              <Col xs={24} md={12}>
                <Typography.Text strong>Trạng thái bản kê khai</Typography.Text>
                <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size="small">
                  {statusChart.map((status) => {
                    const count = selectedStatusCounts[status.key] ?? 0;
                    const percent = selectedDeclarations.length
                      ? Math.round((count / selectedDeclarations.length) * 100)
                      : 0;
                    return (
                      <Flex key={status.key} align="center" gap="small">
                        <Typography.Text style={{ width: 88 }}>{status.label}</Typography.Text>
                        <Progress percent={percent} showInfo={false} strokeColor={status.color} style={{ flex: 1 }} />
                        <Typography.Text>{count}</Typography.Text>
                      </Flex>
                    );
                  })}
                </Space>
              </Col>
            </Row>
            <div>
              <Typography.Text strong>Giờ đã duyệt theo loại hoạt động</Typography.Text>
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                {Object.entries(selectedActivityHours).length ? Object.entries(selectedActivityHours).map(([activityType, hours]) => (
                  <div key={activityType}>
                    <Flex justify="space-between">
                      <Typography.Text>{activityLabels[activityType] ?? activityType}</Typography.Text>
                      <Typography.Text strong>{hours.toFixed(2)} giờ</Typography.Text>
                    </Flex>
                    <Progress
                      percent={selectedActivityTotal ? Math.round((hours / selectedActivityTotal) * 100) : 0}
                      showInfo={false}
                      strokeColor="#6b5dd3"
                    />
                  </div>
                )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có giờ được duyệt" />}
              </Space>
            </div>
            <div>
              <Typography.Text strong>Cần xử lý</Typography.Text>
              {selectedStaff.needsAttention.length ? selectedStaff.needsAttention.map((item) => (
                <Typography.Paragraph key={item} type="warning" style={{ margin: '8px 0 0' }}>• {item}</Typography.Paragraph>
              )) : <Typography.Paragraph type="success">Đã hoàn thành định mức.</Typography.Paragraph>}
            </div>
            {selectedStaff.declarations.length ? (
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={selectedStaff.declarations}
                columns={[
                  { title: 'Hoạt động', dataIndex: 'name' },
                  { title: 'Loại', render: (_: unknown, item: { activityType: string }) => activityLabels[item.activityType] ?? item.activityType },
                  { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'APPROVED' ? 'green' : value === 'REJECTED' ? 'red' : 'blue'}>{statusLabels[value] ?? value}</Tag> },
                  { title: 'Giờ', dataIndex: 'calculatedHours', render: (value: number | null) => value == null ? 'Chưa tính' : value.toFixed(2) },
                ]}
              />
            ) : <Empty description="Nhân viên chưa có bản kê khai" />}
          </Space>
        ) : null}
      </Modal>

    </Page>
  );
};
