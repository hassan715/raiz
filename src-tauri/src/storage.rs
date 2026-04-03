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
pub fn load_vault(master_password: &str, file_path: &str) -> Result<Vault, String> {
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

    Ok(vault)
}

/// Recovery Load: Unlocks the vault using the 24-Word Phrase (Box 2).
pub fn recover_vault(recovery_phrase: &str, file_path: &str) -> Result<Vault, String> {
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

    Ok(vault)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::generate_recovery_phrase;
    use std::fs;

    #[test]
    fn test_dual_lockbox_architecture() {
        let password = "SuperSecretMasterPassword!";
        let recovery_phrase = generate_recovery_phrase();
        let test_file = "test_dual_vault.enc";

        let vault = Vault::new();

        // 1. Save vault using BOTH keys
        save_vault(&vault, password, &recovery_phrase, test_file)
            .expect("Failed to save dual-lock vault");

        // 2. Load via Master Password (Should Succeed)
        let loaded_via_password = load_vault(password, test_file);
        assert!(
            loaded_via_password.is_ok(),
            "Failed to unlock with Master Password"
        );

        // 3. Load via Recovery Phrase (Should Succeed)
        let loaded_via_recovery = recover_vault(&recovery_phrase, test_file);
        assert!(
            loaded_via_recovery.is_ok(),
            "Failed to unlock with Recovery Phrase"
        );

        // 4. Try loading with WRONG password (Must Fail)
        let failed_password_load = load_vault("WrongPassword!", test_file);
        assert!(failed_password_load.is_err());

        // 5. Try loading with WRONG recovery phrase (Must Fail)
        let failed_recovery_load = recover_vault("apple wrong bracket dog...", test_file);
        assert!(failed_recovery_load.is_err());

        let _ = fs::remove_file(test_file);
    }
}
