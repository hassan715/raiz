use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, Params,
};

use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit},
    XChaCha20Poly1305, XNonce,
};

use bip39::{Language, Mnemonic};
use rand::RngCore;

// Argon2id Parameters tuned for a desktop application.
// This balances strong security against brute-force attacks with acceptable UX wait times.
const M_COST: u32 = 65536; // Memory cost: 64 MB
const T_COST: u32 = 3; // Time cost: 3 iterations
const P_COST: u32 = 4; // Parallelism: 4 threads

/// Generates a secure, random 32-character Salt string.
pub fn generate_salt() -> SaltString {
    SaltString::generate(&mut OsRng)
}

/// Derives a 32-byte Key Encryption Key (KEK) from a plaintext password and a salt.
pub fn derive_key(password: &str, salt: &SaltString) -> Result<[u8; 32], String> {
    // 1. Configure the Argon2id parameters
    let params = Params::new(M_COST, T_COST, P_COST, Some(32))
        .map_err(|e| format!("Failed to create Argon2 params: {}", e))?;

    // 2. Initialize the Argon2 instance
    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

    // 3. Allocate a 32-byte array (256 bits) filled with zeros to hold our final key
    let mut key = [0u8; 32];

    // 4. Perform the mathematical stretching
    // FIX: Added .as_str() before .as_bytes() on the salt variable
    argon2
        .hash_password_into(password.as_bytes(), salt.as_str().as_bytes(), &mut key)
        .map_err(|e| format!("Failed to derive key: {}", e))?;

    Ok(key)
}

/// Encrypts a plaintext byte array using XChaCha20-Poly1305.
/// Returns a tuple containing the (Nonce, Ciphertext).
pub fn encrypt(key: &[u8; 32], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    // Initialize the cipher with our 32-byte key
    let cipher = XChaCha20Poly1305::new(key.into());

    // Generate a secure, random 24-byte Nonce
    let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);

    // Perform the encryption
    let ciphertext = cipher
        .encrypt(&nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Return the Nonce and the Ciphertext. We need to save BOTH to the file.
    Ok((nonce.to_vec(), ciphertext))
}

/// Decrypts ciphertext using the exact Key and Nonce used during encryption.
pub fn decrypt(key: &[u8; 32], nonce: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = XChaCha20Poly1305::new(key.into());
    let nonce_obj = XNonce::from_slice(nonce);

    // Perform the decryption. If the Poly1305 authentication tag detects
    // even a single flipped bit in the file, this will fail.
    let plaintext = cipher
        .decrypt(nonce_obj, ciphertext)
        .map_err(|_| "Decryption failed: Incorrect key or corrupted data".to_string())?;

    Ok(plaintext)
}

/// Generates a cryptographically secure 24-word recovery phrase.
pub fn generate_recovery_phrase() -> String {
    // A 24-word phrase mathematically requires exactly 32 bytes (256 bits) of entropy.
    let mut entropy = [0u8; 32];

    // We explicitly use rand::rngs::OsRng here to avoid import collisions
    rand::rngs::OsRng.fill_bytes(&mut entropy);

    // Feed the entropy into the BIP39 engine to get our English words
    let mnemonic = Mnemonic::from_entropy_in(Language::English, &entropy)
        .expect("Failed to generate mnemonic from entropy");

    // The crate implements the standard Display trait to output the phrase string
    mnemonic.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deterministic_key_derivation() {
        // Setup
        let password = "RaizMasterPassword2026!";
        let salt = generate_salt();

        // Execution
        let key1 = derive_key(password, &salt).expect("Failed to derive key 1");
        let key2 = derive_key(password, &salt).expect("Failed to derive key 2");

        // Assertion: The same password and salt MUST yield the exact same 32-byte key.
        // If this fails, our vault will never decrypt successfully.
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_different_passwords_yield_different_keys() {
        // Setup
        let salt = generate_salt();

        // Execution
        let key1 = derive_key("Password_A", &salt).unwrap();
        let key2 = derive_key("Password_B", &salt).unwrap();

        // Assertion: Even a 1-character difference must completely change the output key.
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_different_salts_yield_different_keys() {
        // Setup
        let password = "IdenticalPassword!";
        let salt1 = generate_salt();
        let salt2 = generate_salt();

        // Execution
        let key1 = derive_key(password, &salt1).unwrap();
        let key2 = derive_key(password, &salt2).unwrap();

        // Assertion: Two users with the exact same password must have completely different keys.
        assert_ne!(key1, key2);
    }

    #[test]
    fn test_encryption_round_trip() {
        // Setup
        let key = [42u8; 32]; // A dummy 32-byte key for testing
        let secret_message = b"Raiz offline vault confidential data: 10 backup codes.";

        // Execution: Encrypt
        let (nonce, ciphertext) = encrypt(&key, secret_message).unwrap();

        // Execution: Decrypt
        let decrypted_message = decrypt(&key, &nonce, &ciphertext).unwrap();

        // Assertion
        assert_eq!(secret_message.to_vec(), decrypted_message);
        assert_ne!(secret_message.to_vec(), ciphertext); // Ensure it's actually scrambled
    }

    #[test]
    fn test_decryption_fails_on_tampered_data() {
        // Setup
        let key = [42u8; 32];
        let secret_message = b"This data will be corrupted.";
        let (nonce, mut ciphertext) = encrypt(&key, secret_message).unwrap();

        // Simulation: A hacker alters a single byte of the encrypted file,
        // or bit-rot corrupts the hard drive.
        ciphertext[0] ^= 1;

        // Execution
        let result = decrypt(&key, &nonce, &ciphertext);

        // Assertion: The Poly1305 math MUST catch the tampering and return an error.
        assert!(result.is_err());
    }
}
