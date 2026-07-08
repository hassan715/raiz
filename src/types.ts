export type AccountType =
  | 'Login'
  | 'Password'
  | 'Secure Note'
  | 'Credit Card'
  | 'Identity'
  | 'Crypto Wallet';

export interface BaseAccount {
  id: string;
  vault_id: string | null;
  account_name: string;
  notes: number[] | null;
  tags: string[];
  is_favorite: boolean;
  metadata: {
    created_at: number;
    updated_at: number;
    accessed_at: number;
    archived_at: number | null;
  };
}

export interface LoginAccount extends BaseAccount {
  account_type: 'Login';
  url: string | null;
  username: string | null;
  email: string | null;
  password: number[] | null;
  password_history: number[][];
  has_2fa: boolean;
  recovery_codes: { code: number[]; is_used: boolean }[];
}

export interface PasswordAccount extends BaseAccount {
  account_type: 'Password';
  url: string | null;
  identifier: string | null;
  password: number[] | null;
}

export interface SecureNoteAccount extends BaseAccount {
  account_type: 'Secure Note';
}

export interface CreditCardAccount extends BaseAccount {
  account_type: 'Credit Card';
  cardholder_name: string | null;
  card_number: number[] | null;
  expiration: string | null;
  cvv: number[] | null;
}

export interface IdentityAccount extends BaseAccount {
  account_type: 'Identity';
  id_number: string | null;
  dob: string | null;
}

export interface CryptoWalletAccount extends BaseAccount {
  account_type: 'Crypto Wallet';
  wallet_address: string | null;
  seed_phrase: number[] | null;
}

export type Account =
  | LoginAccount
  | PasswordAccount
  | SecureNoteAccount
  | CreditCardAccount
  | IdentityAccount
  | CryptoWalletAccount;

export interface InnerVault {
  id: string;
  name: string;
  description: string | null;
}

export interface VaultConfig {
  profile_name: string;
  tags: string[];
  vaults: InnerVault[];
}
