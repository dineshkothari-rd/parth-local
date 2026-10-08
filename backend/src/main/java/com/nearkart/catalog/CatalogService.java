package com.nearkart.catalog;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nearkart.audit.AuditLog;
import com.nearkart.audit.AuditLogRepository;
import com.nearkart.common.ApiException;
import com.nearkart.store.StoreRepository;
import com.nearkart.user.User;
import com.nearkart.user.UserRepository;

@Service
public class CatalogService {
	private final CategoryRepository categories;
	private final ProductRepository products;
	private final ProductVariantRepository variants;
	private final StoreProductRepository listings;
	private final InventoryRepository inventory;
	private final PriceRepository prices;
	private final PriceHistoryRepository priceHistory;
	private final StoreRepository stores;
	private final UserRepository users;
	private final AuditLogRepository auditLogs;
	private final Clock clock;
	private final org.springframework.jdbc.core.simple.JdbcClient jdbc;
	private final Duration freshFor;
	private final Duration recentFor;
	private final Duration staleAfter;

	CatalogService(CategoryRepository categories, ProductRepository products,
			ProductVariantRepository variants, StoreProductRepository listings,
			InventoryRepository inventory, PriceRepository prices, PriceHistoryRepository priceHistory,
			StoreRepository stores, UserRepository users, AuditLogRepository auditLogs, Clock clock, org.springframework.jdbc.core.simple.JdbcClient jdbc,
			@Value("${nearkart.inventory.fresh-for:PT30M}") Duration freshFor,
			@Value("${nearkart.inventory.recent-for:PT2H}") Duration recentFor,
			@Value("${nearkart.inventory.stale-after:P1D}") Duration staleAfter) {
		this.categories = categories; this.products = products; this.variants = variants;
		this.listings = listings; this.inventory = inventory; this.prices = prices;
		this.priceHistory = priceHistory; this.stores = stores; this.users = users;
		this.auditLogs = auditLogs; this.clock = clock; this.jdbc = jdbc; this.freshFor = freshFor;
		this.recentFor = recentFor; this.staleAfter = staleAfter;
	}

	@Transactional
	CatalogModels.CategoryView createCategory(CatalogModels.CategoryRequest request) {
		Instant now = clock.instant();
		Category category = categories.save(new Category(request.name().trim(), slug(request.name()), now));
		return new CatalogModels.CategoryView(category.id, category.name, category.slug);
	}

	@Transactional
	CatalogModels.ProductView createProduct(CatalogModels.ProductRequest request) {
		categories.findById(request.categoryId()).orElseThrow(() -> notFound("Category"));
		Instant now = clock.instant();
		Product product = products.save(new Product(request.categoryId(), request.name().trim(),
			normalize(request.name()), clean(request.brand()), now));
		return productView(product);
	}

	@Transactional
	CatalogModels.VariantView createVariant(CatalogModels.VariantRequest request) {
		products.findById(request.productId()).orElseThrow(() -> notFound("Product"));
		Instant now = clock.instant();
		ProductVariant variant = variants.save(new ProductVariant(request.productId(), request.label().trim(), clean(request.barcode()), now));
		return variantView(variant);
	}

	@Transactional
	CatalogModels.CategoryView updateCategory(UUID id, CatalogModels.CategoryRequest request) {
		Category value = categories.findById(id).orElseThrow(() -> notFound("Category"));
		value.name = request.name().trim(); value.slug = slug(request.name()); value.updatedAt = clock.instant();
		return new CatalogModels.CategoryView(value.id, value.name, value.slug);
	}
	@Transactional
	CatalogModels.ProductView updateProduct(UUID id, CatalogModels.ProductRequest request) {
		categories.findById(request.categoryId()).orElseThrow(() -> notFound("Category"));
		Product value = products.findById(id).orElseThrow(() -> notFound("Product"));
		value.categoryId = request.categoryId(); value.name = request.name().trim(); value.normalizedName = normalize(request.name());
		value.brand = clean(request.brand()); value.updatedAt = clock.instant(); return productView(value);
	}
	@Transactional
	CatalogModels.VariantView updateVariant(UUID id, CatalogModels.VariantRequest request) {
		ProductVariant value = variants.findById(id).orElseThrow(() -> notFound("Variant"));
		if (!value.productId.equals(request.productId())) throw new ApiException(BAD_REQUEST, "A variant cannot be moved to another product");
		value.label = request.label().trim(); value.barcode = clean(request.barcode()); value.updatedAt = clock.instant(); return variantView(value);
	}

	@Transactional
	CatalogModels.ListingView addListing(UUID ownerId, UUID storeId, CatalogModels.AddListingRequest request) {
		ownedStore(ownerId, storeId);
		validateStock(request.quantity(), request.availability());
		ProductVariant variant = variants.findById(request.variantId()).orElseThrow(() -> notFound("Variant"));
		User owner = user(ownerId); Instant now = clock.instant(); String currency = currency(request.currency());
		StoreProduct listing = listings.save(new StoreProduct(storeId, variant.id, now));
		Inventory stock = inventory.save(new Inventory(listing.id, request.quantity(), request.availability(), ownerId, now));
		Price price = prices.save(new Price(listing.id, request.amount(), currency, now));
		priceHistory.save(new PriceHistory(listing.id, null, price.amount, currency, ownerId, now));
		auditLogs.save(new AuditLog(owner, "STORE_PRODUCT_ADDED", "STORE_PRODUCT", listing.id, Map.of(), now));
		return view(listing, variant, stock, price, now);
	}

	@Transactional(readOnly = true)
	Page<CatalogModels.ListingView> ownedListings(UUID ownerId, UUID storeId, Pageable pageable) {
		return ownedListings(ownerId, storeId, pageable, false);
	}
	@Transactional(readOnly = true)
	Page<CatalogModels.ListingView> ownedListings(UUID ownerId, UUID storeId, Pageable pageable, boolean needsReview) {
		ownedStore(ownerId, storeId); Instant now = clock.instant();
		return (needsReview ? listings.findNeedingReview(storeId, now.minus(recentFor), pageable) : listings.findAllByStoreId(storeId, pageable)).map(listing -> view(listing,
			variants.findById(listing.productVariantId).orElseThrow(), stock(listing.id), price(listing.id), now));
	}
	@Transactional(readOnly = true)
	CatalogModels.FreshnessView freshnessSummary(UUID ownerId, UUID storeId) {
		ownedStore(ownerId, storeId);
		return new CatalogModels.FreshnessView(listings.countNeedingReview(storeId, clock.instant().minus(recentFor)), listings.countByStoreId(storeId));
	}
	@Transactional
	CatalogModels.ImportResult importRows(UUID ownerId, UUID storeId, CatalogModels.ImportRequest request) {
		ownedStore(ownerId, storeId);
		var seen = new java.util.HashSet<UUID>(); int added = 0, updated = 0;
		for (var row : request.rows()) {
			if (!seen.add(row.variantId())) throw new ApiException(BAD_REQUEST, "Duplicate variant in import");
			validateStock(row.quantity(), row.availability());
			var variant = variants.findById(row.variantId()).orElseThrow(() -> notFound("Variant"));
			if (products.findById(variant.productId).orElseThrow().status != ProductStatus.ACTIVE)
				throw new ApiException(BAD_REQUEST, "Import contains an inactive product");
			var existing = listings.findByStoreIdAndProductVariantId(storeId, row.variantId());
			if (existing.isPresent()) {
				var id = existing.get().id;
				if (!price(id).currency.equals("INR")) throw new ApiException(BAD_REQUEST, "CSV import supports INR listings only");
				if (row.inventoryVersion() == null || row.priceVersion() == null || stock(id).version != row.inventoryVersion() || price(id).version != row.priceVersion()) throw stale("Import row");
				updated++;
			} else {
				if (row.inventoryVersion() != null || row.priceVersion() != null) throw stale("Import row");
				added++;
			}
		}
		if (!request.preview()) for (var row : request.rows().stream().sorted(java.util.Comparator.comparing(CatalogModels.ImportRow::variantId)).toList()) {
			var existing = listings.findByStoreIdAndProductVariantId(storeId, row.variantId());
			if (existing.isEmpty()) addListing(ownerId, storeId, new CatalogModels.AddListingRequest(row.variantId(), row.amount(), "INR", row.quantity(), row.availability()));
			else {
				updateInventory(ownerId, existing.get().id, new CatalogModels.InventoryRequest(row.quantity(), row.availability(), row.inventoryVersion()));
				updatePrice(ownerId, existing.get().id, new CatalogModels.PriceRequest(row.amount(), "INR", row.priceVersion()));
			}
		}
		return new CatalogModels.ImportResult(added, updated, request.preview());
	}

	@Transactional
	CatalogModels.ListingView updateInventory(UUID ownerId, UUID listingId, CatalogModels.InventoryRequest request) {
		validateStock(request.quantity(), request.availability());
		StoreProduct listing = ownedListing(ownerId, listingId);
		Inventory stock = inventory.lockByStoreProductId(listing.id).orElseThrow(() -> notFound("Inventory"));
		if (stock.version != request.expectedVersion()) throw stale("Inventory");
		long held = jdbc.sql("select coalesce(sum(quantity),0) from stock_requests where store_product_id=:id and status='CONFIRMED' and expires_at>:now")
			.param("id",listing.id).param("now",java.sql.Timestamp.from(clock.instant())).query(Long.class).single();
		if (held > 0 && (request.quantity() == null || request.quantity() < held || !java.util.List.of(Availability.AVAILABLE, Availability.LOW_STOCK).contains(request.availability())))
			throw new ApiException(CONFLICT, "Inventory must cover confirmed reservations; decline them first if stock changed");
		Instant now = clock.instant(); stock.update(request.quantity(), request.availability(), ownerId, now);
		auditLogs.save(new AuditLog(user(ownerId), "INVENTORY_UPDATED", "STORE_PRODUCT", listing.id, Map.of(), now));
		return view(listing, variants.findById(listing.productVariantId).orElseThrow(), stock, price(listing.id), now);
	}

	@Transactional
	CatalogModels.ListingView updatePrice(UUID ownerId, UUID listingId, CatalogModels.PriceRequest request) {
		StoreProduct listing = ownedListing(ownerId, listingId); Price price = price(listing.id);
		if (price.version != request.expectedVersion()) throw stale("Price");
		Instant now = clock.instant(); String currency = currency(request.currency());
		priceHistory.save(new PriceHistory(listing.id, price.amount, request.amount(), currency, ownerId, now));
		price.update(request.amount(), currency, now);
		auditLogs.save(new AuditLog(user(ownerId), "PRICE_UPDATED", "STORE_PRODUCT", listing.id, Map.of(), now));
		return view(listing, variants.findById(listing.productVariantId).orElseThrow(), stock(listing.id), price, now);
	}

	private StoreProduct ownedListing(UUID ownerId, UUID listingId) {
		StoreProduct listing = listings.findById(listingId).orElseThrow(() -> notFound("Listing"));
		ownedStore(ownerId, listing.storeId); return listing;
	}
	private void ownedStore(UUID ownerId, UUID storeId) { stores.findByIdAndOwnerId(storeId, ownerId).orElseThrow(() -> notFound("Store")); }
	private User user(UUID id) { return users.findById(id).orElseThrow(() -> notFound("User")); }
	private Inventory stock(UUID id) { return inventory.findByStoreProductId(id).orElseThrow(() -> notFound("Inventory")); }
	private Price price(UUID id) { return prices.findByStoreProductId(id).orElseThrow(() -> notFound("Price")); }
	private CatalogModels.ListingView view(StoreProduct listing, ProductVariant variant, Inventory stock, Price price, Instant now) {
		return new CatalogModels.ListingView(listing.id, listing.storeId, variantView(variant), price.amount, price.currency,
			stock.quantity, stock.availability, freshness(stock.observedAt, now, freshFor, recentFor, staleAfter), stock.observedAt, stock.version, price.version);
	}
	static String freshness(Instant observedAt, Instant now, Duration freshFor, Duration recentFor, Duration staleAfter) {
		Duration age = Duration.between(observedAt, now);
		if (age.compareTo(freshFor) <= 0) return "FRESH";
		if (age.compareTo(recentFor) <= 0) return "RECENT";
		if (age.compareTo(staleAfter) <= 0) return "POSSIBLY_STALE";
		return "STALE";
	}
	private static CatalogModels.ProductView productView(Product value) { return new CatalogModels.ProductView(value.id, value.categoryId, value.name, value.brand); }
	private static CatalogModels.VariantView variantView(ProductVariant value) { return new CatalogModels.VariantView(value.id, value.productId, value.label, value.barcode); }
	private static String currency(String value) { return value == null ? "INR" : value; }
	static void validateStock(Integer quantity, Availability availability) {
		if (quantity == null) return;
		if ((availability == Availability.OUT_OF_STOCK && quantity != 0)
				|| ((availability == Availability.AVAILABLE || availability == Availability.LOW_STOCK) && quantity == 0))
			throw new ApiException(BAD_REQUEST, "Quantity and availability do not agree");
	}
	private static String clean(String value) { return value == null || value.isBlank() ? null : value.trim(); }
	private static String normalize(String value) { return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " "); }
	private static String slug(String value) { return Normalizer.normalize(normalize(value), Normalizer.Form.NFD).replaceAll("\\p{M}", "").replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", ""); }
	private static ApiException notFound(String resource) { return new ApiException(NOT_FOUND, resource + " not found"); }
	private static ApiException stale(String resource) { return new ApiException(CONFLICT, resource + " was updated; reload and retry"); }
}
