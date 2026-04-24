use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
}

impl Vault {
    /// Creates a completely empty, initialized vault.
    pub fn new() -> Self {
        Self {
            accounts: Vec::new(),
            tags: default_tags(),
        }
    }
}

/// Represents a single saved credential (e.g., GitHub, Gmail, Instagram).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Account {
    pub id: Uuid,
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
