use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::Manager;

#[derive(Serialize)]
pub struct AudioFile {
    path: String,
    name: String,
    size: u64,
    modified: u128,
    created: u128,
}

fn is_path_allowed(app: &tauri::AppHandle, path: &Path) -> bool {
    let home_dir = match app.path().home_dir() {
        Ok(h) => h,
        Err(_) => return false,
    };

    // Prevent directory traversal
    if path
        .components()
        .any(|c| matches!(c, std::path::Component::ParentDir))
    {
        return false;
    }

    let canonical_path = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let canonical_home = match fs::canonicalize(home_dir) {
        Ok(h) => h,
        Err(_) => return false,
    };

    canonical_path.starts_with(canonical_home)
}

#[tauri::command]
fn get_audio_files(app: tauri::AppHandle, dir: String) -> Result<Vec<AudioFile>, String> {
    let path = Path::new(&dir);
    if !is_path_allowed(&app, path) {
        return Err("Access denied: path not allowed".to_string());
    }

    let extensions = ["mp3", "wav", "flac", "ogg", "m4a", "wma"];

    match fs::read_dir(path) {
        Ok(entries) => Ok(entries
            .filter_map(|entry| {
                let entry = entry.ok()?;
                let path = entry.path();
                if path.is_file() {
                    let ext = path.extension()?.to_str()?.to_lowercase();
                    if extensions.contains(&ext.as_str()) {
                        let metadata = fs::metadata(&path).ok()?;
                        return Some(AudioFile {
                            path: path.to_str()?.to_owned(),
                            name: path.file_name()?.to_str()?.to_owned(),
                            size: metadata.len(),
                            modified: metadata
                                .modified()
                                .ok()?
                                .duration_since(std::time::UNIX_EPOCH)
                                .ok()?
                                .as_millis(),
                            created: metadata
                                .created()
                                .ok()?
                                .duration_since(std::time::UNIX_EPOCH)
                                .ok()?
                                .as_millis(),
                        });
                    }
                }
                None
            })
            .collect()),
        Err(_) => Ok(vec![]),
    }
}

#[tauri::command]
fn move_file(app: tauri::AppHandle, file_path: String, target_dir: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !is_path_allowed(&app, path) {
        return Err("Access denied: source path not allowed".to_string());
    }

    let target_path = Path::new(&target_dir);
    if !is_path_allowed(&app, target_path) {
        return Err("Access denied: target directory not allowed".to_string());
    }

    let file_name = path.file_name().ok_or("Invalid filename")?;

    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let dest = Path::new(&target_dir).join(file_name);

    fs::rename(path, dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn copy_file(app: tauri::AppHandle, file_path: String, target_dir: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if !is_path_allowed(&app, path) {
        return Err("Access denied: source path not allowed".to_string());
    }

    let target_path = Path::new(&target_dir);
    if !is_path_allowed(&app, target_path) {
        return Err("Access denied: target directory not allowed".to_string());
    }

    let file_name = path.file_name().ok_or("Invalid filename")?;

    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let dest = Path::new(&target_dir).join(file_name);

    fs::copy(path, dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn exit_app() {
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_audio_files,
            move_file,
            copy_file,
            exit_app
        ])
        .on_window_event(|_window, event| match event {
            tauri::WindowEvent::CloseRequested { .. } => {
                std::process::exit(0);
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
