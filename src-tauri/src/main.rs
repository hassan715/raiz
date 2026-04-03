// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod crypto;
mod models;
mod storage;

use models::Vault;
use std::sync::Mutex;
use storage::{load_vault, save_vault};

// This struct holds our application state in RAM while the app is running.
struct AppState {
    // The vault is wrapped in an Option (it might be locked/None)
    // and a Mutex (to prevent multiple threads from mutating it at once).
    vault: Mutex<Option<Vault>>,
    // Hardcoded for the prototype. We can make this dynamic later.
    file_path: String,
}

fn main() {
    // Initialize our empty state
    let state = AppState {
        vault: Mutex::new(None),
        file_path: "raiz_vault.enc".to_string(),
    };

    tauri::Builder::default()
        .manage(state) // Tell Tauri to manage this state
        .invoke_handler(tauri::generate_handler![unlock_vault, lock_vault])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Called by React to attempt to unlock the vault.
#[tauri::command]
fn unlock_vault(password: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    // 1. Check if the file exists. If not, we should probably create it.
    if !std::path::Path::new(&state.file_path).exists() {
        let empty_vault = Vault::new();
        save_vault(
            &empty_vault,
            password,
            "dummy phrase for now",
            &state.file_path,
        )
        .map_err(|e| format!("Failed to create new vault: {}", e))?;
    }

    // 2. Attempt to load and decrypt the vault
    match load_vault(password, &state.file_path) {
        Ok(decrypted_vault) => {
            // 3. If successful, acquire the Mutex lock and store the vault in RAM
            let mut vault_state = state.vault.lock().unwrap();
            *vault_state = Some(decrypted_vault);
            Ok("Vault unlocked successfully".to_string())
        }
        Err(_) => {
            // We intentionally do not pass the exact error to the frontend
            // to prevent side-channel information leaks.
            Err("Invalid Master Password or corrupted file.".to_string())
        }
    }
}

/// Called by React to explicitly wipe the vault from RAM.
#[tauri::command]
fn lock_vault(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault_state = state.vault.lock().unwrap();
    // Zero out the vault in active memory
    *vault_state = None;
    Ok(())
}
