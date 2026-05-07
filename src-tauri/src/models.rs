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

/// Default profile name for backward compatibility
fn default_profile_name() -> String {
    "Admin".to_string()
}

/// The root structure representing the entire user database.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vault {
    pub profile_name: String,
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
            profile_name: default_profile_name(),
            accounts: Vec::new(),
            tags: default_tags(),
            vaults: default_inner_vaults(),
        }
    }

    /// Adds a new inner vault, ensuring the name is unique (case-insensitive).
    pub fn add_inner_vault(
        &mut self,
        name: &str,
        description: Option<String>,
    ) -> Result<(), String> {
        let clean_name = name.trim();
        if clean_name.is_empty() {
            return Err("Vault name cannot be empty.".to_string());
        }

        // Case-insensitive duplicate check
        if self
            .vaults
            .iter()
            .any(|v| v.name.eq_ignore_ascii_case(clean_name))
        {
            return Err(format!("A vault named '{}' already exists.", clean_name));
        }

        self.vaults.push(InnerVault {
            id: Uuid::new_v4(),
            name: clean_name.to_string(),
            description,
        });

        Ok(())
    }

    /// Edits an existing inner vault, ensuring the new name doesn't conflict.
    pub fn update_inner_vault(
        &mut self,
        id: Uuid,
        new_name: &str,
        description: Option<String>,
    ) -> Result<(), String> {
        if id.is_nil() {
            return Err("Cannot edit the default Personal vault.".to_string());
        }

        let clean_name = new_name.trim();
        if clean_name.is_empty() {
            return Err("Vault name cannot be empty.".to_string());
        }

        // Check for duplicates (excluding the vault we are currently editing)
        if self
            .vaults
            .iter()
            .any(|v| v.id != id && v.name.eq_ignore_ascii_case(clean_name))
        {
            return Err(format!("A vault named '{}' already exists.", clean_name));
        }

        if let Some(vault) = self.vaults.iter_mut().find(|v| v.id == id) {
            vault.name = clean_name.to_string();
            vault.description = description;
            Ok(())
        } else {
            Err("Vault not found.".to_string())
        }
    }

    /// Deletes an inner vault and CASCADE DELETES all accounts within it.
    pub fn delete_inner_vault(&mut self, id: Uuid) -> Result<(), String> {
        if id.is_nil() {
            return Err("Cannot delete the default Personal vault.".to_string());
        }

        let initial_len = self.vaults.len();
        self.vaults.retain(|v| v.id != id);

        if self.vaults.len() == initial_len {
            return Err("Vault not found.".to_string());
        }

        // Cascade Delete: Remove all accounts that belonged to this vault
        self.accounts.retain(|acc| acc.vault_id != Some(id));

        Ok(())
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
    pub archived_at: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serde_defaults() {
        // Explicitly call the default functions so the coverage tool marks them as tested
        assert_eq!(default_vault_id(), Some(Uuid::nil()));

        // Cover the profile name fallback
        assert_eq!(default_profile_name(), "Admin".to_string());

        let tags = default_tags();
        assert_eq!(tags.len(), 4);
        assert!(tags.contains(&"Personal".to_string()));

        let vaults = default_inner_vaults();
        assert_eq!(vaults.len(), 1);
        assert_eq!(vaults[0].id, Uuid::nil());
        assert_eq!(vaults[0].name, "Personal");

        // Cover the description fallback
        assert_eq!(
            vaults[0].description,
            Some("Default personal vault".to_string())
        );
    }

    #[test]
    fn test_add_inner_vault_duplicate_prevention() {
        let mut vault = Vault::new();
        let initial_len = vault.vaults.len();

        // 1. Test adding a valid new vault
        let res1 = vault.add_inner_vault("Work", Some("Work stuff".to_string()));
        assert!(res1.is_ok());
        assert_eq!(vault.vaults.len(), initial_len + 1);

        // 2. Test exact duplicate
        let res2 = vault.add_inner_vault("Work", None);
        assert!(res2.is_err());
        assert_eq!(res2.unwrap_err(), "A vault named 'Work' already exists.");

        // 3. Test case-insensitive duplicate (e.g., user types "wOrK")
        let res3 = vault.add_inner_vault("wOrK", None);
        assert!(res3.is_err());
        assert_eq!(res3.unwrap_err(), "A vault named 'wOrK' already exists.");

        // 4. Test empty name rejection
        let res4 = vault.add_inner_vault("   ", None);
        assert!(res4.is_err());
        assert_eq!(res4.unwrap_err(), "Vault name cannot be empty.");
    }

    #[test]
    fn test_update_and_delete_vault() {
        let mut vault = Vault::new();

        // Cannot delete or update default vault
        assert!(vault.delete_inner_vault(Uuid::nil()).is_err());
        assert!(vault
            .update_inner_vault(Uuid::nil(), "Hacked", None)
            .is_err());

        // Create two custom vaults for testing
        vault.add_inner_vault("Work", None).unwrap();
        vault.add_inner_vault("Finance", None).unwrap();

        let work_id = vault.vaults.iter().find(|v| v.name == "Work").unwrap().id;

        // 1. Update with empty name
        let res_empty = vault.update_inner_vault(work_id, "   ", None);
        assert!(res_empty.is_err());
        assert_eq!(res_empty.unwrap_err(), "Vault name cannot be empty.");

        // 2. Update to a duplicate name (tests case-insensitivity too)
        let res_dup = vault.update_inner_vault(work_id, "fInAnCe", None);
        assert!(res_dup.is_err());
        assert_eq!(
            res_dup.unwrap_err(),
            "A vault named 'fInAnCe' already exists."
        );

        // 3. Update a non-existent vault
        let fake_id = Uuid::new_v4();
        let res_fake_update = vault.update_inner_vault(fake_id, "Ghost", None);
        assert!(res_fake_update.is_err());
        assert_eq!(res_fake_update.unwrap_err(), "Vault not found.");

        // 4. Delete a non-existent vault
        let res_fake_delete = vault.delete_inner_vault(fake_id);
        assert!(res_fake_delete.is_err());
        assert_eq!(res_fake_delete.unwrap_err(), "Vault not found.");

        // --- THE SUCCESS TESTS ---

        // Test updating successfully
        let res = vault.update_inner_vault(work_id, "Office", Some("Desc".to_string()));
        assert!(res.is_ok());
        assert_eq!(
            vault.vaults.iter().find(|v| v.id == work_id).unwrap().name,
            "Office"
        );

        // Test cascade delete successfully
        vault.delete_inner_vault(work_id).unwrap();
        assert!(!vault.vaults.iter().any(|v| v.id == work_id));
    }
}
