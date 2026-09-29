package com.nearkart.customer;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "favorites")
class Favorite {
	@Id UUID id;
	UUID userId;
	@Enumerated(EnumType.STRING) CustomerModels.FavoriteType targetType;
	UUID productId;
	UUID storeId;
	Instant createdAt;
	protected Favorite() {}
	Favorite(UUID userId, CustomerModels.FavoriteType type, UUID targetId, Instant now) {
		id = UUID.randomUUID();
		this.userId = userId;
		targetType = type;
		createdAt = now;
		if (type == CustomerModels.FavoriteType.PRODUCT) productId = targetId; else storeId = targetId;
	}
}
