package com.nearkart.catalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "prices")
class Price {
	@Id UUID id;
	UUID storeProductId;
	@Column(precision = 12, scale = 2) BigDecimal amount;
	String currency;
	@Version int version;
	Instant createdAt;
	Instant updatedAt;
	protected Price() {}
	Price(UUID listingId, BigDecimal amount, String currency, Instant now) {
		id = UUID.randomUUID();
		storeProductId = listingId;
		this.amount = amount;
		this.currency = currency;
		createdAt = updatedAt = now;
	}
	void update(BigDecimal amount, String currency, Instant now) {
		this.amount = amount;
		this.currency = currency;
		updatedAt = now;
	}
}
