package com.nearkart.catalog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface InventoryRepository extends JpaRepository<Inventory, UUID> {
	Optional<Inventory> findByStoreProductId(UUID storeProductId);
	@org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
	@org.springframework.data.jpa.repository.Query("select i from Inventory i where i.storeProductId=:storeProductId")
	Optional<Inventory> lockByStoreProductId(UUID storeProductId);
}
