// ============================================================
// Gorge Studio - Rust 后端
// ============================================================
// 本文件是 Tauri 应用的核心后端代码，负责：
// 1. 注册可被前端（React）调用的 Rust 命令
// 2. 处理工程文件（.zip 内包含 .toml 配置）的读写
// 3. 管理 Tauri 插件的初始化
//
// 快速理解：
// - 前端通过 invoke("命令名", { 参数 }) 调用 Rust 函数
// - #[tauri::command] 宏标记的函数会自动注册为可调用命令
// - plugin() 用于注册 Tauri 官方插件（如文件对话框、系统浏览器等）
// ============================================================

use std::fs;
use std::io::{Read, Write};
use serde::{Deserialize, Serialize};
use zip::write::FileOptions;
use zip::ZipWriter;

// -----------------------------------------------------------
// 数据结构
// -----------------------------------------------------------

/// 工程配置文件在 zip 包内的文件名
/// 存储格式为 TOML（比 JSON 更适合人工编辑配置文件）
const PROJECT_FILE: &str = "project.toml";

/// 一个完整的工程数据结构
/// #[derive(Serialize, Deserialize)] 是 Rust 的"魔法"——
/// 自动为这个结构体生成与 TOML/JSON 等格式互转的代码
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Project {
    /// 工程文件格式版本号，用于未来兼容不同版本
    version: String,
    /// 曲目 BPM（Beats Per Minute，每分钟节拍数）
    bpm: f64,
    /// 音符列表，目前为空，后续将填充音符数据
    notes: Vec<Note>,
}

/// 单个音符的数据结构
/// 目前是最简定义，后续会根据音游类型扩展字段
/// （如：下落式音游需要 lane、time、type 等）
#[derive(Serialize, Deserialize, Debug, Clone)]
struct Note {
    /// 占位字段，后续替换为实际音符属性
    placeholder: String,
}

// -----------------------------------------------------------
// Tauri 命令（前端通过 invoke 调用）
// -----------------------------------------------------------

/// 新建工程
///
/// 前端调用方式：
///   const data = await invoke("new_project");
///
/// 行为：
///   创建一个空的工程数据，序列化为 TOML 字符串返回给前端。
///   前端可以将此字符串保存到 .zip 文件中。
#[tauri::command]
fn new_project() -> Result<String, String> {
    // 构造一个默认的空工程
    let project = Project {
        version: "0.1.0".to_string(),
        bpm: 120.0,
        notes: vec![], // 空音符列表
    };
    // 将 Rust 结构体序列化为格式化的 TOML 字符串
    // to_string_pretty 会生成带缩进、易读的输出
    toml::to_string_pretty(&project).map_err(|e| format!("TOML 序列化失败: {}", e))
}

/// 打开工程文件
///
/// 前端调用方式：
///   const data = await invoke("open_project", { path: "/path/to/file.zip" });
///
/// 行为：
///   1. 通过文件路径打开 .zip 压缩包
///   2. 在压缩包内查找 project.toml 文件
///   3. 读取其内容，返回给前端
#[tauri::command]
fn open_project(path: &str) -> Result<String, String> {
    // 步骤1：以只读方式打开文件
    let file = fs::File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;

    // 步骤2：以 zip 格式解析文件内容
    // ZipArchive 允许我们像操作文件夹一样操作 zip 包
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("无法读取 zip: {}", e))?;

    // 步骤3：在 zip 中按文件名查找 project.toml
    let mut entry = archive
        .by_name(PROJECT_FILE)
        .map_err(|e| format!("zip 中未找到 {}: {}", PROJECT_FILE, e))?;

    // 步骤4：将文件内容读取到字符串中
    let mut contents = String::new();
    entry
        .read_to_string(&mut contents)
        .map_err(|e| format!("读取失败: {}", e))?;

    Ok(contents)
}

/// 保存工程文件
///
/// 前端调用方式：
///   await invoke("save_project", { path: "/path/to/file.zip", data: tomlString });
///
/// 行为：
///   1. 创建一个新的 .zip 文件（如果已存在则覆盖）
///   2. 将传入的 TOML 字符串作为 project.toml 写入压缩包
///   3. 使用 Deflated 压缩算法（平衡压缩率与速度）
#[tauri::command]
fn save_project(path: &str, data: &str) -> Result<(), String> {
    // 步骤1：创建目标文件
    let file = fs::File::create(path).map_err(|e| format!("无法创建文件: {}", e))?;

    // 步骤2：创建 zip 写入器——ZipWriter 负责将数据写入 zip 格式
    let mut zip = ZipWriter::new(file);

    // 步骤3：配置压缩选项
    // FileOptions 指定了 zip 条目的元数据和压缩方式
    // <()> 表示不附加额外扩展属性（如 Unix 文件权限等）
    // Deflated 是 zip 最常用的压缩算法，兼容性好
    let options = FileOptions::<()>::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // 步骤4：在 zip 中创建一个新文件条目，名为 project.toml
    zip.start_file(PROJECT_FILE, options)
        .map_err(|e| format!("写入 zip 失败: {}", e))?;

    // 步骤5：将 TOML 数据写入该条目
    zip.write_all(data.as_bytes())
        .map_err(|e| format!("写入数据失败: {}", e))?;

    // 步骤6：完成 zip 写入（必须调用 finish，否则 zip 文件不完整）
    zip.finish().map_err(|e| format!("完成 zip 失败: {}", e))?;

    Ok(())
}

// -----------------------------------------------------------
// Tauri 应用入口
// -----------------------------------------------------------

/// 桌面端入口函数
/// 移动端有单独的入口，通过下面的 cfg_attr 宏条件编译
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 注册 opener 插件：用于在系统默认浏览器中打开链接
        .plugin(tauri_plugin_opener::init())
        // 注册 dialog 插件：用于调用系统原生的文件选择/保存对话框
        .plugin(tauri_plugin_dialog::init())
        // 注册所有 #[tauri::command] 标记的函数，使其可被前端 invoke 调用
        .invoke_handler(tauri::generate_handler![new_project, open_project, save_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}