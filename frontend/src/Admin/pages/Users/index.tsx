import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { ROLE, STAFF_CATEGORY } from '@projectname/shared';
import type { ROLE_TYPE, STAFF_CATEGORY_TYPE } from '@projectname/shared';
import { Page } from '@/components/ui';
import {
  useCreateUser,
  useManagedTenants,
  useManagedUsers,
  useUpdateUser,
  type CreateUserRequest,
  type ManagedUser,
} from '@/services';

type UserFormValues = CreateUserRequest;

const roleLabel: Record<ROLE_TYPE, string> = {
  [ROLE.Staff]: 'Cán bộ',
  [ROLE.Manager]: 'Quản lý',
  [ROLE.Admin]: 'Quản trị viên',
};

const categoryLabel: Record<STAFF_CATEGORY_TYPE, string> = {
  [STAFF_CATEGORY.Lecturer]: 'Giảng viên',
  [STAFF_CATEGORY.Researcher]: 'Nghiên cứu viên',
};

const roleOptions = Object.values(ROLE).map((value) => ({
  value,
  label: roleLabel[value],
}));

const categoryOptions = Object.values(STAFF_CATEGORY).map((value) => ({
  value,
  label: categoryLabel[value],
}));

export const Users = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<ROLE_TYPE | undefined>();
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form] = Form.useForm<UserFormValues>();
  const users = useManagedUsers();
  const tenants = useManagedTenants();

  const closeModal = () => {
    setOpen(false);
    setEditingUser(null);
    form.resetFields();
  };

  const refresh = () => {
    users.fetchData();
    tenants.fetchData();
  };

  const afterSave = () => {
    closeModal();
    users.fetchData();
  };

  const createUser = useCreateUser({
    showLoading: false,
    success: { message: 'Đã tạo tài khoản', action: afterSave },
  });
  const updateUser = useUpdateUser(editingUser?.id ?? '', {
    showLoading: false,
    success: { message: 'Đã cập nhật tài khoản', action: afterSave },
  });

  useEffect(() => {
    refresh();
  }, []);

  const openCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: ROLE.Staff, tenantId: tenants.data?.[0]?.id });
    setOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user);
    form.setFieldsValue({
      name: user.name,
      email: user.email,
      role: user.role,
      staffCategory: user.staffCategory ?? undefined,
      tenantId: user.tenantId ?? undefined,
      academicTitle: user.academicTitle ?? undefined,
      degree: user.degree ?? undefined,
      managementRole: user.managementRole ?? undefined,
    });
    setOpen(true);
  };

  const handleSave = (values: UserFormValues) => {
    if (editingUser) {
      const { password: _password, ...updateValues } = values;
      updateUser.fetchData({ data: updateValues });
    } else {
      createUser.fetchData({ data: values });
    }
  };

  const filteredUsers = (users.data ?? []).filter((user) => {
    const searchMatches = `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase());
    return searchMatches && (!roleFilter || user.role === roleFilter);
  });

  const saving = createUser.loading || updateUser.loading;

  return (
    <Page
      title="Quản lý người dùng"
      actions={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refresh} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo tài khoản
          </Button>
        </Space>
      }
    >
      <Space wrap>
        <Input.Search
          allowClear
          placeholder="Tìm theo tên hoặc email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ width: 280 }}
        />
        <Select
          allowClear
          placeholder="Tất cả vai trò"
          value={roleFilter}
          onChange={setRoleFilter}
          options={roleOptions}
          style={{ width: 180 }}
        />
      </Space>

      <Table<ManagedUser>
        rowKey="id"
        loading={users.loading}
        dataSource={filteredUsers}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        columns={[
          { title: 'Họ tên', dataIndex: 'name', key: 'name' },
          { title: 'Email', dataIndex: 'email', key: 'email' },
          {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role: ROLE_TYPE) => (
              <Tag color={role === ROLE.Admin ? 'purple' : role === ROLE.Manager ? 'blue' : 'default'}>
                {roleLabel[role]}
              </Tag>
            ),
          },
          {
            title: 'Nhóm cán bộ',
            dataIndex: 'staffCategory',
            key: 'staffCategory',
            render: (category: STAFF_CATEGORY_TYPE | null) =>
              category ? categoryLabel[category] : '—',
          },
          {
            title: 'Đơn vị',
            dataIndex: ['tenant', 'businessName'],
            key: 'tenant',
            render: (_: unknown, user: ManagedUser) => user.tenant?.businessName ?? '—',
          },
          {
            title: 'Chức danh / chức vụ',
            key: 'profile',
            render: (_: unknown, user: ManagedUser) =>
              [user.academicTitle, user.managementRole].filter(Boolean).join(' · ') || '—',
          },
          {
            title: 'Thao tác',
            key: 'actions',
            render: (_: unknown, user: ManagedUser) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(user)}>
                Sửa
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={editingUser ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản'}
        open={open}
        okText={editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        cancelText="Hủy"
        confirmLoading={saving}
        onCancel={closeModal}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Họ tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input />
          </Form.Item>
          {!editingUser ? (
            <Form.Item
              name="password"
              label="Mật khẩu tạm"
              rules={[{ required: true }, { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }]}
            >
              <Input.Password />
            </Form.Item>
          ) : null}
          <Form.Item name="role" label="Vai trò" rules={[{ required: true }]}>
            <Select
              options={roleOptions}
              onChange={(role: ROLE_TYPE) => {
                if (role !== ROLE.Staff) form.setFieldsValue({ staffCategory: undefined });
              }}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.role !== current.role}>
            {({ getFieldValue }) =>
              getFieldValue('role') === ROLE.Staff ? (
                <Form.Item
                  name="staffCategory"
                  label="Nhóm cán bộ"
                  rules={[{ required: true, message: 'Chọn giảng viên hoặc nghiên cứu viên' }]}
                >
                  <Select options={categoryOptions} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.role !== current.role}>
            {({ getFieldValue }) => {
              const tenantRequired = getFieldValue('role') !== ROLE.Admin;
              return (
                <Form.Item
                  name="tenantId"
                  label="Đơn vị"
                  rules={tenantRequired ? [{ required: true, message: 'Chọn đơn vị' }] : []}
                >
                  <Select
                    allowClear={!tenantRequired}
                    options={(tenants.data ?? []).map((tenant) => ({
                      value: tenant.id,
                      label: tenant.businessName,
                    }))}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>
          <Form.Item name="academicTitle" label="Chức danh học thuật">
            <Input placeholder="Ví dụ: Giảng viên, PGS" />
          </Form.Item>
          <Form.Item name="degree" label="Trình độ">
            <Input placeholder="Ví dụ: ThS, TS" />
          </Form.Item>
          <Form.Item name="managementRole" label="Chức vụ quản lý">
            <Input placeholder="Không bắt buộc" />
          </Form.Item>
          <Typography.Text type="secondary">
            Mật khẩu chỉ được đặt khi tạo tài khoản; hệ thống lưu mật khẩu đã băm.
          </Typography.Text>
        </Form>
      </Modal>
    </Page>
  );
};