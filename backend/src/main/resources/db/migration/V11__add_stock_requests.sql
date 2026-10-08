CREATE TABLE stock_requests (
    id uuid PRIMARY KEY,
    customer_id uuid NOT NULL REFERENCES users(id),
    store_product_id uuid NOT NULL REFERENCES store_products(id),
    kind varchar(20) NOT NULL CHECK (kind IN ('ENQUIRY', 'RESERVATION')),
    quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
    message varchar(500) NOT NULL DEFAULT '',
    response varchar(500) NOT NULL DEFAULT '',
    status varchar(20) NOT NULL CHECK (status IN ('PENDING','AVAILABLE','UNAVAILABLE','CONFIRMED','DECLINED','CANCELLED','FULFILLED','EXPIRED')),
    quoted_amount numeric(12,2),
    currency varchar(3),
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL
);
CREATE INDEX idx_stock_requests_customer ON stock_requests(customer_id, created_at DESC);
CREATE INDEX idx_stock_requests_listing ON stock_requests(store_product_id, status, expires_at);
CREATE UNIQUE INDEX idx_stock_requests_open ON stock_requests(customer_id, store_product_id, kind) WHERE status IN ('PENDING','CONFIRMED');
