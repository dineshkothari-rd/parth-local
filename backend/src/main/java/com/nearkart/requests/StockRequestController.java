package com.nearkart.requests;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.nearkart.common.ApiException;
import com.nearkart.common.ApiResponse;
import com.nearkart.common.PageView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

@RestController
@RequestMapping("/api/v1")
public class StockRequestController {
	private final JdbcClient jdbc;
	private final Clock clock;
	public StockRequestController(JdbcClient jdbc, Clock clock) { this.jdbc = jdbc; this.clock = clock; }
	record Create(@NotNull UUID listingId, @NotNull Kind kind, @Min(1) @Max(100) int quantity, @Size(max=500) String message) {}
	enum Kind { ENQUIRY, RESERVATION }
	record Update(@NotBlank String status, @Size(max=500) String response) {}
	record Stock(UUID id, UUID ownerId, String storeStatus, String ownerStatus, String listingStatus, String productStatus, Integer quantity, String availability, BigDecimal amount, String currency) {}
	record RequestRow(UUID id, UUID customerId, UUID storeProductId, String kind, int quantity, String status, Instant expiresAt) {}

	@PostMapping("/requests")
	@PreAuthorize("hasRole('CUSTOMER')")
	@Transactional
	ApiResponse<Map<String,Object>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Create input) {
		UUID customer = subject(jwt); Instant now = clock.instant();
		// Serialize per-customer limits and per-listing holds in the database.
		jdbc.sql("select id from users where id=:id for update").param("id",customer).query(UUID.class).single();
		Stock stock = stock(input.listingId());
		if (!stock.storeStatus().equals("APPROVED") || !stock.ownerStatus().equals("ACTIVE") || !stock.listingStatus().equals("ACTIVE") || !stock.productStatus().equals("ACTIVE")) throw error(HttpStatus.NOT_FOUND,"Listing unavailable");
		jdbc.sql("update stock_requests set status='EXPIRED', updated_at=:now where customer_id=:id and status in ('PENDING','CONFIRMED') and expires_at<=:now")
			.param("id",customer).param("now",ts(now)).update();
		long open = jdbc.sql("select count(*) from stock_requests where customer_id=:id and status in ('PENDING','CONFIRMED')").param("id",customer).query(Long.class).single();
		if (open >= 20) throw error(HttpStatus.CONFLICT,"Finish or cancel an existing request before creating another");
		if (input.kind() == Kind.RESERVATION && (stock.quantity() == null || !List.of("AVAILABLE","LOW_STOCK").contains(stock.availability()) || free(stock, now) < input.quantity())) throw error(HttpStatus.CONFLICT,"Not enough confirmed stock for this reservation");
		UUID id = UUID.randomUUID();
		jdbc.sql("insert into stock_requests(id,customer_id,store_product_id,kind,quantity,message,status,expires_at,created_at,updated_at) values(:id,:customer,:listing,:kind,:quantity,:message,'PENDING',:expiry,:now,:now)")
			.param("id",id).param("customer",customer).param("listing",input.listingId()).param("kind",input.kind().name()).param("quantity",input.quantity()).param("message",clean(input.message())).param("expiry",ts(now.plusSeconds(86400))).param("now",ts(now)).update();
		audit(customer,id,"STOCK_REQUEST_CREATED",now);
		return ApiResponse.success(Map.of("id",id));
	}

	@GetMapping("/me/requests")
	@PreAuthorize("hasRole('CUSTOMER')")
	ApiResponse<PageView<Map<String,Object>>> customerList(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page) {
		return list(subject(jwt),null,page);
	}
	@GetMapping("/owner/stores/{storeId}/requests")
	@PreAuthorize("hasRole('STORE_OWNER')")
	ApiResponse<PageView<Map<String,Object>>> ownerList(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID storeId, @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int page) {
		if (jdbc.sql("select count(*) from stores where id=:store and owner_id=:owner").param("store",storeId).param("owner",subject(jwt)).query(Long.class).single() == 0) throw error(HttpStatus.NOT_FOUND,"Store not found");
		return list(subject(jwt),storeId,page);
	}
	private ApiResponse<PageView<Map<String,Object>>> list(UUID user, UUID store, int page) {
		String filter = store == null ? "r.customer_id=:scope" : "sp.store_id=:scope";
		String from = " from stock_requests r join store_products sp on sp.id=r.store_product_id join stores s on s.id=sp.store_id join product_variants v on v.id=sp.product_variant_id join products p on p.id=v.product_id join users u on u.id=r.customer_id where " + filter;
		UUID scope = store == null ? user : store;
		long count = jdbc.sql("select count(*)"+from).param("scope",scope).query(Long.class).single();
		var rows = jdbc.sql("select r.id, r.kind, r.quantity, r.message, r.response, case when r.status in ('PENDING','CONFIRMED') and r.expires_at<=:now then 'EXPIRED' else r.status end as status, r.expires_at as \"expiresAt\", r.created_at as \"createdAt\", r.quoted_amount as \"quotedAmount\", r.currency, s.name as \"storeName\", s.id as \"storeId\", p.name as \"productName\", v.label as variant, u.display_name as \"customerName\""+from+" order by r.created_at desc, r.id limit 20 offset :offset")
			.param("scope",scope).param("now",ts(clock.instant())).param("offset",page*20).query().listOfRows();
		return ApiResponse.success(new PageView<>(rows,page,20,count,(int)((count+19)/20)));
	}

	@PatchMapping("/requests/{id}/cancel")
	@PreAuthorize("hasRole('CUSTOMER')")
	@Transactional
	ApiResponse<Void> cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		RequestRow initial = request(id); stock(initial.storeProductId()); RequestRow row = lockedRequest(id);
		if (!row.customerId().equals(subject(jwt))) throw error(HttpStatus.NOT_FOUND,"Request not found");
		ensureOpen(row,clock.instant());
		change(id,"CANCELLED","",null,null,clock.instant(),subject(jwt)); return ApiResponse.success(null);
	}
	@PatchMapping("/owner/requests/{id}")
	@PreAuthorize("hasRole('STORE_OWNER')")
	@Transactional
	ApiResponse<Void> respond(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody Update input) {
		RequestRow initial = request(id); Stock stock = stock(initial.storeProductId()); RequestRow row = lockedRequest(id); Instant now = clock.instant();
		if (!stock.ownerId().equals(subject(jwt))) throw error(HttpStatus.NOT_FOUND,"Request not found");
		ensureOpen(row,now); String next = input.status();
		if (row.kind().equals("ENQUIRY")) {
			if (!row.status().equals("PENDING") || !List.of("AVAILABLE","UNAVAILABLE").contains(next)) throw error(HttpStatus.BAD_REQUEST,"Invalid enquiry response");
		} else {
			boolean valid = (row.status().equals("PENDING") && List.of("CONFIRMED","DECLINED").contains(next)) || (row.status().equals("CONFIRMED") && List.of("FULFILLED","DECLINED").contains(next));
			if (!valid) throw error(HttpStatus.BAD_REQUEST,"Invalid reservation transition");
			if (next.equals("CONFIRMED")) {
				if (!stock.storeStatus().equals("APPROVED") || !stock.listingStatus().equals("ACTIVE") || !stock.productStatus().equals("ACTIVE") || !List.of("AVAILABLE","LOW_STOCK").contains(stock.availability()) || stock.quantity()==null || free(stock,now)<row.quantity()) throw error(HttpStatus.CONFLICT,"Stock is no longer sufficient; update inventory or decline");
			}
			if (next.equals("FULFILLED")) {
				if (stock.quantity()==null || stock.quantity()<row.quantity()) throw error(HttpStatus.CONFLICT,"Update inventory before fulfilling");
				jdbc.sql("update inventory set quantity=quantity-:quantity, availability=case when quantity-:quantity=0 then 'OUT_OF_STOCK' else availability end, version=version+1, observed_at=:now, updated_at=:now, updated_by=:owner where store_product_id=:listing")
					.param("quantity",row.quantity()).param("now",ts(now)).param("owner",subject(jwt)).param("listing",stock.id()).update();
			}
		}
		change(id,next,clean(input.response()),next.equals("CONFIRMED")?now.plusSeconds(7200):null,next.equals("CONFIRMED")?stock:null,now,subject(jwt)); return ApiResponse.success(null);
	}
	private Stock stock(UUID listing) {
		// All hold changes and inventory edits lock this same inventory row.
		jdbc.sql("select id from inventory where store_product_id=:id for update").param("id",listing).query(UUID.class).optional().orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Listing not found"));
		return jdbc.sql("select sp.id,s.owner_id,s.status as store_status,u.status as owner_status,sp.status as listing_status,p.status as product_status,i.quantity,i.availability,pr.amount,pr.currency from store_products sp join stores s on s.id=sp.store_id join users u on u.id=s.owner_id join inventory i on i.store_product_id=sp.id join prices pr on pr.store_product_id=sp.id join product_variants v on v.id=sp.product_variant_id join products p on p.id=v.product_id where sp.id=:id").param("id",listing).query(Stock.class).single();
	}
	private long free(Stock stock, Instant now) {
		long held = jdbc.sql("select coalesce(sum(quantity),0) from stock_requests where store_product_id=:id and status='CONFIRMED' and expires_at>:now").param("id",stock.id()).param("now",ts(now)).query(Long.class).single();
		return stock.quantity()==null ? 0 : stock.quantity()-held;
	}
	private RequestRow request(UUID id) { return readRequest(id,false); }
	private RequestRow lockedRequest(UUID id) { return readRequest(id,true); }
	private RequestRow readRequest(UUID id, boolean lock) {
		return jdbc.sql("select id,customer_id,store_product_id,kind,quantity,status,expires_at from stock_requests where id=:id"+(lock?" for update":"")).param("id",id).query(RequestRow.class).optional().orElseThrow(() -> error(HttpStatus.NOT_FOUND,"Request not found"));
	}
	static void ensureOpen(RequestRow row, Instant now) {
		if (!List.of("PENDING","CONFIRMED").contains(row.status()) || !row.expiresAt().isAfter(now)) throw error(HttpStatus.CONFLICT,"Request has already ended or expired");
	}
	private void change(UUID id,String status,String response,Instant expiry,Stock quote,Instant now,UUID actor) {
		jdbc.sql("update stock_requests set status=:status,response=:response,expires_at=coalesce(:expiry,expires_at),quoted_amount=coalesce(:amount,quoted_amount),currency=coalesce(:currency,currency),updated_at=:now where id=:id")
			.param("status",status).param("response",response).param("expiry",expiry==null?null:ts(expiry),java.sql.Types.TIMESTAMP).param("amount",quote==null?null:quote.amount(),java.sql.Types.NUMERIC).param("currency",quote==null?null:quote.currency(),java.sql.Types.VARCHAR).param("now",ts(now)).param("id",id).update();
		audit(actor,id,"STOCK_REQUEST_"+status,now);
	}
	private void audit(UUID actor, UUID id, String action, Instant now) {
		jdbc.sql("insert into audit_logs(id,actor_id,action,target_type,target_id,created_at,updated_at) values(:id,:actor,:action,'STOCK_REQUEST',:target,:now,:now)").param("id",UUID.randomUUID()).param("actor",actor).param("action",action).param("target",id).param("now",ts(now)).update();
	}
	private static UUID subject(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
	private static Timestamp ts(Instant time) { return Timestamp.from(time); }
	private static String clean(String text) { return text==null?"":text.trim(); }
	private static ApiException error(HttpStatus status,String message) { return new ApiException(status,message); }
}
