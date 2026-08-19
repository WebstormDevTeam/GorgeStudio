import { ConfigProvider, Layout, Menu, Card, Button, Space, Typography, Input } from "antd";
import {
  AppstoreOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const { Header, Sider, Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [name, setName] = useState("");
  const [greetMsg, setGreetMsg] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <div
            style={{
              color: "#fff",
              textAlign: "center",
              height: 48,
              lineHeight: "48px",
              fontSize: collapsed ? 16 : 18,
              fontWeight: 600,
            }}
          >
            {collapsed ? "G" : "Gorge Studio"}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={["1"]}
            items={[
              { key: "1", icon: <AppstoreOutlined />, label: "首页" },
              { key: "2", icon: <ThunderboltOutlined />, label: "功能" },
              { key: "3", icon: <SettingOutlined />, label: "设置" },
            ]}
          />
        </Sider>

        <Layout>
          <Header
            style={{
              padding: "0 24px",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography.Title level={4} style={{ margin: 0 }}>
              Tauri + React + Ant Design
            </Typography.Title>
            <Space>
              <Button type="primary">新建</Button>
            </Space>
          </Header>

          <Content style={{ margin: 24 }}>
            <Card title="欢迎" style={{ maxWidth: 640 }}>
              <Typography.Paragraph>
                项目已成功初始化，使用 Tauri + React + Ant Design 。点击下方按钮调用
                Tauri 原生命令。
              </Typography.Paragraph>
              <Space.Compact style={{ width: "100%", maxWidth: 360 }}>
                <Input
                  placeholder="Enter a name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button type="primary" onClick={greet} icon={<ThunderboltOutlined />}>
                  Greet
                </Button>
              </Space.Compact>
              {greetMsg && (
                <div style={{ marginTop: 16 }}>
                  <Typography.Text code>{greetMsg}</Typography.Text>
                </div>
              )}
            </Card>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
