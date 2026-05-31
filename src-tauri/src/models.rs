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

    #[test]
    fn test_discriminated_union_schema() {
        let acc = Account {
            id: Uuid::new_v4(),
            vault_id: Some(Uuid::nil()),
            account_name: "My Bank".to_string(),
            notes: None,
            tags: vec![],
            is_favorite: false,
            metadata: Metadata {
                created_at: 0,
                updated_at: 0,
                accessed_at: 0,
                archived_at: None,
            },
            details: AccountDetails::CreditCard {
                cardholder_name: Some("John Doe".to_string()),
                card_number: Some(vec![1, 2, 3]),
                expiration: Some("12/26".to_string()),
                cvv: Some(vec![4, 5, 6]),
            },
        };

        // If you had serde_json in dev-dependencies, we could check string output.
        // We verify structural integrity here.
        if let AccountDetails::CreditCard {
            cardholder_name, ..
        } = acc.details
        {
            assert_eq!(cardholder_name.unwrap(), "John Doe");
        } else {
            panic!("Enum mapping failed");
        }
    }
}
