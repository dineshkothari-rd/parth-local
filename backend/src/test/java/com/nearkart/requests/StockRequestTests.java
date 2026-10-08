package com.nearkart.requests;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.nearkart.common.ApiException;

class StockRequestTests {
	@Test
	void expiryBoundaryAndTerminalStatusesCannotChangeOrDeductStockAgain() {
		var now = Instant.parse("2026-10-07T12:00:00Z");
		var id = UUID.randomUUID();
		for (var status : new String[]{"PENDING", "CONFIRMED"}) {
			var expired = new StockRequestController.RequestRow(id,id,id,"RESERVATION",1,status,now);
			assertThatThrownBy(() -> StockRequestController.ensureOpen(expired,now)).isInstanceOf(ApiException.class);
			StockRequestController.ensureOpen(new StockRequestController.RequestRow(id,id,id,"RESERVATION",1,status,now.plusSeconds(1)),now);
		}
		for (var status : new String[]{"CANCELLED", "FULFILLED", "DECLINED", "EXPIRED", "AVAILABLE", "UNAVAILABLE"}) {
			var ended = new StockRequestController.RequestRow(id,id,id,"RESERVATION",1,status,now.plusSeconds(1));
			assertThatThrownBy(() -> StockRequestController.ensureOpen(ended,now)).isInstanceOf(ApiException.class);
		}
	}
}
