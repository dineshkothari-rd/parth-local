package com.nearkart.common;

import java.io.IOException;
import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(2)
public class RateLimitFilter extends OncePerRequestFilter {
	private static final int MAX_KEYS = 10_000;
	private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
	private final Clock clock;

	public RateLimitFilter(Clock clock) {
		this.clock = clock;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Rule rule = rule(request);
		if (rule == null) {
			chain.doFilter(request, response);
			return;
		}
		long minute = clock.instant().getEpochSecond() / 60;
		String key = request.getRemoteAddr() + ':' + rule.name();
		if (windows.size() >= MAX_KEYS) {
			windows.entrySet().removeIf(entry -> entry.getValue().minute() < minute);
		}
		if (!windows.containsKey(key) && windows.size() >= MAX_KEYS) {
			rejected(response);
			return;
		}
		boolean[] allowed = { true };
		windows.compute(key, (ignored, current) -> {
			if (current == null || current.minute() != minute) {
				return new Window(minute, 1);
			}
			if (current.count() >= rule.limit()) {
				allowed[0] = false;
				return current;
			}
			return new Window(minute, current.count() + 1);
		});
		if (!allowed[0]) {
			rejected(response);
			return;
		}
		response.setHeader("X-RateLimit-Limit", String.valueOf(rule.limit()));
		chain.doFilter(request, response);
	}

	private static Rule rule(HttpServletRequest request) {
		String method = request.getMethod(), path = request.getRequestURI();
		if ("POST".equals(method) && path.matches("/api/v1/auth/(login|register|refresh)")) {
			return new Rule("auth", 20);
		}
		if ("GET".equals(method) && path.equals("/api/v1/search/discover")) {
			return new Rule("ai-discovery", 5);
		}
		if ("GET".equals(method) && path.startsWith("/api/v1/search")) {
			return new Rule("search", 120);
		}
		if ("POST".equals(method) && (path.equals("/api/v1/reviews") || path.equals("/api/v1/reports"))) {
			return new Rule("feedback", 30);
		}
		if (!"GET".equals(method) && path.startsWith("/api/v1/admin/")) {
			return new Rule("admin", 120);
		}
		return null;
	}

	private static void rejected(HttpServletResponse response) throws IOException {
		response.setStatus(429);
		response.setHeader("Retry-After", "60");
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Too many requests\",\"errors\":[]}");
	}

	private record Rule(String name, int limit) {}
	private record Window(long minute, int count) {}
}
