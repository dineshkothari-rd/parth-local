package com.nearkart.catalog;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "categories")
class Category {
	@Id UUID id;
	String name;
	String slug;
	Instant createdAt;
	Instant updatedAt;
	protected Category() {}
	Category(String name, String slug, Instant now) {
		id = UUID.randomUUID();
		this.name = name;
		this.slug = slug;
		createdAt = updatedAt = now;
	}
}
