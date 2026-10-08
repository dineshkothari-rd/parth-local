package com.nearkart;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import com.nearkart.auth.RefreshTokenRepository;
import com.nearkart.audit.AuditLogRepository;
import com.nearkart.catalog.CatalogService;
import com.nearkart.customer.CustomerService;
import com.nearkart.search.SearchService;
import com.nearkart.search.SearchRepository;
import com.nearkart.store.StoreRepository;
import com.nearkart.store.StoreAnalyticsService;
import com.nearkart.user.RoleRepository;
import com.nearkart.user.UserRepository;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
		"spring.autoconfigure.exclude=org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration,org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration,org.springframework.boot.hibernate.autoconfigure.HibernateJpaAutoConfiguration,org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration",
		"nearkart.auth.jwt-secret=test-secret-with-at-least-32-bytes"
})
class NearKartApplicationTests {

	@Autowired
	private MockMvc mockMvc;
	@MockitoBean
	private UserRepository users;
	@MockitoBean
	private RoleRepository roles;
	@MockitoBean
	private RefreshTokenRepository refreshTokens;
	@MockitoBean
	private StoreRepository stores;
	@MockitoBean
	private AuditLogRepository auditLogs;
	@MockitoBean
	private CatalogService catalog;
	@MockitoBean
	private SearchService search;
	@MockitoBean
	private SearchRepository searchRepository;
	@MockitoBean
	private CustomerService customers;
	@MockitoBean
	private JdbcClient jdbc;
	@MockitoBean
	private StoreAnalyticsService analytics;

	@Test
	void adminRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
	}

	@Test
	@WithMockUser(roles = "CUSTOMER")
	void customerCannotReadAdminData() throws Exception {
		for (String resource : new String[] {"users", "moderation/stores", "reviews", "reports", "audit-logs", "catalog/products"})
			mockMvc.perform(get("/api/v1/admin/" + resource)).andExpect(status().isForbidden());
	}

	@Test
	void healthIsPublic() throws Exception {
		mockMvc.perform(get("/actuator/health"))
			.andExpect(status().isOk());
	}

}
