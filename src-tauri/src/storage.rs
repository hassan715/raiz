use crate::crypto::{decrypt, derive_key, encrypt, generate_salt};
use crate::models::Vault;
use argon2::password_hash::SaltString;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::fs::{File, OpenOptions};
use std::io::{Read, Write};

/// The upgraded outer envelope featuring dual-key architecture.
#[derive(Serialize, Deserialize)]
pub struct VaultEnvelope {
    // --- Box 1: The Master Password Lock ---
    pub salt: String,
    pub dek_nonce: Vec<u8>,
    pub encrypted_dek: Vec<u8>,

    // --- Box 2: The 24-Word Recovery Lock ---
    pub recovery_salt: String,
    pub recovery_dek_nonce: Vec<u8>,
    pub recovery_encrypted_dek: Vec<u8>,

    // --- The Vault Data ---
    pub vault_nonce: Vec<u8>,
    pub encrypted_vault: Vec<u8>,
}

/// Saves the vault, locking the DEK with BOTH the Master Password and the Recovery Phrase.
pub fn save_vault(
    vault: &Vault,
    master_password: &str,
    recovery_phrase: &str,
    file_path: &str,
) -> Result<(), String> {
    let vault_bytes = rmp_serde::to_vec(vault).map_err(|e| e.to_string())?;

    // 1. Generate the core Data Encryption Key (DEK)
    let mut dek = [0u8; 32];
    OsRng.fill_bytes(&mut dek);

    // 2. Encrypt the Vault data using the DEK
    let (vault_nonce, encrypted_vault) = encrypt(&dek, &vault_bytes)?;

    // 3. Lock Box 1: Encrypt the DEK using the Master Password
    let salt = generate_salt();
    let kek = derive_key(master_password, &salt)?;
    let (dek_nonce, encrypted_dek) = encrypt(&kek, &dek)?;

    // 4. Lock Box 2: Encrypt a COPY of the DEK using the Recovery Phrase
    // We treat the 24 words exactly like a password, giving it its own unique salt.
    let recovery_salt = generate_salt();
    let recovery_kek = derive_key(recovery_phrase, &recovery_salt)?;
    let (recovery_dek_nonce, recovery_encrypted_dek) = encrypt(&recovery_kek, &dek)?;

    // 5. Package the Envelope
    let envelope = VaultEnvelope {
        salt: salt.to_string(),
        dek_nonce,
        encrypted_dek,
        recovery_salt: recovery_salt.to_string(),
        recovery_dek_nonce,
        recovery_encrypted_dek,
        vault_nonce,
        encrypted_vault,
    };

    let file_bytes = rmp_serde::to_vec(&envelope).map_err(|e| e.to_string())?;

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(file_path)
        .map_err(|e| e.to_string())?;

    file.write_all(&file_bytes).map_err(|e| e.to_string())?;

    Ok(())
}

/// Standard Load: Unlocks the vault using the Master Password (Box 1).
pub fn load_vault(master_password: &str, file_path: &str) -> Result<(Vault, [u8; 32]), String> {
    let mut file = File::open(file_path).map_err(|_| "Vault file not found".to_string())?;
    let mut file_bytes = Vec::new();
    file.read_to_end(&mut file_bytes)
        .map_err(|e| e.to_string())?;

    let envelope: VaultEnvelope = rmp_serde::from_slice(&file_bytes)
        .map_err(|_| "Failed to parse vault file.".to_string())?;

    let salt = SaltString::from_b64(&envelope.salt).map_err(|_| "Invalid salt".to_string())?;
    let kek = derive_key(master_password, &salt)?;

    // Decrypt Box 1
    let decrypted_dek = decrypt(&kek, &envelope.dek_nonce, &envelope.encrypted_dek)?;
    let mut dek = [0u8; 32];
    dek.copy_from_slice(&decrypted_dek);

    let decrypted_vault_bytes = decrypt(&dek, &envelope.vault_nonce, &envelope.encrypted_vault)?;
    let vault: Vault = rmp_serde::from_slice(&decrypted_vault_bytes).map_err(|e| e.to_string())?;

    Ok((vault, dek))
}

/// Recovery Load: Unlocks the vault using the 24-Word Phrase (Box 2).
pub fn recover_vault(recovery_phrase: &str, file_path: &str) -> Result<(Vault, [u8; 32]), String> {
    let mut file = File::open(file_path).map_err(|_| "Vault file not found".to_string())?;
    let mut file_bytes = Vec::new();
    file.read_to_end(&mut file_bytes)
        .map_err(|e| e.to_string())?;

    let envelope: VaultEnvelope = rmp_serde::from_slice(&file_bytes)
        .map_err(|_| "Failed to parse vault file.".to_string())?;

    let recovery_salt =
        SaltString::from_b64(&envelope.recovery_salt).map_err(|_| "Invalid salt".to_string())?;
    let recovery_kek = derive_key(recovery_phrase, &recovery_salt)?;

    // Decrypt Box 2
    let decrypted_dek = decrypt(
        &recovery_kek,
        &envelope.recovery_dek_nonce,
        &envelope.recovery_encrypted_dek,
    )?;
    let mut dek = [0u8; 32];
    dek.copy_from_slice(&decrypted_dek);

    let decrypted_vault_bytes = decrypt(&dek, &envelope.vault_nonce, &envelope.encrypted_vault)?;
    let vault: Vault = rmp_serde::from_slice(&decrypted_vault_bytes).map_err(|e| e.to_string())?;

    Ok((vault, dek))
}

/// Updates the vault data on disk without needing the Master Password or Recovery Phrase.
pub fn update_vault(vault: &Vault, dek: &[u8; 32], file_path: &str) -> Result<(), String> {
    // 1. Read the existing envelope from disk
    let mut file = File::open(file_path).map_err(|_| "Vault file not found".to_string())?;
    let mut file_bytes = Vec::new();
    file.read_to_end(&mut file_bytes)
        .map_err(|e| e.to_string())?;

    let mut envelope: VaultEnvelope = rmp_serde::from_slice(&file_bytes)
        .map_err(|_| "Failed to parse vault file.".to_string())?;

    // 2. Encrypt the updated Vault data using our cached DEK
    let vault_bytes = rmp_serde::to_vec(vault).map_err(|e| e.to_string())?;
    let (new_vault_nonce, new_encrypted_vault) = encrypt(dek, &vault_bytes)?;

    // 3. Update ONLY the data portion of the envelope
    envelope.vault_nonce = new_vault_nonce;
    envelope.encrypted_vault = new_encrypted_vault;

    // 4. Save the modified envelope back to disk
    let new_file_bytes = rmp_serde::to_vec(&envelope).map_err(|e| e.to_string())?;
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(file_path)
        .map_err(|e| e.to_string())?;
    file.write_all(&new_file_bytes).map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::generate_recovery_phrase;
    use crate::models::{Account, AccountDetails, Metadata};
    use std::fs;
    use uuid::Uuid;

    #[test]
    fn test_complete_vault_lifecycle() {
        let password = "SuperSecretMasterPassword!";
        let recovery_phrase = generate_recovery_phrase();
        let test_file = "test_lifecycle_vault.enc";

        let vault = Vault::new();

        // 1. Save vault using BOTH keys
        save_vault(&vault, password, &recovery_phrase, test_file)
            .expect("Failed to save dual-lock vault");

        // 2. Load via Master Password (Extract the Vault AND the cached DEK)
        let (mut loaded_vault, cached_dek) =
            load_vault(password, test_file).expect("Failed to load via Master Password");

        // 3. Test Active Memory Update (Add an account without the Master Password)
        // FIX: Constructed the account using the new Discriminated Union schema
        let new_account = Account {
            id: Uuid::new_v4(),
            vault_id: Some(Uuid::nil()), // Added the default Personal vault ID
            account_name: "Test GitHub".to_string(),
            notes: None,
            tags: vec![],
            is_favorite: false,
            metadata: Metadata {
                created_at: 0,
                updated_at: 0,
                accessed_at: 0,
                archived_at: None,
            },
            details: AccountDetails::Login {
                url: None,
                username: None,
                email: None,
                password: Some(vec![1, 2, 3]), // Dummy encrypted bytes
                password_history: vec![],
                has_2fa: false,
                recovery_codes: vec![],
            },
        };

        loaded_vault.accounts.push(new_account);
        update_vault(&loaded_vault, &cached_dek, test_file)
            .expect("Failed to perform Active Memory update");

        // 4. Load via Recovery Phrase to verify Box 2 works AND the new account was saved
        let (recovered_vault, _) =
            recover_vault(&recovery_phrase, test_file).expect("Failed to load via Recovery Phrase");

        assert_eq!(
            recovered_vault.accounts.len(),
            1,
            "The account was not saved correctly!"
        );
        assert_eq!(recovered_vault.accounts[0].account_name, "Test GitHub");

        // 5. Verify multi-vault and global tags defaults populated correctly
        assert_eq!(
            recovered_vault.vaults.len(),
            1,
            "Default vault was not created"
        );
        assert_eq!(
            recovered_vault.tags.len(),
            4,
            "Default tags were not created"
        );

        // Verify profile name saved correctly
        assert_eq!(
            recovered_vault.profile_name, "Admin",
            "Profile name was not saved/recovered correctly"
        );
        // Cleanup
        let _ = fs::remove_file(test_file);
    }
}
