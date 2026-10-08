ALTER TABLE users ADD COLUMN auth_version integer NOT NULL DEFAULT 0;
CREATE TABLE account_recovery (
    token_hash varchar(64) PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    expires_at timestamptz NOT NULL
);
