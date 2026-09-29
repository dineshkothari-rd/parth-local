package com.nearkart.catalog;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface StoreProductRepository extends JpaRepository<StoreProduct, UUID> {
	Optional<StoreProduct> findByIdAndStoreId(UUID id, UUID storeId);
	Page<StoreProduct> findAllByStoreId(UUID storeId, Pageable pageable);
}
