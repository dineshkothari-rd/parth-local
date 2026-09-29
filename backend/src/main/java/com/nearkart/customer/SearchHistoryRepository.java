package com.nearkart.customer;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SearchHistoryRepository extends JpaRepository<SearchHistory, UUID> {
	List<SearchHistory> findTop20ByUserIdOrderByCreatedAtDesc(UUID userId);
	void deleteAllByUserId(UUID userId);
	void deleteAllByUserIdAndQueryIgnoreCase(UUID userId, String query);
}
