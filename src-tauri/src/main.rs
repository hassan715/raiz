// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod crypto;
mod models;
mod storage;

use crypto::{generate_password, generate_recovery_phrase};
use models::{Account, Vault};
use std::sync::Mutex;
use storage::{load_vault, recover_vault, save_vault, update_vault};
use uuid::Uuid;

// --- ACTIVE MEMORY STATE ---
struct AppState {
    vault: Mutex<Option<Vault>>,
    dek: Mutex<Option<[u8; 32]>>, // We now cache the DEK securely in RAM
    file_path: String,
}

// --- TAURI COMMANDS (THE API) ---

/// Checks if a vault file already exists on this computer.
#[tauri::command]
fn check_vault_exists(state: tauri::State<'_, AppState>) -> bool {
    std::path::Path::new(&state.file_path).exists()
}

/// Creates a brand new vault and returns the 24-word recovery phrase to React.
#[tauri::command]
fn create_vault(password: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    if check_vault_exists(state.clone()) {
        return Err("A vault already exists on this machine.".to_string());
    }

    let phrase = generate_recovery_phrase();
    let empty_vault = Vault::new();

    save_vault(&empty_vault, password, &phrase, &state.file_path)?;
    Ok(phrase) // Send the words to the UI so the user can write them down
}

/// Unlocks an existing vault and stores the Data and DEK in RAM.
#[tauri::command]
fn unlock_vault(password: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    match load_vault(password, &state.file_path) {
        Ok((decrypted_vault, decrypted_dek)) => {
            *state.vault.lock().unwrap() = Some(decrypted_vault);
            *state.dek.lock().unwrap() = Some(decrypted_dek);
            Ok("Vault unlocked".to_string())
        }
        Err(_) => Err("Invalid Master Password or corrupted file.".to_string()),
    }
}

/// Securely wipes active memory.
#[tauri::command]
fn lock_vault(state: tauri::State<'_, AppState>) {
    *state.vault.lock().unwrap() = None;

    // Cryptographically zero out the DEK
    let mut dek_guard = state.dek.lock().unwrap();
    if let Some(mut dek) = *dek_guard {
        dek.fill(0); // Overwrite RAM with zeros before dropping
    }
    *dek_guard = None;
}

/// Sends the list of accounts to the React UI.
#[tauri::command]
fn get_accounts(state: tauri::State<'_, AppState>) -> Result<Vec<Account>, String> {
    let vault_guard = state.vault.lock().unwrap();
    match &*vault_guard {
        Some(vault) => Ok(vault.accounts.clone()),
        None => Err("Vault is currently locked.".to_string()),
    }
}

/// Receives a new or updated Account from React and saves it securely to disk.
#[tauri::command]
fn save_account(account: Account, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        // Check if updating or adding
        if let Some(pos) = vault.accounts.iter().position(|a| a.id == account.id) {
            vault.accounts[pos] = account; // Update
        } else {
            vault.accounts.push(account); // Add new
        }

        // Commit changes to disk instantly
        update_vault(vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked. Cannot save.".to_string())
    }
}

/// Unlocks the vault using the 24-word recovery phrase instead of the master password.
#[tauri::command]
fn unlock_with_recovery(phrase: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    match recover_vault(phrase, &state.file_path) {
        Ok((decrypted_vault, decrypted_dek)) => {
            *state.vault.lock().unwrap() = Some(decrypted_vault);
            *state.dek.lock().unwrap() = Some(decrypted_dek);
            // In the UI, we will prompt the user to immediately change their master password after this.
            Ok("Vault recovered successfully.".to_string())
        }
        Err(_) => Err("Invalid recovery phrase.".to_string()),
    }
}

/// Deletes a specific account from the vault and instantly updates the disk.
#[tauri::command]
fn delete_account(account_id: Uuid, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        vault.accounts.retain(|a| a.id != account_id);
        update_vault(vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

/// Changes the Master Password. Generates and returns a NEW 24-word recovery phrase.
#[tauri::command]
fn change_master_password(
    new_password: &str,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let vault_guard = state.vault.lock().unwrap();

    if let Some(vault) = vault_guard.as_ref() {
        // We generate a new phrase so the old compromised paper backup is invalidated.
        let new_phrase = generate_recovery_phrase();
        save_vault(vault, new_password, &new_phrase, &state.file_path)?;
        Ok(new_phrase)
    } else {
        Err("Vault is locked. Cannot change password.".to_string())
    }
}

/// Generates a secure password for the UI to display and use.
#[tauri::command]
fn generate_secure_password(length: usize, include_symbols: bool) -> String {
    generate_password(length, include_symbols)
}

// --- MAIN THREAD ---
fn main() {
    let state = AppState {
        vault: Mutex::new(None),
        dek: Mutex::new(None),
        file_path: "raiz_vault.enc".to_string(),
    };

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            check_vault_exists,
            create_vault,
            unlock_vault,
            unlock_with_recovery,
            lock_vault,
            get_accounts,
            save_account,
            delete_account,
            change_master_password,
            generate_secure_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
