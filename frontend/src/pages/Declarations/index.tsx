import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ACTIVITY_TYPE } from '@projectname/shared';
import { Page } from '@/components/ui';
import {
  useAcademicYears,
  useCalculateDeclaration,
  useCreateDeclaration,
  useDeclarations,
  usePublicationSources,
  useSubmitDeclaration,
  type CreateDeclarationRequest,
  type Declaration,
} from '@/services';

const activityOptions = [
  { value: ACTIVITY_TYPE.TEACHING, label: 'Giảng dạy' },
  { value: ACTIVITY_TYPE.RESEARCH, label: 'Nghiên cứu khoa học' },
  { value: ACTIVITY_TYPE.KNOWLEDGE_TRANSFER, label: 'Chuyển giao tri thức' },
  { value: ACTIVITY_TYPE.OTHER, label: 'Hoạt động khác' },
];

const statusColor: Record<string, string> = {
  DRAFT: 'default',
  SUBMITTED: 'blue',
  APPROVED: 'green',
  REJECTED: 'red',
};

const statusLabel: Record<string, string> = {
  DRAFT: 'Bản nháp',
  SUBMITTED: 'Đã gửi',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

export const Declarations = () => {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<{ id: string; type: 'calculate' | 'submit' } | null>(null);
  const [form] = Form.useForm<CreateDeclarationRequest>();
  const declarations = useDeclarations();
  const academicYears = useAcademicYears();
  const sources = usePublicationSources();
  const createDeclaration = useCreateDeclaration({
    showLoading: false,
    success: { message: 'Đã tạo bản kê khai' },
  });
  const calculateDeclaration = useCalculateDeclaration(action?.id ?? '', { showLoading: false });
  const submitDeclaration = useSubmitDeclaration(action?.id ?? '', { showLoading: false });

  const loadData = () => {
    declarations.fetchData();
    academicYears.fetchData();
    sources.fetchData();
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!action) return;

    const request = action.type === 'calculate' ? calculateDeclaration : submitDeclaration;
    request.fetchData().finally(() => {
      setAction(null);
      declarations.fetchData();
    });
  }, [action]);

  const handleCreate = async (values: CreateDeclarationRequest) => {
    await createDeclaration.fetchData({ data: values });
    setOpen(false);
    form.resetFields();
    declarations.fetchData();
  };

  const handleCalculate = async (record: Declaration) => {
    setAction({ id: record.id, type: 'calculate' });
  };

  const handleSubmit = async (record: Declaration) => {
    setAction({ id: record.id, type: 'submit' });
  };

  return (
    <Page
      title="Kê khai hoạt động"
      actions={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Tạo kê khai
          </Button>
        </Space>
      }
    >
      <Table<Declaration>
        rowKey="id"
        loading={declarations.loading}
        dataSource={declarations.data ?? []}
        columns={[
          { title: 'Tên hoạt động', dataIndex: 'name', key: 'name' },
          {
            title: 'Loại',
            dataIndex: 'activityType',
            key: 'activityType',
            render: (value: string) =>
              activityOptions.find((item) => item.value === value)?.label ?? value,
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (value: string) => (
              <Tag color={statusColor[value]}>{statusLabel[value] ?? value}</Tag>
            ),
          },
          {
            title: 'Giờ quy đổi',
            dataIndex: 'calculatedHours',
            key: 'calculatedHours',
            render: (value: number | null) => value ?? 'Chưa tính',
          },
          {
            title: 'Thao tác',
            key: 'actions',
            render: (_: unknown, record: Declaration) => (
              <Space>
                <Button size="small" onClick={() => handleCalculate(record)}>
                  Tính giờ
                </Button>
                {record.status === 'DRAFT' || record.status === 'REJECTED' ? (
                  <Button size="small" type="primary" onClick={() => handleSubmit(record)}>
                    Gửi duyệt
                  </Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title="Tạo bản kê khai"
        open={open}
        okText="Lưu bản nháp"
        cancelText="Hủy"
        confirmLoading={createDeclaration.loading}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="activityType" label="Loại hoạt động" rules={[{ required: true }]}>
            <Select options={activityOptions} placeholder="Chọn loại hoạt động" />
          </Form.Item>
          <Form.Item name="name" label="Tên hoạt động" rules={[{ required: true }]}>
            <Input placeholder="Nhập tên hoạt động hoặc tên bài nghiên cứu" />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn năm học"
              options={(academicYears.data ?? []).map((year) => ({
                value: year.id,
                label: year.name,
              }))}
            />
          </Form.Item>
          <Form.Item name="sourceId" label="Nguồn công bố">
            <Select
              allowClear
              placeholder="Chọn nếu là hoạt động nghiên cứu"
              options={(sources.data ?? []).map((source) => ({
                value: source.id,
                label: `${source.name} - ${source.classification?.name ?? ''}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="url" label="URL minh chứng">
            <Input placeholder="https://..." />
          </Form.Item>
          <Typography.Text type="secondary">
            Bản nháp sẽ được tính giờ sau khi bạn bấm “Tính giờ”.
          </Typography.Text>
        </Form>
      </Modal>
    </Page>
  );
};
