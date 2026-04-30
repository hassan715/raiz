use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Inner Vaults (Categories/Folders) ---
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InnerVault {
    pub id: Uuid,
    pub name: String,
    #[serde(default)] // Allows backward compatibility
    pub description: Option<String>,
}

// Automatically injects a default "Personal" vault into old database files
fn default_inner_vaults() -> Vec<InnerVault> {
    vec![InnerVault {
        id: Uuid::nil(), // Uses a zeroed-out UUID (00000000-0000-0000-0000-000000000000)
        name: "Personal".to_string(),
        description: Some("Default personal vault".to_string()),
    }]
}

// Automatically assigns old un-vaulted accounts to the Personal vault
fn default_vault_id() -> Option<Uuid> {
    Some(Uuid::nil())
}

/// Default tags for new vaults AND backward compatibility for old files
fn default_tags() -> Vec<String> {
    vec![
        "Work".to_string(),
        "Personal".to_string(),
        "Finance".to_string(),
        "School".to_string(),
    ]
}

/// The root structure representing the entire user database.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vault {
    pub accounts: Vec<Account>,
    #[serde(default = "default_tags")] // Instantly fixes old .enc files!
    pub tags: Vec<String>,
    #[serde(default = "default_inner_vaults")] // Seamlessly migrates old files
    pub vaults: Vec<InnerVault>,
}

impl Vault {
    /// Creates a completely empty, initialized vault.
    pub fn new() -> Self {
        Self {
            accounts: Vec::new(),
            tags: default_tags(),
            vaults: default_inner_vaults(),
        }
    }
}

/// Represents a single saved credential (e.g., GitHub, Gmail, Instagram).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: Uuid,
    #[serde(default = "default_vault_id")]
    pub vault_id: Option<Uuid>,
    pub account_name: String,
    pub account_type: String, // e.g., "Website", "App", "Email"
    pub url: Option<String>,
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Vec<u8>, // Stored as encrypted bytes, not a plain string!
    pub password_history: Vec<Vec<u8>>,
    pub has_2fa: bool, // NEW: Track if 2FA is enabled
    pub recovery_codes: Vec<RecoveryCode>,
    pub notes: Option<Vec<u8>>, // Encrypted bytes
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub metadata: Metadata,
}

/// Represents a single static backup code.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecoveryCode {
    pub code: Vec<u8>, // Encrypted bytes
    pub is_used: bool, // Restored your original naming
}

/// Tracks the lifecycle of the account entry.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Metadata {
    pub created_at: u64, // Unix timestamp
    pub updated_at: u64,
    pub accessed_at: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serde_defaults() {
        // Explicitly call the default functions so the coverage tool marks them as tested
        assert_eq!(default_vault_id(), Some(Uuid::nil()));

        let tags = default_tags();
        assert_eq!(tags.len(), 4);
        assert!(tags.contains(&"Personal".to_string()));

        let vaults = default_inner_vaults();
        assert_eq!(vaults.len(), 1);
        assert_eq!(vaults[0].id, Uuid::nil());
        assert_eq!(vaults[0].name, "Personal");
    }
}
