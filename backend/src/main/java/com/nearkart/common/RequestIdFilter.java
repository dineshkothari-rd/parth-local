package com.nearkart.common;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
@Order(1)
public class RequestIdFilter extends OncePerRequestFilter {
	private static final Pattern SAFE = Pattern.compile("[A-Za-z0-9._-]{1,64}");

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String supplied = request.getHeader("X-Request-ID");
		String requestId = supplied != null && SAFE.matcher(supplied).matches() ? supplied : UUID.randomUUID().toString();
		response.setHeader("X-Request-ID", requestId);
		try (var ignored = MDC.putCloseable("requestId", requestId)) {
			chain.doFilter(request, response);
		}
	}
}
