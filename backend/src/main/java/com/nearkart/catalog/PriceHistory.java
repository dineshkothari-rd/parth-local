package com.nearkart.catalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "price_history")
class PriceHistory {
	@Id UUID id;
	UUID storeProductId;
	@Column(precision = 12, scale = 2) BigDecimal oldAmount;
	@Column(precision = 12, scale = 2) BigDecimal newAmount;
	String currency;
	UUID changedBy;
	Instant createdAt;
	Instant updatedAt;
	protected PriceHistory() {}
	PriceHistory(UUID listingId, BigDecimal oldAmount, BigDecimal newAmount, String currency, UUID userId, Instant now) {
		id = UUID.randomUUID();
		storeProductId = listingId;
		this.oldAmount = oldAmount;
		this.newAmount = newAmount;
		this.currency = currency;
		changedBy = userId;
		createdAt = updatedAt = now;
	}
}
