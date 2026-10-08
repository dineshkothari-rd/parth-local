package com.nearkart.search;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.nearkart.common.ApiException;

@Service
public class SearchService {
	private final SearchRepository search;
	private final RankingService ranking;
	private final Clock clock;
	private final Duration freshFor;
	private final Duration recentFor;
	private final Duration staleAfter;

	SearchService(SearchRepository search, RankingService ranking, Clock clock,
			@Value("${nearkart.inventory.fresh-for:PT30M}") Duration freshFor,
			@Value("${nearkart.inventory.recent-for:PT2H}") Duration recentFor,
			@Value("${nearkart.inventory.stale-after:P1D}") Duration staleAfter) {
		this.search = search; this.ranking = ranking; this.clock = clock;
		this.freshFor = freshFor; this.recentFor = recentFor; this.staleAfter = staleAfter;
	}

	List<SearchModels.Suggestion> suggestions(String query, Pageable pageable) {
		String normalized = query(query);
		return search.suggestions(normalized, pageable.getPageSize(), Math.toIntExact(pageable.getOffset()));
	}

	Page<SearchModels.NearbyOffer> nearby(String query, double latitude, double longitude,
			double radiusKm, Sort sort, boolean inStockOnly, Pageable pageable) {
		double radiusMeters = radiusKm * 1000;
		double latitudeDelta = radiusKm / 111.32;
		double longitudeDelta = Math.min(180, radiusKm / (111.32 * Math.max(.01, Math.cos(Math.toRadians(latitude)))));
		var candidates = search.nearby(query(query), latitude, longitude, radiusMeters, latitudeDelta, longitudeDelta);
		var ranked = ranking.rank(candidates, radiusMeters, clock.instant(), freshFor, recentFor, staleAfter, sort);
		if (inStockOnly) ranked = ranked.stream().filter(value -> value.availability().equals("AVAILABLE") || value.availability().equals("LOW_STOCK")).toList();
		int start = Math.min(Math.toIntExact(pageable.getOffset()), ranked.size());
		int end = Math.min(start + pageable.getPageSize(), ranked.size());
		return new PageImpl<>(ranked.subList(start, end), pageable, ranked.size());
	}

	private static String query(String query) {
		String value = query.trim().toLowerCase(java.util.Locale.ROOT).replaceAll("\\s+", " ");
		if (value.length() < 2) throw new ApiException(BAD_REQUEST, "Search query must contain at least 2 characters");
		return value;
	}
}
