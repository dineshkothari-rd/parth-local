package com.nearkart.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.nearkart.admin.AdminService;
import com.nearkart.common.ApiException;
import com.nearkart.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import static org.springframework.http.HttpStatus.*;

@RestController
class AccountRecoveryController {
	private final JdbcClient jdbc;
	private final PasswordEncoder passwords;
	private final Clock clock;
	private final AdminService admin;
	AccountRecoveryController(JdbcClient jdbc, PasswordEncoder passwords, Clock clock, AdminService admin) {
		this.jdbc=jdbc; this.passwords=passwords; this.clock=clock; this.admin=admin;
	}
	record Issue(@AssertTrue boolean identityVerified, @NotBlank @Size(max=500) String reason) {}
	record Redeem(@NotBlank @Size(max=100) String token, @NotBlank @Size(min=12,max=72) String password) {}
	@PostMapping("/api/v1/admin/users/{id}/recovery")
	@PreAuthorize("hasRole('ADMIN')")
	@Transactional
	ApiResponse<Map<String,Object>> issue(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody Issue input) {
		if (!input.identityVerified()) throw new ApiException(BAD_REQUEST,"Verify account ownership first");
		if (!jdbc.sql("SELECT EXISTS(SELECT 1 FROM users WHERE id=:id AND status='ACTIVE')").param("id",id).query(Boolean.class).single())
			throw new ApiException(NOT_FOUND,"Active account not found");
		if (jdbc.sql("SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=:id AND r.name='ADMIN')").param("id",id).query(Boolean.class).single())
			throw new ApiException(BAD_REQUEST,"Administrator recovery requires the operator procedure");
		byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes);
		String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		var expires=clock.instant().plus(Duration.ofMinutes(30));
		jdbc.sql("INSERT INTO account_recovery(token_hash,user_id,expires_at) VALUES(:hash,:id,:expires) ON CONFLICT(user_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=EXCLUDED.expires_at")
			.param("hash",hash(token)).param("id",id).param("expires",java.sql.Timestamp.from(expires)).update();
		admin.audit(UUID.fromString(jwt.getSubject()),"ACCOUNT_RECOVERY_ISSUED","USER",id,input.reason());
		return ApiResponse.success(Map.of("token",token,"expiresAt",expires));
	}
	@PostMapping("/api/v1/auth/recovery")
	@Transactional
	ApiResponse<Void> redeem(@Valid @RequestBody Redeem input) {
		if (input.password().getBytes(StandardCharsets.UTF_8).length>72) throw new ApiException(BAD_REQUEST,"Password must be at most 72 UTF-8 bytes");
		UUID id=jdbc.sql("SELECT user_id FROM account_recovery WHERE token_hash=:hash AND expires_at>:now FOR UPDATE")
			.param("hash",hash(input.token())).param("now",java.sql.Timestamp.from(clock.instant())).query(UUID.class).optional()
			.orElseThrow(()->new ApiException(BAD_REQUEST,"Invalid or expired recovery code"));
		if (jdbc.sql("UPDATE users SET password_hash=:password,auth_version=auth_version+1,updated_at=:now WHERE id=:id AND status='ACTIVE'")
			.param("password",passwords.encode(input.password())).param("now",java.sql.Timestamp.from(clock.instant())).param("id",id).update()!=1)
			throw new ApiException(BAD_REQUEST,"Account recovery unavailable");
		jdbc.sql("DELETE FROM account_recovery WHERE user_id=:id").param("id",id).update();
		admin.revokeSessions(id);
		admin.audit(id,"ACCOUNT_RECOVERED","USER",id,"One-time recovery code redeemed");
		return ApiResponse.success(null);
	}
	private static String hash(String token) {
		try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
		catch (NoSuchAlgorithmException error) { throw new IllegalStateException(error); }
	}
}
