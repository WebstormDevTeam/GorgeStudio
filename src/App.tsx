import { ConfigProvider, Layout, Menu } from "antd";
import {
  FileOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  SaveFilled,
} from "@ant-design/icons";
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

const { Header, Content } = Layout;

function App() {
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  const handleNew = useCallback(async () => {
    try {
      const data = await invoke<string>("new_project");
      setCurrentPath(null);
      console.log("新建项目成功", data);
    } catch (e) {
      console.error("新建失败:", e);
    }
  }, []);

  const handleOpen = useCallback(async () => {
    try {
      const selected = await open({
        filters: [{ name: "Gorge 工程", extensions: ["zip"] }],
        multiple: false,
      });
      if (!selected) return;
      const data = await invoke<string>("open_project", { path: selected });
      setCurrentPath(selected);
      console.log("打开文件:", selected, data);
    } catch (e) {
      console.error("打开失败:", e);
    }
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const data = await invoke<string>("new_project");
      if (currentPath) {
        await invoke("save_project", { path: currentPath, data });
        console.log("保存成功:", currentPath);
      } else {
        const selected = await save({
          filters: [{ name: "Gorge 工程", extensions: ["zip"] }],
        });
        if (!selected) return;
        await invoke("save_project", { path: selected, data });
        setCurrentPath(selected);
        console.log("保存成功:", selected);
      }
    } catch (e) {
      console.error("保存失败:", e);
    }
  }, [currentPath]);

  const handleSaveAs = useCallback(async () => {
    try {
      const selected = await save({
        filters: [{ name: "Gorge 工程", extensions: ["zip"] }],
      });
      if (!selected) return;
      const data = await invoke<string>("new_project");
      await invoke("save_project", { path: selected, data });
      setCurrentPath(selected);
      console.log("另存为:", selected);
    } catch (e) {
      console.error("另存为失败:", e);
    }
  }, []);

  const onMenuClick = useCallback(
    (info: { key: string }) => {
      switch (info.key) {
        case "file-new":
          handleNew();
          break;
        case "file-open":
          handleOpen();
          break;
        case "file-save":
          handleSave();
          break;
        case "file-saveas":
          handleSaveAs();
          break;
      }
    },
    [handleNew, handleOpen, handleSave, handleSaveAs],
  );

  const fileMenuItems = [
    { key: "file-new", icon: <FileAddOutlined />, label: "新建" },
    { key: "file-open", icon: <FolderOpenOutlined />, label: "打开" },
    { type: "divider" as const },
    { key: "file-save", icon: <SaveOutlined />, label: "保存" },
    { key: "file-saveas", icon: <SaveFilled />, label: "另存为" },
  ];

  const menuItems = [
    {
      key: "file",
      icon: <FileOutlined />,
      label: "文件",
      children: fileMenuItems,
    },
  ];

  return (
    <ConfigProvider>
      <Layout style={{ minHeight: "100vh" }}>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            padding: 0,
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: 16,
              padding: "0 24px",
              whiteSpace: "nowrap",
            }}
          >
            Gorge Studio
          </div>
          <Menu
            mode="horizontal"
            selectable={false}
            items={menuItems}
            onClick={onMenuClick}
            style={{ flex: 1, minWidth: 0 }}
          />
        </Header>
        <Content style={{ flex: 1, background: "#f5f5f5" }} />
      </Layout>
    </ConfigProvider>
  );
}

export default App;