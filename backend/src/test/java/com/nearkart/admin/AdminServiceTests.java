package com.nearkart.admin;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import com.nearkart.common.ApiException;

class AdminServiceTests {
	@Test void moderationRejectsUnsupportedResourcesAndStatuses() {
		assertDoesNotThrow(() -> AdminService.validateStatus("reviews", "APPROVED"));
		assertDoesNotThrow(() -> AdminService.validateStatus("reports", "RESOLVED"));
		assertThrows(ApiException.class, () -> AdminService.validateStatus("users", "ADMIN"));
		assertThrows(ApiException.class, () -> AdminService.validateStatus("stores", "PENDING"));
		assertThrows(ApiException.class, () -> AdminService.validateStatus("audit-logs", "APPROVED"));
	}
}
