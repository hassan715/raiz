mod crypto;
mod models;
mod storage;

use crypto::{generate_password, generate_recovery_phrase};
use models::{Account, AccountDetails, Vault};
use rand::{rngs::OsRng, RngCore};
use region::{lock, unlock};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::sync::Mutex;
use storage::{load_vault, recover_vault, save_vault, update_vault};
use uuid::Uuid;
use zeroize::Zeroize;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_clipboard_manager::ClipboardExt;

#[cfg(target_family = "unix")]
fn prevent_os_swap() {
    unsafe {
        let _ = libc::mlockall(libc::MCL_CURRENT | libc::MCL_FUTURE);
    }
}

#[cfg(not(target_family = "unix"))]
fn prevent_os_swap() {}

// --- ACTIVE MEMORY STATE ---
struct AppState {
    encrypted_vault_ram: Mutex<Option<(Vec<u8>, Vec<u8>)>>,
    ram_key: [u8; 32],
    dek: Mutex<Option<[u8; 32]>>,
    file_path: String,
}

impl AppState {
    fn get_vault(&self) -> Result<Vault, String> {
        let guard = self.encrypted_vault_ram.lock().unwrap();
        if let Some((nonce, ciphertext)) = guard.as_ref() {
            let vault_bytes = crate::crypto::decrypt(&self.ram_key, nonce, ciphertext)?;
            let vault: Vault = rmp_serde::from_slice(&vault_bytes).map_err(|e| e.to_string())?;
            Ok(vault)
        } else {
            Err("Vault is currently locked.".to_string())
        }
    }

    fn set_vault(&self, vault: &Vault) -> Result<(), String> {
        let vault_bytes = rmp_serde::to_vec(vault).map_err(|e| e.to_string())?;
        let (nonce, ciphertext) = crate::crypto::encrypt(&self.ram_key, &vault_bytes)?;
        *self.encrypted_vault_ram.lock().unwrap() = Some((nonce, ciphertext));
        Ok(())
    }
}

// --- TRUE ZERO-KNOWLEDGE HELPER ---
fn extract_secret_bytes(account: &Account, field: &str) -> Option<Vec<u8>> {
    match field {
        "password" => match &account.details {
            AccountDetails::Login { password, .. } => password.clone(),
            AccountDetails::Password { password, .. } => password.clone(),
            _ => None,
        },
        "cvv" => {
            if let AccountDetails::CreditCard { cvv, .. } = &account.details {
                cvv.clone()
            } else {
                None
            }
        }
        "seed_phrase" => {
            if let AccountDetails::CryptoWallet { seed_phrase, .. } = &account.details {
                seed_phrase.clone()
            } else {
                None
            }
        }
        "card_number" => {
            if let AccountDetails::CreditCard { card_number, .. } = &account.details {
                card_number.clone()
            } else {
                None
            }
        }
        "recovery_codes" => {
            if let AccountDetails::Login { recovery_codes, .. } = &account.details {
                let codes: Vec<String> = recovery_codes
                    .iter()
                    .map(|rc| String::from_utf8_lossy(&rc.code).to_string())
                    .collect();
                Some(codes.join("\n").into_bytes())
            } else {
                None
            }
        }
        _ => None,
    }
}

// --- TAURI COMMANDS (THE API) ---

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn check_vault_exists(state: tauri::State<'_, AppState>) -> bool {
    std::path::Path::new(&state.file_path).exists()
}

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

    let clean_name = profile_name.trim();
    if !clean_name.is_empty() {
        empty_vault.profile_name = clean_name.to_string();
    }

    save_vault(&empty_vault, password, &phrase, &state.file_path)?;
    Ok(phrase)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn unlock_vault(password: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    match load_vault(password, &state.file_path) {
        Ok((decrypted_vault, decrypted_dek)) => {
            state.set_vault(&decrypted_vault)?;

            let mut dek_guard = state.dek.lock().unwrap();
            *dek_guard = Some(decrypted_dek);

            if let Some(ref mut active_dek) = *dek_guard {
                let _ = lock(active_dek.as_ptr(), active_dek.len());
            }

            Ok("Vault unlocked".to_string())
        }
        Err(_) => Err("Invalid Password. Please try again.".to_string()),
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn lock_vault(state: tauri::State<'_, AppState>) {
    *state.encrypted_vault_ram.lock().unwrap() = None;

    let mut dek_guard = state.dek.lock().unwrap();
    if let Some(ref mut active_dek) = *dek_guard {
        active_dek.zeroize();
        let _ = unlock(active_dek.as_ptr(), active_dek.len());
    }
    *dek_guard = None;
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_accounts(state: tauri::State<'_, AppState>) -> Result<Vec<Account>, String> {
    let vault = state.get_vault()?;

    // In-place mutation avoids allocating a new vector
    let mut scrubbed = vault.accounts;

    for acc in &mut scrubbed {
        match &mut acc.details {
            AccountDetails::Login {
                password,
                recovery_codes,
                ..
            } => {
                if let Some(pw) = password {
                    *pw = vec![];
                }
                for rc in recovery_codes.iter_mut() {
                    rc.code = vec![];
                }
            }
            // Fix: Matches `Some` directly in the arm, satisfying collapsible_match
            AccountDetails::Password {
                password: Some(pw), ..
            } => {
                *pw = vec![];
            }
            AccountDetails::CreditCard {
                card_number, cvv, ..
            } => {
                if let Some(cn) = card_number {
                    *cn = vec![];
                }
                if let Some(c) = cvv {
                    *c = vec![];
                }
            }
            // Fix: Matches `Some` directly in the arm, satisfying collapsible_match
            AccountDetails::CryptoWallet {
                seed_phrase: Some(sp),
                ..
            } => {
                *sp = vec![];
            }
            _ => {}
        }
    }
    Ok(scrubbed)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_full_account(
    account_id: Uuid,
    state: tauri::State<'_, AppState>,
) -> Result<Account, String> {
    let mut vault = state.get_vault()?;

    // Using iter_mut().find() satisfies Clippy's manual_find lint
    if let Some(account) = vault.accounts.iter_mut().find(|a| a.id == account_id) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        account.metadata.accessed_at = now;
        let cloned_account = account.clone();

        let dek_guard = state.dek.lock().unwrap();
        if let Some(dek) = dek_guard.as_ref() {
            state.set_vault(&vault)?;
            let _ = update_vault(&vault, dek, &state.file_path);
        }
        Ok(cloned_account)
    } else {
        Err("Account not found.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn copy_secret_to_clipboard(
    account_id: Uuid,
    field: String,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut vault = state.get_vault()?;

    if let Some(account) = vault.accounts.iter_mut().find(|a| a.id == account_id) {
        if let Some(secret_bytes) = extract_secret_bytes(account, &field) {
            let secret_str =
                String::from_utf8(secret_bytes).map_err(|_| "Invalid Encoding".to_string())?;
            app.clipboard()
                .write_text(secret_str)
                .map_err(|e| e.to_string())?;

            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            account.metadata.accessed_at = now;

            let dek_guard = state.dek.lock().unwrap();
            if let Some(dek) = dek_guard.as_ref() {
                state.set_vault(&vault)?;
                let _ = update_vault(&vault, dek, &state.file_path);
            }
            Ok(())
        } else {
            Err("Secret data not found or empty.".to_string())
        }
    } else {
        Err("Account not found.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn reveal_secret(
    account_id: Uuid,
    field: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.get_vault()?;

    if let Some(account) = vault.accounts.iter().find(|a| a.id == account_id) {
        if let Some(secret_bytes) = extract_secret_bytes(account, &field) {
            // Direct return satisfies Clippy's let_and_return lint
            String::from_utf8(secret_bytes).map_err(|_| "Invalid Encoding".to_string())
        } else {
            Ok(String::new())
        }
    } else {
        Err("Account not found.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn save_account(mut account: Account, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        if let Some(pos) = vault.accounts.iter().position(|a| a.id == account.id) {
            let existing = &vault.accounts[pos];

            let is_changed = existing.account_name != account.account_name
                || existing.notes != account.notes
                || existing.tags != account.tags
                || existing.is_favorite != account.is_favorite
                || existing.details != account.details
                || existing.vault_id != account.vault_id;

            if is_changed {
                account.metadata.updated_at = now;
            } else {
                account.metadata = existing.metadata.clone();
            }

            vault.accounts[pos] = account;
        } else {
            account.metadata.created_at = now;
            account.metadata.updated_at = now;
            account.metadata.accessed_at = now;
            vault.accounts.push(account);
        }

        state.set_vault(&vault)?;
        update_vault(&vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked. Cannot save.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn unlock_with_recovery(phrase: &str, state: tauri::State<'_, AppState>) -> Result<String, String> {
    match recover_vault(phrase, &state.file_path) {
        Ok((decrypted_vault, decrypted_dek)) => {
            state.set_vault(&decrypted_vault)?;

            let mut dek_guard = state.dek.lock().unwrap();
            *dek_guard = Some(decrypted_dek);

            if let Some(ref mut active_dek) = *dek_guard {
                let _ = lock(active_dek.as_ptr(), active_dek.len());
            }

            Ok("Vault recovered successfully.".to_string())
        }
        Err(_) => Err("Invalid recovery phrase.".to_string()),
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_account(account_id: Uuid, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        vault.accounts.retain(|a| a.id != account_id);
        state.set_vault(&vault)?;
        update_vault(&vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

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

    let vault = state.get_vault()?;
    let new_phrase = generate_recovery_phrase();
    save_vault(&vault, new_password, &new_phrase, &state.file_path)?;
    Ok(new_phrase)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn generate_secure_password(length: usize, include_symbols: bool) -> String {
    generate_password(length, include_symbols)
}

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

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_entire_vault(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let vault_path = &state.file_path;

    if std::path::Path::new(vault_path).exists() {
        fs::remove_file(vault_path).map_err(|e| e.to_string())?;
    }

    *state.encrypted_vault_ram.lock().unwrap() = None;
    let mut dek_guard = state.dek.lock().unwrap();
    if let Some(ref mut active_dek) = *dek_guard {
        active_dek.zeroize();
        let _ = unlock(active_dek.as_ptr(), active_dek.len());
    }
    *dek_guard = None;

    Ok(())
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn reset_master_password(
    new_password: &str,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let vault = state.get_vault()?;
    let new_phrase = generate_recovery_phrase();
    storage::save_vault(&vault, new_password, &new_phrase, &state.file_path)?;
    Ok(new_phrase)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_global_tags(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    Ok(state.get_vault()?.tags)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_active_tags(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let vault = state.get_vault()?;
    let mut active_tags: HashSet<String> = HashSet::new();

    for account in &vault.accounts {
        for tag in &account.tags {
            active_tags.insert(tag.clone());
        }
    }

    let mut tags_vec: Vec<String> = active_tags.into_iter().collect();
    tags_vec.sort_by_key(|a| a.to_lowercase());
    Ok(tags_vec)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn add_global_tag(tag: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        let clean_tag = tag.trim().to_string();
        if !clean_tag.is_empty() && !vault.tags.contains(&clean_tag) {
            vault.tags.push(clean_tag);
            state.set_vault(&vault)?;
            storage::update_vault(&vault, dek, &state.file_path)?;
        }
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_global_tag(tag: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        vault.tags.retain(|t| t != &tag);
        state.set_vault(&vault)?;
        storage::update_vault(&vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_vaults(state: tauri::State<'_, AppState>) -> Result<Vec<models::InnerVault>, String> {
    Ok(state.get_vault()?.vaults)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn create_inner_vault(
    name: String,
    description: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        let desc_opt = if description.trim().is_empty() {
            None
        } else {
            Some(description)
        };

        vault.add_inner_vault(&name, desc_opt)?;
        state.set_vault(&vault)?;
        crate::storage::update_vault(&vault, dek, &state.file_path)?;
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
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        let desc_opt = description.filter(|d| !d.trim().is_empty());

        vault.update_inner_vault(uuid, &name, desc_opt)?;
        state.set_vault(&vault)?;
        crate::storage::update_vault(&vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn delete_inner_vault(id: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&id).map_err(|_| "Invalid vault ID".to_string())?;
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        vault.delete_inner_vault(uuid)?;
        state.set_vault(&vault)?;
        crate::storage::update_vault(&vault, dek, &state.file_path)?;
        Ok(())
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_profile_name(state: tauri::State<'_, AppState>) -> Result<String, String> {
    Ok(state.get_vault()?.profile_name)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn update_profile_name(new_name: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        let clean_name = new_name.trim().to_string();
        if !clean_name.is_empty() {
            vault.profile_name = clean_name;
            state.set_vault(&vault)?;
            storage::update_vault(&vault, dek, &state.file_path)?;
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
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        if let Some(account) = vault.accounts.iter_mut().find(|a| a.id == account_id) {
            account.vault_id = Some(new_vault_id);
            state.set_vault(&vault)?;
            crate::storage::update_vault(&vault, dek, &state.file_path)?;
            Ok(())
        } else {
            Err("Account not found in active memory.".to_string())
        }
    } else {
        Err("Vault is locked. Cannot move account.".to_string())
    }
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn get_most_common_username(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let vault = state.get_vault()?;
    let mut counts: HashMap<&str, usize> = HashMap::new();
    let mut max_count = 0;
    let mut most_common = String::new();

    for account in &vault.accounts {
        if let models::AccountDetails::Login {
            username: Some(ref uname),
            ..
        } = account.details
        {
            let clean_uname = uname.trim();
            if !clean_uname.is_empty() {
                let count = counts.entry(clean_uname).or_insert(0);
                *count += 1;
                if *count > max_count {
                    max_count = *count;
                    most_common = clean_uname.to_string();
                }
            }
        }
    }
    Ok(most_common)
}

#[cfg(not(tarpaulin_include))]
#[tauri::command]
fn update_accessed_at(account_id: Uuid, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut vault = state.get_vault()?;
    let dek_guard = state.dek.lock().unwrap();

    if let Some(dek) = dek_guard.as_ref() {
        if let Some(account) = vault.accounts.iter_mut().find(|a| a.id == account_id) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;

            account.metadata.accessed_at = now;
            state.set_vault(&vault)?;
            update_vault(&vault, dek, &state.file_path)?;
            Ok(())
        } else {
            Err("Account not found.".to_string())
        }
    } else {
        Err("Vault is locked.".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    prevent_os_swap();

    let mut ram_key = [0u8; 32];
    OsRng.fill_bytes(&mut ram_key);

    #[cfg(target_family = "unix")]
    let _ = region::lock(ram_key.as_ptr(), ram_key.len());

    let state = AppState {
        encrypted_vault_ram: Mutex::new(None),
        ram_key,
        dek: Mutex::new(None),
        file_path: "raiz_vault.enc".to_string(),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let toggle_i = MenuItem::with_id(app, "toggle", "Show/Hide Raiz", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit Raiz", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "toggle" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            check_vault_exists,
            create_vault,
            unlock_vault,
            unlock_with_recovery,
            lock_vault,
            get_accounts,
            get_full_account,
            copy_secret_to_clipboard,
            reveal_secret,
            save_account,
            delete_account,
            change_master_password,
            generate_secure_password,
            export_vault,
            delete_entire_vault,
            reset_master_password,
            get_global_tags,
            get_active_tags,
            add_global_tag,
            delete_global_tag,
            get_vaults,
            create_inner_vault,
            edit_inner_vault,
            delete_inner_vault,
            get_profile_name,
            update_profile_name,
            move_account_to_vault,
            get_most_common_username,
            update_accessed_at
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
