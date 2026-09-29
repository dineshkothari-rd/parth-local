package com.nearkart.catalog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PriceRepository extends JpaRepository<Price, UUID> {
	Optional<Price> findByStoreProductId(UUID storeProductId);
}
