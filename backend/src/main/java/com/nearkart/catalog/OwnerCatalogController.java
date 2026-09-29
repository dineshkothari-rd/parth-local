package com.nearkart.catalog;

import java.net.URI;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nearkart.common.ApiResponse;
import com.nearkart.common.PageView;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

@RestController
@RequestMapping("/api/v1/owner")
@PreAuthorize("hasRole('STORE_OWNER')")
class OwnerCatalogController {
	private final CatalogService catalog;
	OwnerCatalogController(CatalogService catalog) { this.catalog = catalog; }

	@PostMapping("/stores/{storeId}/products")
	ResponseEntity<ApiResponse<CatalogModels.ListingView>> add(@AuthenticationPrincipal Jwt jwt,
			@PathVariable UUID storeId, @Valid @RequestBody CatalogModels.AddListingRequest request) {
		var value = catalog.addListing(subject(jwt), storeId, request);
		return ResponseEntity.created(URI.create("/api/v1/owner/store-products/" + value.id())).body(ApiResponse.success(value));
	}
	@GetMapping("/stores/{storeId}/products")
	ApiResponse<PageView<CatalogModels.ListingView>> list(@AuthenticationPrincipal Jwt jwt,
			@PathVariable UUID storeId, @RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		return ApiResponse.success(PageView.from(catalog.ownedListings(subject(jwt), storeId, PageRequest.of(page, size))));
	}
	@PatchMapping("/store-products/{id}/inventory")
	ApiResponse<CatalogModels.ListingView> inventory(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@Valid @RequestBody CatalogModels.InventoryRequest request) {
		return ApiResponse.success(catalog.updateInventory(subject(jwt), id, request));
	}
	@PatchMapping("/store-products/{id}/price")
	ApiResponse<CatalogModels.ListingView> price(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@Valid @RequestBody CatalogModels.PriceRequest request) {
		return ApiResponse.success(catalog.updatePrice(subject(jwt), id, request));
	}
	private static UUID subject(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
