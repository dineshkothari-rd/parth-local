package com.nearkart.catalog;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "store_products")
class StoreProduct {
	@Id UUID id;
	UUID storeId;
	UUID productVariantId;
	@Enumerated(EnumType.STRING) ProductStatus status;
	Instant createdAt;
	Instant updatedAt;
	protected StoreProduct() {}
	StoreProduct(UUID storeId, UUID variantId, Instant now) {
		id = UUID.randomUUID();
		this.storeId = storeId;
		productVariantId = variantId;
		status = ProductStatus.ACTIVE;
		createdAt = updatedAt = now;
	}
}
