import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  type UploadFile,
} from 'antd';
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { ACTIVITY_TYPE } from '@projectname/shared';
import { Page } from '@/components/ui';
import { useGlobal, useMessage } from '@/hooks';
import {
  useAcademicYears,
  useConversionRules,
  useCreateAcademicYear,
  useCreateConversionRule,
  useCreatePublicationClassification,
  useCreatePublicationSource,
  useUpdatePublicationSource,
  usePublicationClassifications,
  type ConversionRule,
  type AcademicYear,
  type PublicationClassification,
  type PublicationSource,
} from '@/services';

const activityOptions = [
  { value: ACTIVITY_TYPE.TEACHING, label: 'Giảng dạy' },
  { value: ACTIVITY_TYPE.RESEARCH, label: 'Nghiên cứu khoa học' },
  { value: ACTIVITY_TYPE.KNOWLEDGE_TRANSFER, label: 'Chuyển giao tri thức' },
  { value: ACTIVITY_TYPE.OTHER, label: 'Hoạt động khác' },
];

type AcademicYearValues = {
  name: string;
  startDate: string;
  endDate: string;
};

type ClassificationValues = {
  name: string;
  description?: string;
};

type SourceValues = {
  name: string;
  classificationId: string;
  quartile?: string;
};

type RuleValues = {
  code?: string;
  label?: string;
  activityType: string;
  unit?: string;
  classificationId?: string;
  academicYearId?: string;
  hours: number;
  minHours?: number;
  maxHours?: number;
  priority?: number;
  conditions?: string;
};

const SourceQuartileEditor = ({ source, onUpdated }: { source: PublicationSource; onUpdated: () => void }) => {
  const updateSource = useUpdatePublicationSource(source.id, {
    showLoading: false,
    success: {
      message: 'Đã cập nhật Quartile',
      action: onUpdated,
    },
  });

  return (
    <Select
      allowClear
      style={{ width: 100 }}
      placeholder="Q?"
      value={source.quartile ?? undefined}
      options={['Q1', 'Q2', 'Q3', 'Q4'].map((value) => ({ value, label: value }))}
      onChange={(value) => updateSource.fetchData({ data: { quartile: value ?? null } })}
    />
  );
};

export const Configuration = ({ defaultTab = 'years' }: { defaultTab?: 'years' | 'catalog' | 'rules' }) => {
  const { apiBaseUrl, token } = useGlobal();
  const toast = useMessage();
  const [yearForm] = Form.useForm<AcademicYearValues>();
  const [classificationForm] = Form.useForm<ClassificationValues>();
  const [sourceForm] = Form.useForm<SourceValues>();
  const [ruleForm] = Form.useForm<RuleValues>();
  const [selectedRuleYear, setSelectedRuleYear] = useState<string | undefined>();
  const [rankingFileList, setRankingFileList] = useState<UploadFile[]>([]);
  const [rankingUploading, setRankingUploading] = useState(false);

  const years = useAcademicYears<{
    request: { activeOnly?: boolean };
    response: AcademicYear[];
  }>({
    params: { activeOnly: false },
  });
  const classifications = usePublicationClassifications();
  const rules = useConversionRules<{
    request: { activityType?: string; academicYearId?: string };
    response: ConversionRule[];
  }>({
    params: selectedRuleYear ? { academicYearId: selectedRuleYear } : undefined,
  });

  const refresh = () => {
    years.fetchData();
    classifications.fetchData();
    rules.fetchData();
  };

  const importRankingCsv = async (file: File) => {
    setRankingUploading(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const response = await axios.post(`${apiBaseUrl}/publication-catalog/rankings/import`, body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120_000,
      });
      const result = response.data?.data ?? response.data;
      toast.success(`Đã cập nhật dữ liệu xếp hạng năm ${result?.year ?? ''}`.trim());
      setRankingFileList([]);
      refresh();
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? error.response?.data?.message || error.response?.data?.detail
        : undefined;
      toast.error(detail || 'Không thể cập nhật file xếp hạng CSV');
    } finally {
      setRankingUploading(false);
    }
  };

  const createYear = useCreateAcademicYear({
    showLoading: false,
    success: {
      message: 'Đã tạo năm học',
      action: () => {
        yearForm.resetFields();
        refresh();
      },
    },
  });
  const createClassification = useCreatePublicationClassification({
    showLoading: false,
    success: {
      message: 'Đã tạo phân loại',
      action: () => {
        classificationForm.resetFields();
        refresh();
      },
    },
  });
  const createSource = useCreatePublicationSource({
    showLoading: false,
    success: {
      message: 'Đã tạo nguồn công bố',
      action: () => {
        sourceForm.resetFields();
        refresh();
      },
    },
  });
  const createRule = useCreateConversionRule({
    showLoading: false,
    success: {
      message: 'Đã tạo luật quy đổi',
      action: () => {
        ruleForm.resetFields();
        refresh();
      },
    },
  });

  useEffect(() => {
    refresh();
  }, [selectedRuleYear]);

  return (
    <Page
      title="Cấu hình hệ thống"
      actions={<Button icon={<ReloadOutlined />} onClick={refresh} />}
    >
      <Tabs
        activeKey={defaultTab}
        items={[
          {
            key: 'years',
            label: 'Năm học',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card title="Thêm năm học">
                  <Form
                    form={yearForm}
                    layout="inline"
                    onFinish={(values) => createYear.fetchData({ data: { ...values, isActive: true } })}
                  >
                    <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
                      <Input placeholder="2026-2027" />
                    </Form.Item>
                    <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}>
                      <Input type="date" />
                    </Form.Item>
                    <Form.Item name="endDate" label="Đến ngày" rules={[{ required: true }]}>
                      <Input type="date" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={createYear.loading}>
                      Thêm
                    </Button>
                  </Form>
                </Card>
                <Table
                  rowKey="id"
                  loading={years.loading}
                  dataSource={years.data ?? []}
                  columns={[
                    { title: 'Tên năm học', dataIndex: 'name' },
                    { title: 'Bắt đầu', dataIndex: 'startDate', render: (value: string) => value.slice(0, 10) },
                    { title: 'Kết thúc', dataIndex: 'endDate', render: (value: string) => value.slice(0, 10) },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'isActive',
                      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Đang dùng' : 'Tắt'}</Tag>,
                    },
                  ]}
                />
              </Space>
            ),
          },
          {
            key: 'catalog',
            label: 'Nguồn công bố',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card title="Cập nhật xếp hạng tạp chí bằng CSV">
                  <Typography.Paragraph type="secondary">
                    Tải file CSV SCImago mới nhất lên khi dữ liệu xếp hạng thay đổi. Hệ thống sẽ lưu snapshot theo năm
                    và dùng ISSN để xác định Q1, Q2, Q3 hoặc Q4 khi xử lý bài báo.
                  </Typography.Paragraph>
                  <Upload
                    accept=".csv,text/csv"
                    maxCount={1}
                    fileList={rankingFileList}
                    beforeUpload={(file) => {
                      void importRankingCsv(file);
                      return false;
                    }}
                    onChange={({ fileList }) => setRankingFileList(fileList.slice(-1))}
                    onRemove={() => {
                      setRankingFileList([]);
                      return true;
                    }}
                  >
                    <Button icon={<UploadOutlined />} loading={rankingUploading}>
                      Chọn file CSV xếp hạng
                    </Button>
                  </Upload>
                </Card>
                <Card title="Thêm phân loại">
                  <Form
                    form={classificationForm}
                    layout="inline"
                    onFinish={(values) => createClassification.fetchData({ data: values })}
                  >
                    <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
                      <Input placeholder="ISI/SCIE" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                      <Input placeholder="Mô tả ngắn" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={createClassification.loading}>
                      Thêm
                    </Button>
                  </Form>
                </Card>
                <Card title="Thêm nguồn công bố">
                  <Form
                    form={sourceForm}
                    layout="inline"
                    onFinish={(values) => createSource.fetchData({ data: values })}
                  >
                    <Form.Item name="name" label="Tên nguồn" rules={[{ required: true }]}>
                      <Input placeholder="Tên tạp chí hoặc hội nghị" />
                    </Form.Item>
                    <Form.Item name="classificationId" label="Phân loại" rules={[{ required: true }]}>
                      <Select
                        style={{ width: 220 }}
                        options={(classifications.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
                      />
                    </Form.Item>
                    <Form.Item name="quartile" label="Quartile">
                      <Select
                        allowClear
                        style={{ width: 120 }}
                        placeholder="Chọn Q"
                        options={['Q1', 'Q2', 'Q3', 'Q4'].map((value) => ({ value, label: value }))}
                      />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={createSource.loading}>
                      Thêm
                    </Button>
                  </Form>
                </Card>
                <Table<PublicationClassification>
                  rowKey="id"
                  loading={classifications.loading}
                  dataSource={classifications.data ?? []}
                  columns={[
                    { title: 'Phân loại', dataIndex: 'name' },
                    { title: 'Mô tả', dataIndex: 'description' },
                    {
                      title: 'Số nguồn',
                      render: (_: unknown, record: { sources?: unknown[] }) => record.sources?.length ?? 0,
                    },
                  ]}
                  expandable={{
                    expandedRowRender: (record: PublicationClassification) => (
                      <Space direction="vertical">
                        {(record.sources ?? []).map((source) => (
                          <Space key={source.id}>
                            <Typography.Text>{source.name}</Typography.Text>
                            <SourceQuartileEditor source={source} onUpdated={refresh} />
                          </Space>
                        ))}
                        {!record.sources?.length ? <Typography.Text type="secondary">Chưa có nguồn</Typography.Text> : null}
                      </Space>
                    ),
                  }}
                />
              </Space>
            ),
          },
          {
            key: 'rules',
            label: 'Luật quy đổi',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card title="Thêm luật quy đổi">
                  <Form
                    form={ruleForm}
                    layout="vertical"
                    onFinish={(values) => createRule.fetchData({ data: values })}
                  >
                    <Space wrap align="start">
                      <Form.Item name="code" label="Mã luật">
                        <Input placeholder="RESEARCH_ARTICLE_ISI_SCOPUS" />
                      </Form.Item>
                      <Form.Item name="label" label="Tên luật" rules={[{ required: true }]}>
                        <Input placeholder="Bài báo ISI/Scopus" />
                      </Form.Item>
                      <Form.Item name="activityType" label="Loại hoạt động" rules={[{ required: true }]}>
                        <Select style={{ width: 190 }} options={activityOptions} />
                      </Form.Item>
                      <Form.Item name="unit" label="Đơn vị">
                        <Input placeholder="bài báo" />
                      </Form.Item>
                      <Form.Item name="hours" label="Giờ" rules={[{ required: true }]}>
                        <InputNumber min={0} style={{ width: 110 }} />
                      </Form.Item>
                      <Form.Item name="minHours" label="Tối thiểu">
                        <InputNumber min={0} style={{ width: 110 }} />
                      </Form.Item>
                      <Form.Item name="maxHours" label="Tối đa">
                        <InputNumber min={0} style={{ width: 110 }} />
                      </Form.Item>
                      <Form.Item name="priority" label="Ưu tiên" initialValue={0}>
                        <InputNumber min={0} style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item name="academicYearId" label="Năm học">
                        <Select
                          allowClear
                          style={{ width: 170 }}
                          options={(years.data ?? []).map((year) => ({ value: year.id, label: year.name }))}
                        />
                      </Form.Item>
                      <Form.Item name="classificationId" label="Phân loại">
                        <Select
                          allowClear
                          style={{ width: 170 }}
                          options={(classifications.data ?? []).map((item) => ({ value: item.id, label: item.name }))}
                        />
                      </Form.Item>
                    </Space>
                    <Form.Item name="conditions" label="Điều kiện JSON">
                      <Input.TextArea rows={2} placeholder='{"maxTotalHours":150,"capGroup":"RESEARCH_COUNCIL"}' />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={createRule.loading}>
                      Thêm luật
                    </Button>
                  </Form>
                </Card>
                <Table<ConversionRule>
                  rowKey="id"
                  loading={rules.loading}
                  dataSource={rules.data ?? []}
                  scroll={{ x: 1100 }}
                  title={() => (
                    <Space>
                      <Typography.Text strong>Lọc theo năm học:</Typography.Text>
                      <Select
                        allowClear
                        value={selectedRuleYear}
                        placeholder="Tất cả năm học"
                        style={{ width: 220 }}
                        options={(years.data ?? []).map((year) => ({ value: year.id, label: year.name }))}
                        onChange={setSelectedRuleYear}
                      />
                    </Space>
                  )}
                  columns={[
                    { title: 'Mã', dataIndex: 'code' },
                    { title: 'Tên luật', dataIndex: 'label' },
                    { title: 'Loại', dataIndex: 'activityType' },
                    { title: 'Định mức', render: (_: unknown, record) => `${record.hours} ${record.unit ?? ''}` },
                    { title: 'Khoảng', render: (_: unknown, record) => `${record.minHours ?? '—'} – ${record.maxHours ?? '—'}` },
                    { title: 'Năm học', render: (_: unknown, record) => record.academicYear?.name ?? 'Mặc định' },
                    { title: 'Ưu tiên', dataIndex: 'priority' },
                  ]}
                />
              </Space>
            ),
          },
        ]}
      />
    </Page>
  );
};
