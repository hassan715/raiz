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

fn default_inner_vaults() -> Vec<InnerVault> {
    vec![InnerVault {
        id: Uuid::nil(),
        name: "Personal".to_string(),
        description: Some("Default personal vault".to_string()),
    }]
}

fn default_vault_id() -> Option<Uuid> {
    Some(Uuid::nil())
}

fn default_tags() -> Vec<String> {
    vec![
        "Work".to_string(),
        "Personal".to_string(),
        "Finance".to_string(),
        "School".to_string(),
    ]
}

fn default_profile_name() -> String {
    "Admin".to_string()
}

/// The root structure representing the entire user database.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vault {
    pub profile_name: String,
    pub accounts: Vec<Account>,
    #[serde(default = "default_tags")]
    pub tags: Vec<String>,
    #[serde(default = "default_inner_vaults")]
    pub vaults: Vec<InnerVault>,
}

impl Vault {
    pub fn new() -> Self {
        Self {
            profile_name: default_profile_name(),
            accounts: Vec::new(),
            tags: default_tags(),
            vaults: default_inner_vaults(),
        }
    }

    pub fn add_inner_vault(
        &mut self,
        name: &str,
        description: Option<String>,
    ) -> Result<(), String> {
        let clean_name = name.trim();
        if clean_name.is_empty() {
            return Err("Vault name cannot be empty.".to_string());
        }
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

    pub fn delete_inner_vault(&mut self, id: Uuid) -> Result<(), String> {
        if id.is_nil() {
            return Err("Cannot delete the default Personal vault.".to_string());
        }
        let initial_len = self.vaults.len();
        self.vaults.retain(|v| v.id != id);
        if self.vaults.len() == initial_len {
            return Err("Vault not found.".to_string());
        }
        self.accounts.retain(|acc| acc.vault_id != Some(id));
        Ok(())
    }
}

/// Strongly typed, specific details for different credential archetypes
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(tag = "account_type")]
pub enum AccountDetails {
    Login {
        url: Option<String>,
        username: Option<String>,
        email: Option<String>,
        password: Option<Vec<u8>>,
        #[serde(default)]
        password_history: Vec<Vec<u8>>,
        #[serde(default)]
        has_2fa: bool,
        #[serde(default)]
        recovery_codes: Vec<RecoveryCode>,
    },
    Password {
        url: Option<String>,
        identifier: Option<String>,
        password: Option<Vec<u8>>,
    },
    #[serde(rename = "Secure Note")]
    SecureNote,
    #[serde(rename = "Credit Card")]
    CreditCard {
        cardholder_name: Option<String>,
        card_number: Option<Vec<u8>>, // Stored as encrypted bytes
        expiration: Option<String>,
        cvv: Option<Vec<u8>>, // Stored as encrypted bytes
    },
    Identity {
        id_number: Option<String>,
        dob: Option<String>,
    },
    #[serde(rename = "Crypto Wallet")]
    CryptoWallet {
        wallet_address: Option<String>,
        seed_phrase: Option<Vec<u8>>, // Stored as encrypted bytes
    },
    #[serde(other)] // Fallback to prevent app crash on future schema changes
    Unknown,
}

/// Represents a single saved credential/asset.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Account {
    pub id: Uuid,
    #[serde(default = "default_vault_id")]
    pub vault_id: Option<Uuid>,
    pub account_name: String,
    pub notes: Option<Vec<u8>>, // Encrypted bytes
    pub tags: Vec<String>,
    pub is_favorite: bool,
    pub metadata: Metadata,

    #[serde(flatten)] // Merges the enum fields natively into the JSON payload
    pub details: AccountDetails,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct RecoveryCode {
    pub code: Vec<u8>,
    pub is_used: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Metadata {
    pub created_at: u64,
    pub updated_at: u64,
    pub accessed_at: u64,
    pub archived_at: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    // --- 1. VAULT LOGIC & VALIDATION TESTS ---

    #[test]
    fn test_vault_initialization_defaults() {
        let vault = Vault::new();
        assert_eq!(
            vault.profile_name, "Admin",
            "Profile name should default to Admin"
        );
        assert_eq!(vault.tags.len(), 4, "Should initialize with 4 default tags");
        assert_eq!(
            vault.vaults.len(),
            1,
            "Should initialize with 1 default inner vault"
        );
        assert_eq!(
            vault.vaults[0].id,
            Uuid::nil(),
            "Default vault should use nil UUID"
        );
        assert_eq!(
            vault.vaults[0].name, "Personal",
            "Default vault should be named Personal"
        );
    }

    #[test]
    fn test_inner_vault_crud_operations() {
        let mut vault = Vault::new();

        // Test Add
        assert!(vault
            .add_inner_vault("Work", Some("Work related".to_string()))
            .is_ok());
        assert_eq!(vault.vaults.len(), 2);

        // Test Prevent Duplicate Names (case-insensitive)
        assert!(
            vault.add_inner_vault("WORK", None).is_err(),
            "Should prevent duplicate vault names"
        );

        let work_vault_id = vault.vaults[1].id;

        // Test Update
        assert!(vault
            .update_inner_vault(work_vault_id, "Office", None)
            .is_ok());
        assert_eq!(vault.vaults[1].name, "Office");

        // Test Prevent Updating/Deleting Default Vault
        assert!(
            vault
                .update_inner_vault(Uuid::nil(), "Hacked", None)
                .is_err(),
            "Cannot rename default vault"
        );
        assert!(
            vault.delete_inner_vault(Uuid::nil()).is_err(),
            "Cannot delete default vault"
        );

        // Test Delete and Cascade (Removing a vault should orphan/remove accounts mapped to it)
        let dummy_acc = Account {
            id: Uuid::new_v4(),
            vault_id: Some(work_vault_id),
            account_name: "Office PC".to_string(),
            notes: None,
            tags: vec![],
            is_favorite: false,
            metadata: Metadata {
                created_at: 0,
                updated_at: 0,
                accessed_at: 0,
                archived_at: None,
            },
            details: AccountDetails::SecureNote,
        };
        vault.accounts.push(dummy_acc);
        assert_eq!(vault.accounts.len(), 1);

        assert!(vault.delete_inner_vault(work_vault_id).is_ok());
        assert_eq!(vault.vaults.len(), 1, "Work vault should be deleted");
        assert_eq!(
            vault.accounts.len(),
            0,
            "Accounts tied to the deleted vault should be cascade-deleted"
        );
    }

    // --- 2. SERDE (SERIALIZATION/DESERIALIZATION) TESTS FOR EVERY VARIANT ---

    fn create_base_account(details: AccountDetails) -> Account {
        Account {
            id: Uuid::nil(),
            vault_id: Some(Uuid::nil()),
            account_name: "Test Account".to_string(),
            notes: None,
            tags: vec!["Test".to_string()],
            is_favorite: true,
            metadata: Metadata {
                created_at: 1000,
                updated_at: 1000,
                accessed_at: 1000,
                archived_at: None,
            },
            details,
        }
    }

    #[test]
    fn test_login_account_serde() {
        let details = AccountDetails::Login {
            url: Some("https://mail.com".to_string()),
            username: Some("johndoe".to_string()),
            email: Some("john@mail.com".to_string()),
            password: Some(vec![9, 9, 9]),
            password_history: vec![],
            has_2fa: true,
            recovery_codes: vec![RecoveryCode {
                code: vec![1, 2, 3],
                is_used: false,
            }],
        };
        let acc = create_base_account(details);

        // Serialize: Check flattened properties
        let serialized = serde_json::to_value(&acc).expect("Failed to serialize");
        assert_eq!(serialized["account_type"], "Login");
        assert_eq!(serialized["username"], "johndoe");
        assert_eq!(serialized["has_2fa"], true);

        // Deserialize: Prove bidirectional integrity
        let deserialized: Account =
            serde_json::from_value(serialized).expect("Failed to deserialize");
        assert_eq!(acc, deserialized);
    }

    #[test]
    fn test_password_account_serde() {
        let details = AccountDetails::Password {
            url: Some("192.168.1.1".to_string()),
            identifier: Some("Home WiFi".to_string()),
            password: Some(vec![1, 2, 3]),
        };
        let acc = create_base_account(details);

        let serialized = serde_json::to_value(&acc).expect("Failed to serialize");
        assert_eq!(serialized["account_type"], "Password");
        assert_eq!(serialized["identifier"], "Home WiFi");

        let deserialized: Account =
            serde_json::from_value(serialized).expect("Failed to deserialize");
        assert_eq!(acc, deserialized);
    }

    #[test]
    fn test_secure_note_serde() {
        let details = AccountDetails::SecureNote;
        let acc = create_base_account(details);

        let serialized = serde_json::to_value(&acc).expect("Failed to serialize");
        assert_eq!(serialized["account_type"], "Secure Note");
        assert!(serialized.get("username").is_none());

        let deserialized: Account =
            serde_json::from_value(serialized).expect("Failed to deserialize");
        assert_eq!(acc, deserialized);
    }

    #[test]
    fn test_credit_card_serde() {
        let details = AccountDetails::CreditCard {
            cardholder_name: Some("John Doe".to_string()),
            card_number: Some(vec![4, 2]),
            expiration: Some("12/26".to_string()),
            cvv: Some(vec![1, 2, 3]),
        };
        let acc = create_base_account(details);

        let serialized = serde_json::to_value(&acc).expect("Failed to serialize");
        assert_eq!(serialized["account_type"], "Credit Card");
        assert_eq!(serialized["expiration"], "12/26");

        let deserialized: Account =
            serde_json::from_value(serialized).expect("Failed to deserialize");
        assert_eq!(acc, deserialized);
    }

    #[test]
    fn test_identity_serde() {
        let details = AccountDetails::Identity {
            id_number: Some("A1234567".to_string()),
            dob: Some("01/01/1990".to_string()),
        };
        let acc = create_base_account(details);

        let serialized = serde_json::to_value(&acc).expect("Failed to serialize");
        assert_eq!(serialized["account_type"], "Identity");
        assert_eq!(serialized["id_number"], "A1234567");

        let deserialized: Account =
            serde_json::from_value(serialized).expect("Failed to deserialize");
        assert_eq!(acc, deserialized);
    }

    #[test]
    fn test_crypto_wallet_serde() {
        let details = AccountDetails::CryptoWallet {
            wallet_address: Some("0xABC123".to_string()),
            seed_phrase: Some(vec![0, 0, 0]),
        };
        let acc = create_base_account(details);

        let serialized = serde_json::to_value(&acc).expect("Failed to serialize");
        assert_eq!(serialized["account_type"], "Crypto Wallet");
        assert_eq!(serialized["wallet_address"], "0xABC123");

        let deserialized: Account =
            serde_json::from_value(serialized).expect("Failed to deserialize");
        assert_eq!(acc, deserialized);
    }

    // --- 3. FORWARD COMPATIBILITY TEST ---

    #[test]
    fn test_unknown_account_type_fallback() {
        // Simulating JSON generated by a future version of the app with a new account type
        let future_json = json!({
            "id": Uuid::nil(),
            "vault_id": Uuid::nil(),
            "account_name": "Quantum Key",
            "notes": null,
            "tags": [],
            "is_favorite": false,
            "metadata": { "created_at": 0, "updated_at": 0, "accessed_at": 0, "archived_at": null },
            "account_type": "Quantum Credentials", // Does not exist in our enum
            "quantum_state": "superposition" // Unknown property
        });

        // The app MUST NOT crash. It should gracefully deserialize into AccountDetails::Unknown
        let deserialized: Result<Account, _> = serde_json::from_value(future_json);

        assert!(
            deserialized.is_ok(),
            "Deserialization should succeed using #[serde(other)]"
        );
        assert_eq!(deserialized.unwrap().details, AccountDetails::Unknown);
    }
}
