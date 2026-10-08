package com.nearkart.common;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

import java.time.Clock;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import jakarta.servlet.DispatcherType;

import com.nearkart.auth.AuthProperties;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(AuthProperties.class)
class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter)
			throws Exception {
		return http
			.csrf(AbstractHttpConfigurer::disable)
			.cors(Customizer.withDefaults())
			.formLogin(AbstractHttpConfigurer::disable)
			.httpBasic(AbstractHttpConfigurer::disable)
			.sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
			.authorizeHttpRequests(requests -> requests
				.dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
				.requestMatchers("/actuator/health", "/api/v1/auth/**").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/v1/stores/**").permitAll()
				.requestMatchers(HttpMethod.POST, "/api/v1/stores/*/directions").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/v1/search/**").permitAll()
				.anyRequest().authenticated())
			.exceptionHandling(errors -> errors
				.authenticationEntryPoint((request, response, exception) -> {
					response.setStatus(401);
					response.setContentType("application/json");
					response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Authentication required\",\"errors\":[]}");
				})
				.accessDeniedHandler((request, response, exception) -> {
					response.setStatus(403);
					response.setContentType("application/json");
					response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Access denied\",\"errors\":[]}");
				}))
			.oauth2ResourceServer(oauth2 -> oauth2
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
				.authenticationEntryPoint((request, response, exception) -> {
					response.setStatus(401);
					response.setContentType("application/json");
					response.getWriter().write("{\"success\":false,\"data\":null,\"message\":\"Invalid access token\",\"errors\":[]}");
				}))
			.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	SecretKey jwtKey(AuthProperties properties) {
		byte[] secret = properties.jwtSecret().getBytes(UTF_8);
		if (secret.length < 32) {
			throw new IllegalStateException("JWT_SECRET must contain at least 32 UTF-8 bytes");
		}
		return new SecretKeySpec(secret, "HmacSHA256");
	}

	@Bean
	JwtEncoder jwtEncoder(SecretKey key) {
		return NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS256).build();
	}

	@Bean
	JwtDecoder jwtDecoder(SecretKey key, com.nearkart.user.UserRepository users) {
		var decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
		decoder.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
			org.springframework.security.oauth2.jwt.JwtValidators.createDefaultWithIssuer("nearkart"),
			jwt -> {
				try {
					var user = users.findById(java.util.UUID.fromString(jwt.getSubject()));
					Number version = jwt.getClaim("authVersion");
					if (user.isPresent() && user.get().getStatus() == com.nearkart.user.UserStatus.ACTIVE
						&& user.get().getAuthVersion() == (version == null ? 0 : version.intValue()))
						return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success();
				} catch (IllegalArgumentException ignored) { }
				return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
					new org.springframework.security.oauth2.core.OAuth2Error("invalid_token", "Session is no longer active", null));
			}));
		return decoder;
	}

	@Bean
	JwtAuthenticationConverter jwtAuthenticationConverter() {
		var authorities = new JwtGrantedAuthoritiesConverter();
		authorities.setAuthoritiesClaimName("roles");
		authorities.setAuthorityPrefix("ROLE_");
		var converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(authorities);
		return converter;
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(
			@org.springframework.beans.factory.annotation.Value("${nearkart.cors-allowed-origin}") String origin) {
		var configuration = new CorsConfiguration();
		configuration.setAllowedOrigins(List.of(origin));
		configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		configuration.setAllowCredentials(true);
		var source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", configuration);
		return source;
	}

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}
}
