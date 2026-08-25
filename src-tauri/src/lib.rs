use std::fs;
use std::io::{Read, Write};
use zip::write::FileOptions;
use zip::ZipWriter;

const PROJECT_FILE: &str = "project.json";

#[tauri::command]
fn new_project() -> String {
    serde_json::json!({
        "version": "0.1.0",
        "bpm": 120,
        "notes": []
    })
    .to_string()
}

#[tauri::command]
fn open_project(path: &str) -> Result<String, String> {
    let file = fs::File::open(path).map_err(|e| format!("无法打开文件: {}", e))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("无法读取 zip: {}", e))?;
    let mut entry = archive
        .by_name(PROJECT_FILE)
        .map_err(|e| format!("zip 中未找到 project.json: {}", e))?;
    let mut contents = String::new();
    entry
        .read_to_string(&mut contents)
        .map_err(|e| format!("读取失败: {}", e))?;
    Ok(contents)
}

#[tauri::command]
fn save_project(path: &str, data: &str) -> Result<(), String> {
    let file = fs::File::create(path).map_err(|e| format!("无法创建文件: {}", e))?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::<()>::default().compression_method(zip::CompressionMethod::Deflated);
    zip.start_file(PROJECT_FILE, options)
        .map_err(|e| format!("写入 zip 失败: {}", e))?;
    zip.write_all(data.as_bytes())
        .map_err(|e| format!("写入数据失败: {}", e))?;
    zip.finish().map_err(|e| format!("完成 zip 失败: {}", e))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![new_project, open_project, save_project])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}