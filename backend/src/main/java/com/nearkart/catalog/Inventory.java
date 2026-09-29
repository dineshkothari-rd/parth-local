package com.nearkart.catalog;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "inventory")
class Inventory {
	@Id UUID id;
	UUID storeProductId;
	Integer quantity;
	@Enumerated(EnumType.STRING) Availability availability;
	String source;
	Instant observedAt;
	UUID updatedBy;
	@Version int version;
	Instant createdAt;
	Instant updatedAt;
	protected Inventory() {}
	Inventory(UUID listingId, Integer quantity, Availability availability, UUID userId, Instant now) {
		id = UUID.randomUUID();
		storeProductId = listingId;
		this.quantity = quantity;
		this.availability = availability;
		source = "OWNER";
		observedAt = now;
		updatedBy = userId;
		createdAt = updatedAt = now;
	}
	void update(Integer quantity, Availability availability, UUID userId, Instant now) {
		this.quantity = quantity;
		this.availability = availability;
		observedAt = now;
		updatedBy = userId;
		updatedAt = now;
	}
}
