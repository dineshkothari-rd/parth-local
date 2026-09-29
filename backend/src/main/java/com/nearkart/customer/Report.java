package com.nearkart.customer;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "reports")
class Report {
	@Id UUID id;
	UUID userId;
	UUID storeId;
	UUID storeProductId;
	@Enumerated(EnumType.STRING) CustomerModels.ReportType type;
	String details;
	@Enumerated(EnumType.STRING) CustomerModels.ReportStatus status;
	Instant createdAt;
	Instant updatedAt;
	protected Report() {}
	Report(UUID userId, CustomerModels.ReportRequest request, Instant now) {
		id = UUID.randomUUID();
		this.userId = userId;
		storeId = request.storeId();
		storeProductId = request.storeProductId();
		type = request.type();
		details = request.details() == null || request.details().isBlank() ? null : request.details().trim();
		status = CustomerModels.ReportStatus.OPEN;
		createdAt = updatedAt = now;
	}
}
