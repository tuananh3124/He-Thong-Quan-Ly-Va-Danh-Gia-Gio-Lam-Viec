import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Button,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  type UploadFile,
  type UploadProps,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { ACTIVITY_TYPE, ROLE } from '@projectname/shared';
import { Page } from '@/components/ui';
import { useGlobal, useMessage } from '@/hooks';
import {
  useAcademicYears,
  useCalculateDeclaration,
  useCreateDeclaration,
  useDeclarations,
  usePublicationSources,
  useReviewDeclaration,
  useSubmitDeclaration,
  useUpdateDeclaration,
  type CreateDeclarationRequest,
  type Declaration,
  type ReviewDeclarationRequest,
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
  const { role, apiBaseUrl, token } = useGlobal();
  const toast = useMessage();
  const isManager = role === ROLE.Manager;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEvidenceName, setEditingEvidenceName] = useState<string | null>(null);
  const [evidenceFileList, setEvidenceFileList] = useState<UploadFile[]>([]);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [reviewing, setReviewing] = useState<Declaration | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [action, setAction] = useState<{ id: string; type: 'calculate' | 'submit' } | null>(null);
  const [form] = Form.useForm<CreateDeclarationRequest>();
  const [reviewForm] = Form.useForm<ReviewDeclarationRequest>();
  const declarations = useDeclarations({
    params: isManager ? { status: 'SUBMITTED' } : undefined,
  });
  const academicYears = useAcademicYears();
  const sources = usePublicationSources();

  const closeEditor = () => {
    setOpen(false);
    setEditingId(null);
    setEditingEvidenceName(null);
    setEvidenceFileList([]);
    form.resetFields();
  };

  const handleSaved = async (declaration: Declaration) => {
    const file = evidenceFileList[0]?.originFileObj;
    if (file) {
      setEvidenceUploading(true);
      const body = new FormData();
      body.append('file', file);
      try {
        await axios.post(`${apiBaseUrl}/declarations/${declaration.id}/evidence`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        setEditingId(declaration.id);
        toast.error('Bản kê khai đã lưu nhưng tải tệp chưa thành công. Vui lòng thử lưu lại.');
        declarations.fetchData();
        setEvidenceUploading(false);
        return;
      }
      setEvidenceUploading(false);
    }

    toast.success('Bản kê khai đã được lưu');
    closeEditor();
    declarations.fetchData();
  };

  const createDeclaration = useCreateDeclaration({
    showLoading: false,
    success: { message: null, action: ({ data }) => void handleSaved(data) },
  });
  const updateDeclaration = useUpdateDeclaration(editingId ?? '', {
    showLoading: false,
    success: { message: null, action: ({ data }) => void handleSaved(data) },
  });
  const calculateDeclaration = useCalculateDeclaration(action?.id ?? '', { showLoading: false });
  const submitDeclaration = useSubmitDeclaration(action?.id ?? '', { showLoading: false });
  const reviewDeclaration = useReviewDeclaration(reviewing?.id ?? '', {
    showLoading: false,
    success: {
      message: 'Đã cập nhật quyết định duyệt',
      action: () => {
        setReviewing(null);
        setRejecting(false);
        reviewForm.resetFields();
        declarations.fetchData();
      },
    },
  });

  const loadData = () => {
    declarations.fetchData();
    if (!isManager) {
      academicYears.fetchData();
      sources.fetchData();
    }
  };

  useEffect(() => {
    loadData();
  }, [isManager]);

  useEffect(() => {
    if (!action) return;

    const request = action.type === 'calculate' ? calculateDeclaration : submitDeclaration;
    request.fetchData().finally(() => {
      setAction(null);
      declarations.fetchData();
    });
  }, [action]);

  const handleSave = (values: CreateDeclarationRequest) => {
    if (editingId) {
      updateDeclaration.fetchData({ data: values });
    } else {
      createDeclaration.fetchData({ data: values });
    }
  };

  const handleCalculate = async (record: Declaration) => {
    setAction({ id: record.id, type: 'calculate' });
  };

  const handleSubmit = async (record: Declaration) => {
    setAction({ id: record.id, type: 'submit' });
  };

  const handleEdit = (record: Declaration) => {
    setEditingId(record.id);
    setEditingEvidenceName(record.hasEvidence ? record.evidenceOriginalName ?? 'Minh chứng PDF' : null);
    setEvidenceFileList([]);
    form.setFieldsValue({
      activityType: record.activityType,
      name: record.name,
      academicYearId: record.academicYearId,
      sourceId: record.sourceId ?? undefined,
      url: record.url ?? undefined,
      publicationYear: record.publicationYear ?? undefined,
      doi: record.doi ?? undefined,
      authors: record.authors?.map((author) => ({
        authorName: author.authorName,
        roleType: author.roleType as 'MAIN_AUTHOR' | 'CO_AUTHOR',
        allocationPercentage: author.allocationPercentage ?? undefined,
      })),
    });
    setOpen(true);
  };

  const handleEvidenceChange: UploadProps['onChange'] = ({ fileList }) => {
    setEvidenceFileList(fileList.slice(-1));
  };

  const downloadEvidence = async (record: Declaration) => {
    try {
      const response = await axios.get(`${apiBaseUrl}/declarations/${record.id}/evidence`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = record.evidenceOriginalName ?? 'evidence.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      toast.error('Không thể tải tệp minh chứng');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setEditingEvidenceName(null);
    setEvidenceFileList([]);
    form.resetFields();
    setOpen(true);
  };

  const saving = createDeclaration.loading || updateDeclaration.loading || evidenceUploading;

  const handleApprove = () => {
    reviewDeclaration.fetchData({ data: { decision: 'APPROVED' } });
  };

  const handleReject = (values: ReviewDeclarationRequest) => {
    reviewDeclaration.fetchData({
      data: { decision: 'REJECTED', reason: values.reason?.trim() },
    });
  };

  const closeReview = () => {
    setReviewing(null);
    setRejecting(false);
    reviewForm.resetFields();
  };

  return (
    <Page
      title={isManager ? 'Duyệt kê khai' : 'Kê khai hoạt động'}
      actions={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} />
          {!isManager ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Tạo kê khai
            </Button>
          ) : null}
        </Space>
      }
    >
      {isManager ? (
        <Typography.Paragraph type="secondary">
          Hồ sơ đã gửi từ cán bộ trong đơn vị của bạn.
        </Typography.Paragraph>
      ) : null}
      <Table<Declaration>
        rowKey="id"
        loading={declarations.loading}
        dataSource={declarations.data ?? []}
        columns={[
          ...(isManager
            ? [
                {
                  title: 'Người kê khai',
                  key: 'submitter',
                  render: (_: unknown, record: Declaration) => (
                    <Space direction="vertical" size={0}>
                      <Typography.Text>{record.user?.name ?? 'Không rõ'}</Typography.Text>
                      <Typography.Text type="secondary">{record.user?.email}</Typography.Text>
                    </Space>
                  ),
                },
              ]
            : []),
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
              isManager ? (
                <Button size="small" type="primary" onClick={() => setReviewing(record)}>
                  Xem xét
                </Button>
              ) : (
                <Space>
                  {record.status === 'DRAFT' || record.status === 'REJECTED' ? (
                    <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                      Sửa
                    </Button>
                  ) : null}
                  {record.hasEvidence ? (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => downloadEvidence(record)}
                    >
                      PDF
                    </Button>
                  ) : null}
                  <Button size="small" onClick={() => handleCalculate(record)}>
                    Tính giờ
                  </Button>
                  {record.status === 'DRAFT' || record.status === 'REJECTED' ? (
                    <Button size="small" type="primary" onClick={() => handleSubmit(record)}>
                      Gửi duyệt
                    </Button>
                  ) : null}
                </Space>
              )
            ),
          },
        ]}
      />

      {!isManager ? (
        <Modal
          title={editingId ? 'Chỉnh sửa bản kê khai' : 'Tạo bản kê khai'}
          open={open}
          okText={editingId ? 'Lưu thay đổi' : 'Lưu bản nháp'}
          cancelText="Hủy"
          confirmLoading={saving}
          onCancel={closeEditor}
          onOk={() => form.submit()}
        >
          <Form form={form} layout="vertical" onFinish={handleSave}>
            <Form.Item name="activityType" label="Loại hoạt động" rules={[{ required: true }]}>
              <Select
                options={activityOptions}
                placeholder="Chọn loại hoạt động"
                onChange={(value) => {
                  if (value !== ACTIVITY_TYPE.RESEARCH) {
                    form.setFieldsValue({ publicationYear: undefined, doi: undefined, authors: [] });
                  }
                }}
              />
            </Form.Item>
            <Form.Item name="name" label="Tên hoạt động / bài nghiên cứu" rules={[{ required: true }]}>
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
            {editingEvidenceName ? (
              <Form.Item label="Tệp minh chứng hiện tại">
                <Space>
                  <Typography.Text>{editingEvidenceName}</Typography.Text>
                  {editingId ? (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() =>
                        downloadEvidence({ id: editingId, evidenceOriginalName: editingEvidenceName } as Declaration)
                      }
                    >
                      Tải PDF
                    </Button>
                  ) : null}
                </Space>
              </Form.Item>
            ) : null}
            <Form.Item label="Tệp minh chứng PDF">
              <Upload
                accept=".pdf,application/pdf"
                maxCount={1}
                fileList={evidenceFileList}
                beforeUpload={() => false}
                onChange={handleEvidenceChange}
                onRemove={() => {
                  setEvidenceFileList([]);
                  return true;
                }}
              >
                <Button icon={<UploadOutlined />}>Chọn PDF</Button>
              </Upload>
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(previous, current) => previous.activityType !== current.activityType}>
              {({ getFieldValue }) =>
                getFieldValue('activityType') === ACTIVITY_TYPE.RESEARCH ? (
                  <>
                    <Form.Item name="publicationYear" label="Năm xuất bản" preserve={false}>
                      <InputNumber min={1900} max={2100} precision={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="doi" label="DOI" preserve={false}>
                      <Input placeholder="10.xxxx/..." />
                    </Form.Item>
                    <Form.List
                      name="authors"
                      rules={[
                        {
                          validator: async (_, authors: CreateDeclarationRequest['authors'] = []) => {
                            const specified = authors.filter(
                              (author) => author?.allocationPercentage != null,
                            );
                            if (!specified.length) return;
                            if (specified.length !== authors.length) {
                              throw new Error('Nhập tỷ lệ cho tất cả tác giả hoặc để trống toàn bộ');
                            }
                            const total = specified.reduce(
                              (sum, author) => sum + (author.allocationPercentage ?? 0),
                              0,
                            );
                            if (Math.abs(total - 100) > 0.01) {
                              throw new Error('Tổng tỷ lệ đóng góp phải bằng 100%');
                            }
                          },
                        },
                      ]}
                    >
                      {(fields, { add, remove }, { errors }) => (
                        <div>
                          <Typography.Text strong>Tác giả và tỷ lệ đóng góp</Typography.Text>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} align="baseline" wrap style={{ display: 'flex', marginTop: 8 }}>
                              <Form.Item
                                {...restField}
                                name={[name, 'authorName']}
                                rules={[{ required: true, message: 'Nhập tên tác giả' }]}
                              >
                                <Input placeholder="Tên tác giả" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'roleType']}
                                rules={[{ required: true, message: 'Chọn vai trò' }]}
                              >
                                <Select
                                  placeholder="Vai trò"
                                  style={{ width: 150 }}
                                  options={[
                                    { value: 'MAIN_AUTHOR', label: 'Tác giả chính' },
                                    { value: 'CO_AUTHOR', label: 'Đồng tác giả' },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'allocationPercentage']}>
                                <InputNumber
                                  min={0}
                                  max={100}
                                  precision={2}
                                  placeholder="Tự động"
                                  addonAfter="%"
                                  style={{ width: 130 }}
                                />
                              </Form.Item>
                              <Button
                                danger
                                type="text"
                                aria-label="Xóa tác giả"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            </Space>
                          ))}
                          <Form.ErrorList errors={errors} />
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => add({ roleType: 'CO_AUTHOR' })}
                          >
                            Thêm tác giả
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </>
                ) : null
              }
            </Form.Item>
            <Typography.Text type="secondary">
              Bản nháp sẽ được tính giờ sau khi bạn bấm “Tính giờ”.
            </Typography.Text>
          </Form>
        </Modal>
      ) : null}

      <Modal
        title="Xem xét kê khai"
        open={isManager && !!reviewing}
        width={720}
        onCancel={closeReview}
        footer={
          <Space>
            <Button onClick={closeReview}>Đóng</Button>
            {rejecting ? (
              <>
                <Button onClick={() => setRejecting(false)}>Quay lại</Button>
                <Button
                  danger
                  type="primary"
                  loading={reviewDeclaration.loading}
                  onClick={() => reviewForm.submit()}
                >
                  Từ chối kê khai
                </Button>
              </>
            ) : (
              <>
                <Button danger onClick={() => setRejecting(true)}>
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  loading={reviewDeclaration.loading}
                  onClick={handleApprove}
                >
                  Phê duyệt
                </Button>
              </>
            )}
          </Space>
        }
      >
        {reviewing ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Người kê khai">
                {reviewing.user?.name ?? 'Không rõ'} ({reviewing.user?.email ?? 'Không có email'})
              </Descriptions.Item>
              <Descriptions.Item label="Hoạt động">{reviewing.name}</Descriptions.Item>
              <Descriptions.Item label="Loại hoạt động">
                {activityOptions.find((item) => item.value === reviewing.activityType)?.label ??
                  reviewing.activityType}
              </Descriptions.Item>
              <Descriptions.Item label="Năm học">
                {reviewing.academicYear?.name ?? 'Chưa xác định'}
              </Descriptions.Item>
              <Descriptions.Item label="Năm xuất bản">
                {reviewing.publicationYear ?? 'Chưa cập nhật'}
              </Descriptions.Item>
              <Descriptions.Item label="DOI">{reviewing.doi ?? 'Chưa cập nhật'}</Descriptions.Item>
              <Descriptions.Item label="Nguồn công bố">
                {reviewing.source
                  ? `${reviewing.source.name} - ${reviewing.source.classification?.name ?? ''}`
                  : 'Không áp dụng'}
              </Descriptions.Item>
              <Descriptions.Item label="Giờ quy đổi">
                {reviewing.calculatedHours ?? 'Chưa tính'}
              </Descriptions.Item>
              <Descriptions.Item label="Minh chứng">
                <Space wrap>
                  {reviewing.url ? (
                    <Typography.Link href={reviewing.url} target="_blank" rel="noreferrer">
                      Mở liên kết minh chứng
                    </Typography.Link>
                  ) : null}
                  {reviewing.hasEvidence ? (
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => downloadEvidence(reviewing)}
                    >
                      {reviewing.evidenceOriginalName ?? 'Tải PDF'}
                    </Button>
                  ) : null}
                  {!reviewing.url && !reviewing.hasEvidence ? 'Chưa có minh chứng' : null}
                </Space>
              </Descriptions.Item>
            </Descriptions>
            {reviewing.authors?.length ? (
              <div>
                <Typography.Text strong>Tác giả và phân bổ</Typography.Text>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={reviewing.authors}
                  columns={[
                    { title: 'Tác giả', dataIndex: 'authorName', key: 'authorName' },
                    { title: 'Vai trò', dataIndex: 'roleType', key: 'roleType' },
                    {
                      title: 'Tỷ lệ',
                      dataIndex: 'allocationPercentage',
                      key: 'allocationPercentage',
                      render: (value: number | null | undefined) =>
                        value == null ? '—' : `${value}%`,
                    },
                    {
                      title: 'Giờ phân bổ',
                      dataIndex: 'allocatedHours',
                      key: 'allocatedHours',
                      render: (value: number | null) => value ?? '—',
                    },
                  ]}
                />
              </div>
            ) : null}
            {rejecting ? (
              <Form form={reviewForm} layout="vertical" onFinish={handleReject}>
                <Form.Item
                  name="reason"
                  label="Lý do từ chối"
                  rules={[
                    { required: true, whitespace: true, message: 'Vui lòng nhập lý do từ chối' },
                  ]}
                >
                  <Input.TextArea rows={4} maxLength={1000} showCount />
                </Form.Item>
              </Form>
            ) : null}
          </Space>
        ) : null}
      </Modal>
    </Page>
  );
};
