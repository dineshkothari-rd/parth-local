package com.nearkart.common;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.nearkart.common.ApiResponse.FieldError;

@RestControllerAdvice
class GlobalExceptionHandler {

	@ExceptionHandler(ApiException.class)
	ResponseEntity<ApiResponse<Void>> apiException(ApiException exception) {
		return ResponseEntity.status(exception.getStatus())
			.body(ApiResponse.error(exception.getMessage(), List.of()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException exception) {
		var errors = exception.getBindingResult().getFieldErrors().stream()
			.map(error -> new FieldError(error.getField(), error.getDefaultMessage()))
			.toList();
		return ResponseEntity.badRequest().body(ApiResponse.error("Validation failed", errors));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	ResponseEntity<ApiResponse<Void>> conflict() {
		return ResponseEntity.status(HttpStatus.CONFLICT)
			.body(ApiResponse.error("The resource already exists", List.of()));
	}
	@ExceptionHandler({org.springframework.orm.ObjectOptimisticLockingFailureException.class, org.springframework.dao.PessimisticLockingFailureException.class})
	ResponseEntity<ApiResponse<Void>> concurrentUpdate() {
		return ResponseEntity.status(HttpStatus.CONFLICT)
			.body(ApiResponse.error("The resource changed; reload and retry", List.of()));
	}
}
