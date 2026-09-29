package com.nearkart.catalog;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "products")
class Product {
	@Id UUID id;
	UUID categoryId;
	String name;
	String normalizedName;
	String brand;
	@Enumerated(EnumType.STRING) ProductStatus status;
	Instant createdAt;
	Instant updatedAt;
	protected Product() {}
	Product(UUID categoryId, String name, String normalizedName, String brand, Instant now) {
		id = UUID.randomUUID();
		this.categoryId = categoryId;
		this.name = name;
		this.normalizedName = normalizedName;
		this.brand = brand;
		status = ProductStatus.ACTIVE;
		createdAt = updatedAt = now;
	}
}
