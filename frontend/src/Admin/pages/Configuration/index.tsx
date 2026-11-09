import { useEffect } from 'react';
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
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ACTIVITY_TYPE } from '@projectname/shared';
import { Page } from '@/components/ui';
import {
  useAcademicYears,
  useConversionRules,
  useCreateAcademicYear,
  useCreateConversionRule,
  useCreatePublicationClassification,
  useCreatePublicationSource,
  usePublicationClassifications,
  type ConversionRule,
  type AcademicYear,
  type PublicationClassification,
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

export const Configuration = () => {
  const [yearForm] = Form.useForm<AcademicYearValues>();
  const [classificationForm] = Form.useForm<ClassificationValues>();
  const [sourceForm] = Form.useForm<SourceValues>();
  const [ruleForm] = Form.useForm<RuleValues>();

  const years = useAcademicYears<{
    request: { activeOnly?: boolean };
    response: AcademicYear[];
  }>({
    params: { activeOnly: false },
  });
  const classifications = usePublicationClassifications();
  const rules = useConversionRules();

  const refresh = () => {
    years.fetchData();
    classifications.fetchData();
    rules.fetchData();
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
  }, []);

  return (
    <Page
      title="Cấu hình hệ thống"
      actions={<Button icon={<ReloadOutlined />} onClick={refresh} />}
    >
      <Tabs
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
                      <Typography.Text type="secondary">
                        {(record.sources ?? []).map((source) => source.name).join(', ') || 'Chưa có nguồn'}
                      </Typography.Text>
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
