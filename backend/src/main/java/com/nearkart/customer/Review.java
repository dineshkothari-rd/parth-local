package com.nearkart.customer;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reviews")
class Review {
	@Id UUID id;
	UUID userId;
	UUID storeId;
	short rating;
	String text;
	@Enumerated(EnumType.STRING) CustomerModels.ReviewStatus status;
	Instant createdAt;
	Instant updatedAt;
	protected Review() {}
	Review(UUID userId, CustomerModels.ReviewRequest request, Instant now) {
		id = UUID.randomUUID();
		this.userId = userId;
		storeId = request.storeId();
		rating = (short) request.rating();
		text = request.text().trim();
		status = CustomerModels.ReviewStatus.PENDING;
		createdAt = updatedAt = now;
	}
}
