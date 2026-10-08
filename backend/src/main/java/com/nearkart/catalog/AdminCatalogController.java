package com.nearkart.catalog;

import java.net.URI;
import java.util.UUID;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import com.nearkart.admin.AdminService;

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
@Transactional
class AdminCatalogController {
	private final CatalogService catalog;
	private final AdminService admin;
	AdminCatalogController(CatalogService catalog, AdminService admin) { this.catalog = catalog; this.admin = admin; }

	@PostMapping("/categories")
	ResponseEntity<ApiResponse<CatalogModels.CategoryView>> category(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CatalogModels.CategoryRequest request) {
		var value = catalog.createCategory(request);
		admin.audit(UUID.fromString(jwt.getSubject()), "CATALOG_CREATED", "CATEGORY", value.id(), "Catalog creation");
		return ResponseEntity.created(URI.create("/api/v1/admin/catalog/categories/" + value.id())).body(ApiResponse.success(value));
	}
	@PostMapping("/products")
	ResponseEntity<ApiResponse<CatalogModels.ProductView>> product(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CatalogModels.ProductRequest request) {
		var value = catalog.createProduct(request);
		admin.audit(UUID.fromString(jwt.getSubject()), "CATALOG_CREATED", "PRODUCT", value.id(), "Catalog creation");
		return ResponseEntity.created(URI.create("/api/v1/admin/catalog/products/" + value.id())).body(ApiResponse.success(value));
	}
	@PostMapping("/variants")
	ResponseEntity<ApiResponse<CatalogModels.VariantView>> variant(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CatalogModels.VariantRequest request) {
		var value = catalog.createVariant(request);
		admin.audit(UUID.fromString(jwt.getSubject()), "CATALOG_CREATED", "VARIANT", value.id(), "Catalog creation");
		return ResponseEntity.created(URI.create("/api/v1/admin/catalog/variants/" + value.id())).body(ApiResponse.success(value));
	}
	@PatchMapping("/categories/{id}")
	ApiResponse<CatalogModels.CategoryView> editCategory(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody CatalogModels.CategoryRequest input) {
		var value=catalog.updateCategory(id,input); audit(jwt,"CATEGORY",id); return ApiResponse.success(value);
	}
	@PatchMapping("/products/{id}")
	ApiResponse<CatalogModels.ProductView> editProduct(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody CatalogModels.ProductRequest input) {
		var value=catalog.updateProduct(id,input); audit(jwt,"PRODUCT",id); return ApiResponse.success(value);
	}
	@PatchMapping("/variants/{id}")
	ApiResponse<CatalogModels.VariantView> editVariant(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody CatalogModels.VariantRequest input) {
		var value=catalog.updateVariant(id,input); audit(jwt,"VARIANT",id); return ApiResponse.success(value);
	}
	private void audit(Jwt jwt,String type,UUID id) { admin.audit(UUID.fromString(jwt.getSubject()),"CATALOG_UPDATED",type,id,"Catalog edit"); }
}
