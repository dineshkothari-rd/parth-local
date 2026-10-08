package com.nearkart.admin;

import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import com.nearkart.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
class AdminController {
	private final AdminService admin;
	AdminController(AdminService admin) { this.admin = admin; }
	@GetMapping({"/users", "/moderation/stores", "/reviews", "/reports", "/audit-logs", "/catalog/categories", "/catalog/products", "/catalog/variants"})
	ApiResponse<Map<String,Object>> list(jakarta.servlet.http.HttpServletRequest request,
		@RequestParam(defaultValue="") @Size(max=120) String q,
		@RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page,
		@RequestParam(defaultValue="20") @Min(1) @Max(100) int size) {
		String resource = request.getRequestURI().substring(request.getRequestURI().lastIndexOf('/')+1);
		return ApiResponse.success(admin.list(resource, q, page, size));
	}
	record Moderation(@NotBlank String status, @NotBlank @Size(max=500) String reason, @Min(0) Integer expectedVersion) {}
	@PatchMapping({"/users/{id}", "/moderation/stores/{id}", "/reviews/{id}", "/reports/{id}", "/catalog/products/{id}/status"})
	ApiResponse<Void> moderate(jakarta.servlet.http.HttpServletRequest request, @AuthenticationPrincipal Jwt jwt,
		@PathVariable UUID id, @Valid @RequestBody Moderation input) {
		String path = request.getRequestURI();
		String resource = path.contains("/products/") ? "products" : path.substring(0,path.lastIndexOf('/'));
		if (!resource.equals("products")) resource = resource.substring(resource.lastIndexOf('/')+1);
		if (resource.equals("stores") && input.expectedVersion() == null)
			throw new com.nearkart.common.ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Store version is required");
		admin.moderate(UUID.fromString(jwt.getSubject()), resource, id, input.status(), input.reason(), input.expectedVersion() == null ? 0 : input.expectedVersion());
		return ApiResponse.success(null);
	}
}
