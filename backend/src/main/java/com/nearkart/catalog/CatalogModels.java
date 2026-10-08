package com.nearkart.catalog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.List;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

final class CatalogModels {

	private CatalogModels() {
	}

	record CategoryRequest(@NotBlank @Size(max = 100) String name) {}
	record ProductRequest(@NotNull UUID categoryId, @NotBlank @Size(max = 180) String name,
		@Size(max = 120) String brand) {}
	record VariantRequest(@NotNull UUID productId, @NotBlank @Size(max = 120) String label,
		@Size(max = 64) String barcode) {}
	record AddListingRequest(@NotNull UUID variantId,
		@NotNull @DecimalMin(value = "0.01") BigDecimal amount,
		@Pattern(regexp = "^[A-Z]{3}$") String currency,
		@Min(0) Integer quantity, @NotNull Availability availability) {}
	record InventoryRequest(@Min(0) Integer quantity, @NotNull Availability availability,
		@Min(0) int expectedVersion) {}
	record PriceRequest(@NotNull @DecimalMin(value = "0.01") BigDecimal amount,
		@Pattern(regexp = "^[A-Z]{3}$") String currency, @Min(0) int expectedVersion) {}
	record ImportRow(@NotNull UUID variantId, @NotNull @DecimalMin("0.01") @jakarta.validation.constraints.Digits(integer = 10, fraction = 2) BigDecimal amount,
		@Min(0) Integer quantity, @NotNull Availability availability, @Min(0) Integer inventoryVersion, @Min(0) Integer priceVersion) {}
	record ImportRequest(@NotNull @Size(min = 1, max = 500) List<@NotNull @jakarta.validation.Valid ImportRow> rows, boolean preview) {}
	record ImportResult(int added, int updated, boolean preview) {}
	record FreshnessView(long needsReview, long total) {}
	record CategoryView(UUID id, String name, String slug) {}
	record ProductView(UUID id, UUID categoryId, String name, String brand) {}
	record VariantView(UUID id, UUID productId, String label, String barcode) {}
	record ListingView(UUID id, UUID storeId, VariantView variant, BigDecimal amount, String currency,
		Integer quantity, Availability availability, String freshness, Instant observedAt,
		int inventoryVersion, int priceVersion) {}
}
