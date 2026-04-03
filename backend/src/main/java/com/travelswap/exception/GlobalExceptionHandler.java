package com.travelswap.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("NOT_FOUND path={} message={}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<?> handleConflict(ConflictException ex, HttpServletRequest request) {
        log.warn("CONFLICT path={} message={}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), request);
    }

    @ExceptionHandler({InvalidRequestException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<?> handleBadRequest(Exception ex, HttpServletRequest request) {
        String message = ex instanceof MethodArgumentNotValidException validationEx
                ? validationEx.getBindingResult().getFieldErrors().stream().findFirst()
                .map(error -> {
                    String defaultMessage = error.getDefaultMessage() == null ? "Validation failed" : error.getDefaultMessage();
                    return error.getField() + ": " + defaultMessage;
                })
                .orElse("Validation failed")
                : ex.getMessage();

        if (ex instanceof MethodArgumentNotValidException validationEx) {
            String allErrors = validationEx.getBindingResult().getFieldErrors().stream()
                    .map(error -> error.getField() + "=" + (error.getDefaultMessage() == null ? "Validation failed" : error.getDefaultMessage()))
                    .collect(Collectors.joining(", "));
            log.warn("BAD_REQUEST_VALIDATION path={} errors={}", request.getRequestURI(), allErrors);
        }
        log.warn("BAD_REQUEST path={} message={}", request.getRequestURI(), message);
        return buildResponse(HttpStatus.BAD_REQUEST, "BAD_REQUEST", message, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        log.warn("FORBIDDEN path={} message={}", request.getRequestURI(), ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access denied for this role", request);
    }

    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public ResponseEntity<?> handleAsyncDisconnect(AsyncRequestNotUsableException ex, HttpServletRequest request) {
        log.debug("ASYNC_DISCONNECT path={} message={}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("INTERNAL_ERROR path={} message={}", request.getRequestURI(), ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Unexpected server error", request);
    }

    private ResponseEntity<?> buildResponse(HttpStatus status, String code, String message, HttpServletRequest request) {
        if (isSseRequest(request)) {
            return ResponseEntity.status(status).build();
        }
        return ResponseEntity.status(status)
                .body(new ApiError(code, message, LocalDateTime.now()));
    }

    private boolean isSseRequest(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return request.getRequestURI().startsWith("/api/stream/")
                || (accept != null && accept.contains("text/event-stream"));
    }
}
