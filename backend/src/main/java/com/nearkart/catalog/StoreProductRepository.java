package com.nearkart.catalog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface StoreProductRepository extends JpaRepository<StoreProduct, UUID> {
	Optional<StoreProduct> findByIdAndStoreId(UUID id, UUID storeId);
	Optional<StoreProduct> findByStoreIdAndProductVariantId(UUID storeId, UUID variantId);
	@org.springframework.data.jpa.repository.Query("select s from StoreProduct s, Inventory i where s.id = i.storeProductId and s.storeId = :storeId and i.observedAt < :cutoff")
	Page<StoreProduct> findNeedingReview(UUID storeId, java.time.Instant cutoff, Pageable pageable);
	@org.springframework.data.jpa.repository.Query("select count(s) from StoreProduct s, Inventory i where s.id = i.storeProductId and s.storeId = :storeId and i.observedAt < :cutoff")
	long countNeedingReview(UUID storeId, java.time.Instant cutoff);
	long countByStoreId(UUID storeId);
	Page<StoreProduct> findAllByStoreId(UUID storeId, Pageable pageable);
}
