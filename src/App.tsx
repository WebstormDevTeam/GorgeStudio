// ============================================================
// Gorge Studio - React 前端
// ============================================================
// 本文件是 Tauri 应用的前端主组件，负责：
// 1. 使用 Ant Design 组件搭建桌面应用的 UI 布局
// 2. 通过 Tauri IPC（invoke）调用 Rust 后端的命令
// 3. 通过 @tauri-apps/plugin-dialog 调用系统原生文件对话框
//
// 通信流程：
//   前端 invoke("命令名")  →  Tauri IPC 桥  →  Rust #[tauri::command] 函数
// ============================================================

import { ConfigProvider, Layout, Menu } from "antd";
import {
  FileOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  SaveFilled,
} from "@ant-design/icons";
import { useState, useCallback } from "react";
// invoke: Tauri 提供的 IPC 调用函数，用于调用 Rust 后端的命令
import { invoke } from "@tauri-apps/api/core";
// open / save: 调用系统原生文件选择/保存对话框
import { open, save } from "@tauri-apps/plugin-dialog";

// 从 antd Layout 中解构出 Header 和 Content 组件
const { Header, Content } = Layout;

function App() {
  // currentPath: 当前工程文件的路径
  // null 表示"未保存"状态（新建后尚未保存到文件）
  const [currentPath, setCurrentPath] = useState<string | null>(null);

  // ============================================
  // 文件操作回调函数
  // ============================================

  // 新建工程 —— 调用 Rust 的 new_project 命令获取空工程数据
  const handleNew = useCallback(async () => {
    try {
      const data = await invoke<string>("new_project");
      setCurrentPath(null); // 新建后路径为空，表示未保存
      console.log("新建项目成功", data);
    } catch (e) {
      console.error("新建失败:", e);
    }
  }, []);

  // 打开工程 —— 弹出文件选择对话框，选中后读取 .zip 内容
  const handleOpen = useCallback(async () => {
    try {
      // 调用系统原生"打开文件"对话框，限制只能选 .zip 文件
      const selected = await open({
        filters: [{ name: "Gorge 工程", extensions: ["zip"] }],
        multiple: false, // 禁止多选
      });
      if (!selected) return; // 用户取消了选择
      // 将选中的文件路径传给 Rust 后端，读取 zip 内容
      const data = await invoke<string>("open_project", { path: selected });
      setCurrentPath(selected); // 记录当前路径，后续保存时可直接覆盖
      console.log("打开文件:", selected, data);
    } catch (e) {
      console.error("打开失败:", e);
    }
  }, []);

  // 保存工程 —— 如果已有路径则直接覆盖，否则弹出"另存为"对话框
  const handleSave = useCallback(async () => {
    try {
      const data = await invoke<string>("new_project");
      if (currentPath) {
        // 已有路径：直接覆盖保存
        await invoke("save_project", { path: currentPath, data });
        console.log("保存成功:", currentPath);
      } else {
        // 没有路径：弹出"另存为"对话框
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
  }, [currentPath]); // 依赖 currentPath，当路径变化时重新创建此函数

  // 另存为 —— 始终弹出保存对话框，选择新路径保存
  const handleSaveAs = useCallback(async () => {
    try {
      const selected = await save({
        filters: [{ name: "Gorge 工程", extensions: ["zip"] }],
      });
      if (!selected) return;
      const data = await invoke<string>("new_project");
      await invoke("save_project", { path: selected, data });
      setCurrentPath(selected); // 更新当前路径为新路径
      console.log("另存为:", selected);
    } catch (e) {
      console.error("另存为失败:", e);
    }
  }, []);

  // 菜单点击事件分发 —— 根据点击的菜单项 key 分发到对应处理函数
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
    // 依赖列表：当这些函数变化时，onMenuClick 也会重新创建
    [handleNew, handleOpen, handleSave, handleSaveAs],
  );

  // "文件"菜单的子菜单项定义
  const fileMenuItems = [
    { key: "file-new", icon: <FileAddOutlined />, label: "新建" },
    { key: "file-open", icon: <FolderOpenOutlined />, label: "打开" },
    { type: "divider" as const }, // 分隔线
    { key: "file-save", icon: <SaveOutlined />, label: "保存" },
    { key: "file-saveas", icon: <SaveFilled />, label: "另存为" },
  ];

  // 顶层菜单栏定义（目前只有"文件"菜单，后续可扩展"编辑"、"视图"等）
  const menuItems = [
    {
      key: "file",
      icon: <FileOutlined />,
      label: "文件",
      children: fileMenuItems,
    },
  ];

  return (
    // ConfigProvider 是 Ant Design 的全局配置容器
    <ConfigProvider>
      {/* Layout 是 Ant Design 的布局组件，minHeight 保证撑满整个窗口 */}
      <Layout style={{ minHeight: "100vh" }}>
        {/* Header：顶部菜单栏 */}
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            padding: 0,
            background: "#fff",
            borderBottom: "1px solid #f0f0f0", // 底部分隔线
          }}
        >
          {/* 应用名称 */}
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
          {/* 菜单栏 — mode="horizontal" 使其水平排列，类似传统桌面应用的菜单栏 */}
          <Menu
            mode="horizontal"
            selectable={false} // 菜单栏本身不需要选中高亮
            items={menuItems}
            onClick={onMenuClick}
            style={{ flex: 1, minWidth: 0 }}
          />
        </Header>
        {/* Content：主内容区域，目前为空，后续将放置谱面编辑器 */}
        <Content style={{ flex: 1, background: "#f5f5f5" }} />
      </Layout>
    </ConfigProvider>
  );
}

export default App;