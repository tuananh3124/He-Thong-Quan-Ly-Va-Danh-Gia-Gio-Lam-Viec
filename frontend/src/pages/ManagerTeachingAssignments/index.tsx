import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Card, Col, Row, Select, Space, Statistic, Table, Tag, Typography, Upload, type UploadFile } from 'antd';
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Page } from '@/components/ui';
import { useAcademicYears } from '@/services';
import { useGlobal, useMessage } from '@/hooks';

type AssignmentResult = {
  rowNumber: number;
  lecturerName: string;
  matchedUserId?: string | null;
  matchedUserName?: string | null;
  courseName: string;
  className?: string | null;
  educationLevel?: string | null;
  credits?: number | null;
  periods?: number | null;
  quantity: number;
  quantityUnit?: string | null;
  studentCount?: number | null;
  ruleCode?: string | null;
  calculatedHours?: number | null;
  status: 'IMPORTED' | 'SKIPPED' | 'UNMATCHED' | 'FAILED';
  message?: string | null;
};

type ImportResult = {
  academicYear: { id: string; name: string };
  fileName: string;
  model: string;
  parserConfidence?: number | null;
  needsReview: boolean;
  warnings: string[];
  rowCount: number;
  lecturerCount?: number;
  guidanceCount?: number;
  importedCount: number;
  skippedCount: number;
  unmatchedCount: number;
  rows: AssignmentResult[];
};

const statusLabel: Record<AssignmentResult['status'], string> = {
  IMPORTED: 'Đã phân chia',
  SKIPPED: 'Đã có từ trước',
  UNMATCHED: 'Chưa khớp tài khoản',
  FAILED: 'Chưa tính được',
};

const statusColor: Record<AssignmentResult['status'], string> = {
  IMPORTED: 'green',
  SKIPPED: 'blue',
  UNMATCHED: 'orange',
  FAILED: 'red',
};

export const ManagerTeachingAssignments = () => {
  const { apiBaseUrl, token } = useGlobal();
  const toast = useMessage();
  const academicYears = useAcademicYears({ params: { activeOnly: false } });
  const [academicYearId, setAcademicYearId] = useState<string>();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const activeYear = academicYears.data?.find((year) => year.isActive) ?? academicYears.data?.[0];

  useEffect(() => {
    academicYears.fetchData();
  }, []);

  useEffect(() => {
    if (!academicYearId && activeYear) setAcademicYearId(activeYear.id);
  }, [activeYear?.id, academicYearId]);

  const importFile = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file) {
      toast.warning('Vui lòng chọn file phân công giảng dạy');
      return;
    }
    if (!academicYearId) {
      toast.warning('Vui lòng chọn năm học');
      return;
    }

    setLoading(true);
    const body = new FormData();
    body.append('file', file);
    body.append('academicYearId', academicYearId);
    try {
      const response = await axios.post(`${apiBaseUrl}/teaching-assignments/import`, body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 180_000,
      });
      const data = response.data?.data ?? response.data;
      setResult(data);
      toast.success(`Đã phân chia ${data.importedCount ?? 0} dòng cho giảng viên`);
    } catch (error: any) {
      const detail = error?.response?.data?.meta?.message || error?.response?.data?.message || error?.response?.data?.detail;
      toast.error(detail || 'Không thể đọc file phân công giảng dạy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page
      title="Phân công giảng dạy"
      actions={<Button icon={<ReloadOutlined />} onClick={() => academicYears.fetchData()}>Làm mới</Button>}
    >
      <Card>
        <Typography.Paragraph>
          Quản lý tải lên một file PDF hoặc Word .docx phân công. Hệ thống đọc từng dòng, đối chiếu tên giảng viên,
          áp dụng luật quy đổi và tạo kết quả giờ làm việc trực tiếp trong tài khoản của từng người.
        </Typography.Paragraph>
        <Row gutter={[16, 16]} align="bottom">
          <Col xs={24} md={8}>
            <Typography.Text strong>Năm học áp dụng</Typography.Text>
            <Select
              value={academicYearId}
              onChange={setAcademicYearId}
              loading={academicYears.loading}
              style={{ width: '100%', marginTop: 8 }}
              options={(academicYears.data ?? []).map((year) => ({ value: year.id, label: year.name }))}
            />
          </Col>
          <Col xs={24} md={10}>
            <Typography.Text strong>File phân công giảng dạy</Typography.Text>
            <Upload
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              maxCount={1}
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList: next }) => setFileList(next.slice(-1))}
              onRemove={() => {
                setFileList([]);
                return true;
              }}
              style={{ display: 'block', marginTop: 8 }}
            >
              <Button icon={<UploadOutlined />}>Chọn PDF hoặc Word</Button>
            </Upload>
          </Col>
          <Col xs={24} md={6}>
            <Button type="primary" block loading={loading} onClick={importFile}>
              Phân chia và tính giờ
            </Button>
          </Col>
        </Row>
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
          Nhận PDF hoặc Word .docx không quá 20 MB. Dòng không khớp tài khoản sẽ được giữ lại để quản lý kiểm tra.
        </Typography.Text>
      </Card>

      {result ? (
        <>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={12} md={6}><Card><Statistic title="Giảng viên trong file" value={result.lecturerCount ?? 0} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Mục phân công đã đọc" value={result.rowCount} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Đã đưa về giảng viên" value={result.importedCount} valueStyle={{ color: '#389e0d' }} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Đã bỏ qua bản trùng" value={result.skippedCount} valueStyle={{ color: '#1677ff' }} /></Card></Col>
            <Col xs={12} md={6}><Card><Statistic title="Chưa khớp tài khoản" value={result.unmatchedCount} valueStyle={{ color: '#d46b08' }} /></Card></Col>
          </Row>
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
            Đã tách riêng {result.guidanceCount ?? 0} mục hướng dẫn luận văn/luận án để áp dụng luật tương ứng.
          </Typography.Text>
          {result.warnings.map((warning) => <Alert key={warning} type="warning" showIcon message={warning} style={{ marginTop: 16 }} />)}
          <Card title={`Kết quả file: ${result.fileName}`} style={{ marginTop: 16 }}>
            <Table<AssignmentResult>
              rowKey={(row) => `${row.rowNumber}-${row.lecturerName}-${row.courseName}`}
              dataSource={result.rows}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1100 }}
              columns={[
                { title: 'Dòng', dataIndex: 'rowNumber', width: 70 },
                { title: 'Giảng viên', render: (_: unknown, row) => <>{row.matchedUserName || row.lecturerName}<br /><Typography.Text type="secondary">{row.matchedUserId ? 'Đã khớp tài khoản' : 'Chưa khớp tài khoản'}</Typography.Text></> },
                { title: 'Học phần', render: (_: unknown, row) => <>{row.courseName}{row.className ? ` - ${row.className}` : ''}</> },
                { title: 'Bậc đào tạo', dataIndex: 'educationLevel' },
                { title: 'Số lượng', render: (_: unknown, row) => row.quantityUnit === 'tiết' && row.credits != null ? `${row.credits} tín chỉ · ${row.quantity} tiết` : `${row.quantity} ${row.quantityUnit || ''}` },
                { title: 'Luật áp dụng', dataIndex: 'ruleCode' },
                { title: 'Giờ quy đổi', dataIndex: 'calculatedHours', render: (value: number | null) => value == null ? 'Chưa tính' : value.toFixed(2) },
                { title: 'Trạng thái', render: (_: unknown, row) => <Space direction="vertical" size={0}><Tag color={statusColor[row.status]}>{statusLabel[row.status]}</Tag><Typography.Text type="secondary">{row.message}</Typography.Text></Space> },
              ]}
            />
          </Card>
        </>
      ) : null}
    </Page>
  );
};
