package com.travelswap.security.dto;

import java.time.LocalDateTime;

public record UserSessionResponse(
        String id,
        LocalDateTime expiresAt,
        LocalDateTime lastUsedAt,
        String userAgent,
        String ipAddress,
        boolean active
) {
}