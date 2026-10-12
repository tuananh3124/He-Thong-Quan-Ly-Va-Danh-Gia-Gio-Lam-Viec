import { Card, Collapse, Typography } from 'antd';
import { Page } from '@/components/ui';

export const HelpCenter: React.FC = () => (
  <Page title="Hướng dẫn sử dụng">
    <Card>
      <Typography.Paragraph type="secondary">
        Hệ thống giúp bạn kê khai hoạt động, quản lý minh chứng và theo dõi số giờ làm việc tiêu
        chuẩn.
      </Typography.Paragraph>
      <Collapse
        items={[
          {
            key: '1',
            label: 'Tạo một bản kê khai như thế nào?',
            children: 'Mở mục Kê khai hoạt động, chọn Tạo kê khai, nhập thông tin và lưu bản nháp.',
          },
          {
            key: '2',
            label: 'Khi nào hệ thống tính giờ?',
            children:
              'Sau khi bản nháp có đủ thông tin và quy tắc phù hợp, bấm Tính giờ để xem kết quả.',
          },
          {
            key: '3',
            label: 'Làm thế nào để gửi quản lý duyệt?',
            children:
              'Kiểm tra số giờ đã tính, sau đó bấm Gửi duyệt. Hồ sơ bị từ chối có thể chỉnh sửa và gửi lại.',
          },
        ]}
      />
    </Card>
  </Page>
);
