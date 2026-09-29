package com.nearkart.catalog;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.nearkart.common.ApiResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/catalog")
@PreAuthorize("hasRole('ADMIN')")
class AdminCatalogController {
	private final CatalogService catalog;
	AdminCatalogController(CatalogService catalog) { this.catalog = catalog; }

	@PostMapping("/categories")
	ResponseEntity<ApiResponse<CatalogModels.CategoryView>> category(@Valid @RequestBody CatalogModels.CategoryRequest request) {
		var value = catalog.createCategory(request);
		return ResponseEntity.created(URI.create("/api/v1/admin/catalog/categories/" + value.id())).body(ApiResponse.success(value));
	}
	@PostMapping("/products")
	ResponseEntity<ApiResponse<CatalogModels.ProductView>> product(@Valid @RequestBody CatalogModels.ProductRequest request) {
		var value = catalog.createProduct(request);
		return ResponseEntity.created(URI.create("/api/v1/admin/catalog/products/" + value.id())).body(ApiResponse.success(value));
	}
	@PostMapping("/variants")
	ResponseEntity<ApiResponse<CatalogModels.VariantView>> variant(@Valid @RequestBody CatalogModels.VariantRequest request) {
		var value = catalog.createVariant(request);
		return ResponseEntity.created(URI.create("/api/v1/admin/catalog/variants/" + value.id())).body(ApiResponse.success(value));
	}
}
