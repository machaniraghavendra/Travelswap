package com.travelswap.model;

import java.time.LocalDateTime;

public record NotificationMessage(
        String id,
        String title,
        String detail,
        String category,
        Long listingId,
        boolean seen,
        LocalDateTime createdAt
) {
}