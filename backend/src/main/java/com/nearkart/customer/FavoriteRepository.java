package com.nearkart.customer;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
	List<Favorite> findAllByUserIdOrderByCreatedAtDesc(UUID userId);
	void deleteByIdAndUserId(UUID id, UUID userId);
}
