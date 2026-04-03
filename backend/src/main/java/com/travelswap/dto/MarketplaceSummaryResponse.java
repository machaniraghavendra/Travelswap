package com.travelswap.dto;

import java.math.BigDecimal;

public record MarketplaceSummaryResponse(
        long totalListings,
        long availableListings,
        long soldListings,
        long expiredListings,
        BigDecimal sellerRecoveryAmount,
        BigDecimal buyerSavingsAmount,
        double occupancyLiftPercent
) {
}