package com.travelswap.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateListingRequest(
        @Positive Long ticketId,
        String sourcePlatform,
        String operatorName,
        String routeFrom,
        String routeTo,
        LocalDateTime departureTime,
        String seatNumber,
        String originalPnr,
        @DecimalMin("1.0") BigDecimal originalFare,
        @DecimalMin("1.0") BigDecimal resalePrice,
        String sellerContact
) {
}
