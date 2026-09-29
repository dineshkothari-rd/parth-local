package com.nearkart.catalog;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> {}
