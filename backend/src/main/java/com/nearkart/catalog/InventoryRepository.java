package com.nearkart.catalog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface InventoryRepository extends JpaRepository<Inventory, UUID> {
	Optional<Inventory> findByStoreProductId(UUID storeProductId);
}
