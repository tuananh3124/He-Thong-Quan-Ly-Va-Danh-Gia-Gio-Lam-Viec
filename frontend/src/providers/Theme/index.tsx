import { ConfigProvider } from 'antd';

type IPropsType = {
  children: React.ReactNode;
};

export const ThemeProvider = ({ children }: IPropsType) => (
  <>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1769aa',
          colorInfo: '#1769aa',
          colorLink: '#1769aa',
          colorBgLayout: '#f4f7fb',
          colorBorderSecondary: '#e3eaf2',
          borderRadius: 10,
          controlItemBgActive: '#e8f2fb',
          fontFamily:
            "Inter, 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Layout: {
            headerBg: 'rgba(255, 255, 255, 0.85)',
            siderBg: '#ffffff',
          },
          Menu: {
            itemSelectedBg: '#e8f2fb',
            itemSelectedColor: '#1769aa',
            itemHoverColor: '#1769aa',
            itemBorderRadius: 8,
          },
          Card: {
            headerFontSize: 16,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  </>
);
