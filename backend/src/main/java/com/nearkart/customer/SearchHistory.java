package com.nearkart.customer;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "search_history")
class SearchHistory {
	@Id UUID id;
	UUID userId;
	String query;
	Instant createdAt;
	protected SearchHistory() {}
	SearchHistory(UUID userId, String query, Instant now) {
		id = UUID.randomUUID();
		this.userId = userId;
		this.query = query;
		createdAt = now;
	}
}
