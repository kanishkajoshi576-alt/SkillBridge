package com.skillbridge.api;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> status(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        return response(status, safeMessage(exception.getReason(), status), status.name(), Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalidBody(MethodArgumentNotValidException exception) {
        Map<String, String> details = exception.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(error -> error.getField(), error -> error.getDefaultMessage() == null ? "Invalid value." : error.getDefaultMessage(), (first, second) -> first, LinkedHashMap::new));
        return response(HttpStatus.BAD_REQUEST, "Please check the submitted information.", "VALIDATION_ERROR", details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    ResponseEntity<Map<String, Object>> invalidParameter(ConstraintViolationException exception) {
        return response(HttpStatus.BAD_REQUEST, "One or more request parameters are invalid.", "VALIDATION_ERROR", Map.of());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, Object>> unreadableBody(HttpMessageNotReadableException exception) {
        return response(HttpStatus.BAD_REQUEST, "The request body is missing or malformed.", "INVALID_REQUEST_BODY", Map.of());
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String, Object>> invalidState(IllegalStateException exception) {
        return response(HttpStatus.CONFLICT, safeMessage(exception.getMessage(), HttpStatus.CONFLICT), "INVALID_STATE", Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> duplicate(DataIntegrityViolationException exception) {
        return response(HttpStatus.CONFLICT, "This change conflicts with an existing record.", "DATA_CONFLICT", Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception exception) {
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.", "INTERNAL_ERROR", Map.of());
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message, String code, Map<?, ?> details) {
        Map<String, Object> error = Map.of("code", code, "details", details);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("message", message);
        body.put("data", null);
        body.put("timestamp", Instant.now());
        body.put("error", error);
        return ResponseEntity.status(status).body(body);
    }

    private String safeMessage(String reason, HttpStatus status) {
        return reason == null || reason.isBlank() ? status.getReasonPhrase() : reason;
    }
}
