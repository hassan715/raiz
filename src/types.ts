export interface VaultMetadata {
  created_at: number;
  updated_at: number;
  accessed_at: number;
}

export interface RecoveryCode {
  code: number[]; // Sending bytes to Rust
  is_used: boolean;
}

export interface Account {
  id: string;
  account_name: string;
  account_type: string;
  url: string | null;
  username: string | null;
  email: string | null;
  password: number[]; // Sending bytes to Rust
  password_history: number[][];
  has_2fa: boolean;
  recovery_codes: RecoveryCode[];
  notes: number[] | null; // Sending bytes to Rust
  tags: string[];
  is_favorite: boolean;
  metadata: VaultMetadata;
}