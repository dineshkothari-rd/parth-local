package com.nearkart.auth;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nearkart.auth.AuthModels.AuthResponse;
import com.nearkart.auth.AuthModels.LoginRequest;
import com.nearkart.auth.AuthModels.RegisterRequest;
import com.nearkart.auth.AuthModels.Session;
import com.nearkart.auth.AuthModels.UserView;
import com.nearkart.common.ApiException;
import com.nearkart.user.Role;
import com.nearkart.user.RoleName;
import com.nearkart.user.RoleRepository;
import com.nearkart.user.User;
import com.nearkart.user.UserRepository;
import com.nearkart.user.UserStatus;

@Service
class AuthService {

	private static final SecureRandom RANDOM = new SecureRandom();

	private final UserRepository users;
	private final RoleRepository roles;
	private final RefreshTokenRepository refreshTokens;
	private final PasswordEncoder passwords;
	private final JwtEncoder jwtEncoder;
	private final AuthProperties properties;
	private final Clock clock;

	AuthService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
			PasswordEncoder passwords, JwtEncoder jwtEncoder, AuthProperties properties, Clock clock) {
		this.users = users;
		this.roles = roles;
		this.refreshTokens = refreshTokens;
		this.passwords = passwords;
		this.jwtEncoder = jwtEncoder;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	Session register(RegisterRequest request) {
		String email = normalizeEmail(request.email());
		validatePassword(request.password());
		if (users.existsByEmail(email)) {
			throw new ApiException(CONFLICT, "An account with this email already exists");
		}
		Role role = roles.findByName(request.accountType().role())
			.orElseThrow(() -> new IllegalStateException("Required role is missing"));
		Instant now = clock.instant();
		User user = users.save(new User(email, passwords.encode(request.password()), request.displayName().trim(), role, now));
		return createSession(user, UUID.randomUUID(), now);
	}

	@Transactional
	Session login(LoginRequest request) {
		User user = users.findByEmail(normalizeEmail(request.email()))
			.filter(candidate -> passwords.matches(request.password(), candidate.getPasswordHash()))
			.orElseThrow(this::invalidCredentials);
		ensureActive(user);
		return createSession(user, UUID.randomUUID(), clock.instant());
	}

	@Transactional(noRollbackFor = ApiException.class)
	Session refresh(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			throw invalidCredentials();
		}
		RefreshToken current = refreshTokens.findByTokenHash(hash(rawToken))
			.orElseThrow(this::invalidCredentials);
		Instant now = clock.instant();
		if (current.revoked()) {
			revokeFamily(current.familyId(), now);
			throw invalidCredentials();
		}
		if (!current.expiresAt().isAfter(now)) {
			current.revoke(now);
			throw invalidCredentials();
		}
		ensureActive(current.user());

		String replacement = randomToken();
		String replacementHash = hash(replacement);
		current.replaceWith(replacementHash, now);
		refreshTokens.save(new RefreshToken(current.user(), current.familyId(), replacementHash,
			now.plus(properties.refreshTtl()), now));
		return new Session(response(current.user(), now), replacement);
	}

	@Transactional
	void logout(String rawToken) {
		if (rawToken != null && !rawToken.isBlank()) {
			refreshTokens.findByTokenHash(hash(rawToken)).ifPresent(token -> revokeFamily(token.familyId(), clock.instant()));
		}
	}

	private Session createSession(User user, UUID familyId, Instant now) {
		String rawRefreshToken = randomToken();
		refreshTokens.save(new RefreshToken(user, familyId, hash(rawRefreshToken),
			now.plus(properties.refreshTtl()), now));
		return new Session(response(user, now), rawRefreshToken);
	}

	private AuthResponse response(User user, Instant now) {
		var roleNames = user.getRoles().stream().map(Role::getName).sorted().toList();
		var claims = JwtClaimsSet.builder()
			.issuer("nearkart")
			.issuedAt(now)
			.expiresAt(now.plus(properties.accessTtl()))
			.subject(user.getId().toString())
			.claim("authVersion", user.getAuthVersion())
			.claim("roles", roleNames.stream().map(RoleName::name).toList())
			.build();
		var header = JwsHeader.with(MacAlgorithm.HS256).build();
		String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
		return new AuthResponse(accessToken, properties.accessTtl().toSeconds(), new UserView(
			user.getId(), user.getEmail(), user.getDisplayName(), Set.copyOf(roleNames)));
	}

	private void revokeFamily(UUID familyId, Instant now) {
		refreshTokens.findAllByFamilyIdAndRevokedAtIsNull(familyId).forEach(token -> token.revoke(now));
	}

	private static String normalizeEmail(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}

	private static void validatePassword(String password) {
		if (password.getBytes(UTF_8).length > 72) {
			throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,
				"Password must be at most 72 UTF-8 bytes");
		}
	}

	private static String randomToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static String hash(String value) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException(exception);
		}
	}

	private void ensureActive(User user) {
		if (user.getStatus() != UserStatus.ACTIVE) {
			throw invalidCredentials();
		}
	}

	private ApiException invalidCredentials() {
		return new ApiException(UNAUTHORIZED, "Invalid credentials");
	}
}
