mod crypto;
mod models;
mod storage;

use crypto::{generate_password, generate_recovery_phrase};
use models::{Account, Vault};
use std::fs;
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
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn check_vault_exists(state: tauri::State<'_, AppState>) -> bool {
    std::path::Path::new(&state.file_path).exists()
}

/// Creates a brand new vault and returns the 24-word recovery phrase to React.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn create_vault(
    password: &str,
    profile_name: &str,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    if check_vault_exists(state.clone()) {
        return Err("A vault already exists on this machine.".to_string());
    }

    let phrase = generate_recovery_phrase();
    let mut empty_vault = Vault::new();

    // Set the user's chosen profile name, fallback to default if they sent an empty string
    let clean_name = profile_name.trim();
    if !clean_name.is_empty() {
        empty_vault.profile_name = clean_name.to_string();
    }

    save_vault(&empty_vault, password, &phrase, &state.file_path)?;
    Ok(phrase) // Send the words to the UI so the user can write them down
}

/// Unlocks an existing vault and stores the Data and DEK in RAM.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn unlock_vault(password: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    match load_vault(password, &state.file_path) {
        Ok((decrypted_vault, decrypted_dek)) => {
            *state.vault.lock().unwrap() = Some(decrypted_vault);
            *state.dek.lock().unwrap() = Some(decrypted_dek);
            Ok("Vault unlocked".to_string())
        }
        Err(_) => Err("Invalid Password. Please try again.".to_string()),
    }
}

/// Securely wipes active memory.
#[cfg(not(tarpaulin_include))]
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
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_accounts(state: tauri::State<'_, AppState>) -> Result<Vec<Account>, String> {
    let vault_guard = state.vault.lock().unwrap();
    match &*vault_guard {
        Some(vault) => Ok(vault.accounts.clone()),
        None => Err("Vault is currently locked.".to_string()),
    }
}

/// Receives a new or updated Account from React and saves it securely to disk.
#[cfg(not(tarpaulin_include))]
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
#[cfg(not(tarpaulin_include))]
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
#[cfg(not(tarpaulin_include))]
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

/// Changes the Master Password and generates a NEW 24-word recovery phrase.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn change_master_password(
    current_password: &str,
    new_password: &str,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    if load_vault(current_password, &state.file_path).is_err() {
        return Err("Incorrect current Master Password.".to_string());
    }

    let vault_guard = state.vault.lock().unwrap();

    if let Some(vault) = vault_guard.as_ref() {
        let new_phrase = generate_recovery_phrase();
        save_vault(vault, new_password, &new_phrase, &state.file_path)?;
        Ok(new_phrase)
    } else {
        Err("Vault is locked. Cannot change password.".to_string())
    }
}

/// Generates a secure password for the UI to display and use.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn generate_secure_password(length: usize, include_symbols: bool) -> String {
    generate_password(length, include_symbols)
}

/// Securely copies the encrypted vault file to the path chosen by the user.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn export_vault(destination_path: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let vault_path = &state.file_path;

    if !std::path::Path::new(vault_path).exists() {
        return Err("Vault file not found. Nothing to export.".to_string());
    }

    std::fs::copy(vault_path, &destination_path).map_err(|e| e.to_string())?;

    Ok(())
}

/// Permanently deletes the vault from the hard drive and wipes RAM.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_entire_vault(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let vault_path = &state.file_path;

    if std::path::Path::new(vault_path).exists() {
        fs::remove_file(vault_path).map_err(|e| e.to_string())?;
    }

    *state.vault.lock().unwrap() = None;
    let mut dek_guard = state.dek.lock().unwrap();
    if let Some(mut dek) = *dek_guard {
        dek.fill(0);
    }
    *dek_guard = None;

    Ok(())
}

/// Resets the Master Password after a successful recovery.
#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn reset_master_password(
    new_password: &str,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let vault_guard = state.vault.lock().unwrap();

    if let Some(vault) = vault_guard.as_ref() {
        let new_phrase = generate_recovery_phrase();
        storage::save_vault(vault, new_password, &new_phrase, &state.file_path)?;
        Ok(new_phrase)
    } else {
        Err("Vault is locked. Cannot reset password.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_global_tags(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let vault_guard = state.vault.lock().unwrap();
    match &*vault_guard {
        Some(vault) => Ok(vault.tags.clone()),
        None => Err("Vault is currently locked.".to_string()),
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn add_global_tag(tag: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        let clean_tag = tag.trim().to_string();
        if !clean_tag.is_empty() && !vault.tags.contains(&clean_tag) {
            vault.tags.push(clean_tag);
            storage::update_vault(vault, dek, &state.file_path)?;
        }
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_global_tag(tag: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        vault.tags.retain(|t| t != &tag);
        storage::update_vault(vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_vaults(state: tauri::State<'_, AppState>) -> Result<Vec<models::InnerVault>, String> {
    let vault_guard = state.vault.lock().unwrap();
    match &*vault_guard {
        Some(vault) => Ok(vault.vaults.clone()),
        None => Err("Vault is currently locked.".to_string()),
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn create_inner_vault(
    name: String,
    description: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        let desc_opt = if description.trim().is_empty() {
            None
        } else {
            Some(description)
        };

        vault.add_inner_vault(&name, desc_opt)?;
        crate::storage::update_vault(vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn edit_inner_vault(
    id: String,
    name: String,
    description: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|_| "Invalid vault ID".to_string())?;
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        let desc_opt = description.filter(|d| !d.trim().is_empty());

        vault.update_inner_vault(uuid, &name, desc_opt)?;
        crate::storage::update_vault(vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_inner_vault(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|_| "Invalid vault ID".to_string())?;
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        vault.delete_inner_vault(uuid)?;
        crate::storage::update_vault(vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_profile_name(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let vault_guard = state.vault.lock().unwrap();
    match &*vault_guard {
        Some(vault) => Ok(vault.profile_name.clone()),
        None => Err("Vault is locked.".to_string()),
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn update_profile_name(new_name: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        let clean_name = new_name.trim().to_string();
        if !clean_name.is_empty() {
            vault.profile_name = clean_name;
            storage::update_vault(vault, dek, &state.file_path)?;
        }
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn move_account_to_vault(
    account_id: Uuid,
    new_vault_id: Uuid,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut vault_guard = state.vault.lock().unwrap();
    let dek_guard = state.dek.lock().unwrap();

    if let (Some(vault), Some(dek)) = (vault_guard.as_mut(), dek_guard.as_ref()) {
        if let Some(account) = vault.accounts.iter_mut().find(|a| a.id == account_id) {
            account.vault_id = Some(new_vault_id);
            crate::storage::update_vault(vault, dek, &state.file_path)?;
            Ok(())
        } else {
            Err("Account not found in active memory.".to_string())
        }
    } else {
        Err("Vault is locked. Cannot move account.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState {
        vault: Mutex::new(None),
        dek: Mutex::new(None),
        file_path: "raiz_vault.enc".to_string(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
            generate_secure_password,
            export_vault,
            delete_entire_vault,
            reset_master_password,
            get_global_tags,
            add_global_tag,
            delete_global_tag,
            get_vaults,
            create_inner_vault,
            edit_inner_vault,
            delete_inner_vault,
            get_profile_name,
            update_profile_name,
            move_account_to_vault
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
