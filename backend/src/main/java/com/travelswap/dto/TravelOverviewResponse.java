package com.travelswap.dto;

import java.math.BigDecimal;

public record TravelOverviewResponse(
        long totalJourneys,
        long totalBuses,
        long totalBookedSeats,
        BigDecimal commissionReceived,
        BigDecimal commissionGenerated
) {
}
