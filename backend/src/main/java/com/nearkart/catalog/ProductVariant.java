package com.nearkart.catalog;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "product_variants")
class ProductVariant {
	@Id UUID id;
	UUID productId;
	String label;
	String barcode;
	Instant createdAt;
	Instant updatedAt;
	protected ProductVariant() {}
	ProductVariant(UUID productId, String label, String barcode, Instant now) {
		id = UUID.randomUUID();
		this.productId = productId;
		this.label = label;
		this.barcode = barcode;
		createdAt = updatedAt = now;
	}
}
