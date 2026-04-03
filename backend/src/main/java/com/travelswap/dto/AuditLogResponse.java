package com.travelswap.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
        Long id,
        String action,
        boolean success,
        int statusCode,
        String actorEmail,
        String actorRole,
        String endpoint,
        String message,
        Long listingId,
        String sessionId,
        LocalDateTime createdAt
) {
}