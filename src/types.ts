export interface VaultMetadata {
  created_at: number;
  updated_at: number;
  accessed_at: number;
}

export interface Account {
  id: string; // Rust's Uuid converts to a standard string in JSON
  account_name: string;
  account_type: string;
  url: string | null;
  username: string | null;
  email: string | null;
  // Note: The actual password bytes are sent too, but we won't 
  // display them on the high-level dashboard for security.
  is_favorite: boolean;
  tags: string[];
  metadata: VaultMetadata;
}