package com.nearkart.admin;

import java.time.Clock;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.nearkart.common.ApiException;
import static org.springframework.http.HttpStatus.*;

@Service
public class AdminService {
	private final JdbcClient jdbc;
	private final Clock clock;
	public AdminService(JdbcClient jdbc, Clock clock) { this.jdbc = jdbc; this.clock = clock; }

	// SQL identifiers are selected exclusively from this server-owned allowlist.
	private static final Map<String, String> COLUMNS = Map.of(
		"users", "id, email, display_name AS \"displayName\", EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=users.id AND r.name='ADMIN') AS \"isAdmin\", status, created_at AS \"createdAt\"",
		"stores", "id, name, owner_id AS \"ownerId\", (SELECT email FROM users WHERE users.id=stores.owner_id) AS owner, phone, status, approval_reason AS reason, version, created_at AS \"createdAt\"",
		"reviews", "id, user_id AS \"userId\", store_id AS \"storeId\", (SELECT name FROM stores WHERE stores.id=reviews.store_id) AS store, (SELECT display_name FROM users WHERE users.id=reviews.user_id) AS customer, rating, text, status, created_at AS \"createdAt\"",
		"reports", "id, user_id AS \"userId\", store_id AS \"storeId\", (SELECT name FROM stores WHERE stores.id=reports.store_id) AS store, type, details, status, created_at AS \"createdAt\"",
		"audit-logs", "id, actor_id AS \"actorId\", action, target_type AS \"targetType\", target_id AS \"targetId\", metadata::text AS metadata, created_at AS \"createdAt\"",
		"categories", "id, name, slug, created_at AS \"createdAt\"",
		"products", "id, name, category_id AS \"categoryId\", (SELECT name FROM categories WHERE categories.id=products.category_id) AS category, brand, status, created_at AS \"createdAt\"",
		"variants", "id, product_id AS \"productId\", (SELECT name FROM products WHERE products.id=product_variants.product_id) AS product, label, barcode, created_at AS \"createdAt\""
	);
	private static String table(String resource) {
		if (!COLUMNS.containsKey(resource)) throw new ApiException(NOT_FOUND, "Resource not found");
		return switch (resource) { case "audit-logs" -> "audit_logs"; case "variants" -> "product_variants"; default -> resource; };
	}
	@Transactional(readOnly = true)
	public Map<String, Object> list(String resource, String q, int page, int size) {
		String table = table(resource);
		String columns = COLUMNS.get(resource);
		String field = switch (resource) {
			case "users" -> "email || ' ' || display_name";
			case "stores", "categories", "products" -> "name";
			case "reviews" -> "text"; case "reports" -> "type || ' ' || COALESCE(details, '')";
			case "audit-logs" -> "action || ' ' || target_type || ' ' || target_id::text";
			default -> "label || ' ' || COALESCE(barcode, '')";
		};
		String where = " WHERE strpos(lower(" + field + "), lower(:q)) > 0";
		var rows = jdbc.sql("SELECT " + columns + " FROM " + table + where + " ORDER BY created_at DESC, id LIMIT :size OFFSET :offset")
			.param("q", q.trim()).param("size", size).param("offset", (long) page * size).query().listOfRows();
		long total = jdbc.sql("SELECT count(*) FROM " + table + where).param("q", q.trim()).query(Long.class).single();
		return Map.of("content", rows, "totalElements", total, "page", page, "size", size);
	}
	static void validateStatus(String resource, String status) {
		Set<String> allowed = switch (resource) {
			case "users" -> Set.of("ACTIVE", "SUSPENDED");
			case "stores" -> Set.of("APPROVED", "SUSPENDED");
			case "reviews" -> Set.of("APPROVED", "REJECTED");
			case "reports" -> Set.of("RESOLVED", "DISMISSED");
			case "products" -> Set.of("ACTIVE", "INACTIVE");
			default -> Set.of();
		};
		if (!allowed.contains(status)) throw new ApiException(BAD_REQUEST, "Invalid moderation status");
	}
	@Transactional
	public void moderate(UUID actor, String resource, UUID id, String status, String reason, int version) {
		validateStatus(resource, status);
		if (resource.equals("users")) {
			boolean admin = jdbc.sql("SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=:id AND r.name='ADMIN')")
				.param("id", id).query(Boolean.class).single();
			if (id.equals(actor) || admin) throw new ApiException(BAD_REQUEST, "Administrator accounts cannot be moderated here");
		}
		String extra = resource.equals("users") ? ", auth_version=auth_version+1" : resource.equals("stores") ? ", version=version+1, approval_reason=:reason" : "";
		String condition = resource.equals("stores") ? " AND status IN ('APPROVED', 'SUSPENDED') AND version=:version" : "";
		var update = jdbc.sql("UPDATE " + table(resource) + " SET status=:status, updated_at=:now" + extra + " WHERE id=:id" + condition)
			.param("status", status).param("now", java.sql.Timestamp.from(clock.instant())).param("id", id);
		if (resource.equals("stores")) update.param("reason", reason.trim()).param("version", version);
		if (update.update() != 1) throw new ApiException(CONFLICT, "Resource is missing or changed; reload and retry");
		if (resource.equals("users")) {
			revokeSessions(id);
			jdbc.sql("DELETE FROM account_recovery WHERE user_id=:id").param("id",id).update();
		}
		audit(actor, resource.toUpperCase() + "_MODERATED", resource, id, reason);
	}
	public void revokeSessions(UUID id) {
		jdbc.sql("UPDATE refresh_tokens SET revoked_at=:now, updated_at=:now WHERE user_id=:id AND revoked_at IS NULL")
			.param("now", java.sql.Timestamp.from(clock.instant())).param("id", id).update();
	}
	public void audit(UUID actor, String action, String type, UUID id, String reason) {
		jdbc.sql("INSERT INTO audit_logs(id, actor_id, action, target_type, target_id, metadata, created_at, updated_at) VALUES(:auditId,:actor,:action,:type,:id,jsonb_build_object('reason',CAST(:reason AS text)),:now,:now)")
			.param("auditId", UUID.randomUUID()).param("actor", actor).param("action", action).param("type", type)
			.param("id", id).param("reason", reason.trim()).param("now", java.sql.Timestamp.from(clock.instant())).update();
	}
}
