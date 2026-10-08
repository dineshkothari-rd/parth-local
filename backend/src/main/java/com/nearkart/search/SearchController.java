package com.nearkart.search;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.nearkart.common.ApiResponse;
import com.nearkart.common.PageView;
import com.nearkart.customer.CustomerService;
import com.nearkart.store.StoreAnalyticsService;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

@Validated
@RestController
@RequestMapping("/api/v1/search")
class SearchController {
	private final SearchService search;
	private final CustomerService customers;
	private final StoreAnalyticsService analytics;
	SearchController(SearchService search, CustomerService customers, StoreAnalyticsService analytics) {
		this.search = search; this.customers = customers; this.analytics = analytics;
	}

	@GetMapping
	ApiResponse<List<SearchModels.Suggestion>> suggestions(@RequestParam @Size(max = 120) String q,
			@RequestParam(defaultValue = "0") @Min(0) @Max(1000000) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
		return ApiResponse.success(search.suggestions(q, PageRequest.of(page, size)));
	}

	@GetMapping("/nearby")
	ApiResponse<PageView<SearchModels.NearbyOffer>> nearby(@RequestParam @Size(max = 120) String q,
			@RequestParam @DecimalMin("-90") @DecimalMax("90") double latitude,
			@RequestParam @DecimalMin("-180") @DecimalMax("180") double longitude,
			@RequestParam(defaultValue = "5") @DecimalMin("0.1") @DecimalMax("25") double radiusKm,
			@RequestParam(defaultValue = "RECOMMENDED") Sort sort,
			@RequestParam(defaultValue = "false") boolean inStockOnly,
			@RequestParam(defaultValue = "0") @Min(0) @Max(1000000) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
			@AuthenticationPrincipal Jwt jwt) {
		var result = PageView.from(search.nearby(q, latitude, longitude, radiusKm, sort, inStockOnly, PageRequest.of(page, size)));
		analytics.recordSearchImpressions(result.content().stream().map(SearchModels.NearbyOffer::storeId).toList());
		if (jwt != null) customers.recordSearch(UUID.fromString(jwt.getSubject()), q);
		return ApiResponse.success(result);
	}
}
