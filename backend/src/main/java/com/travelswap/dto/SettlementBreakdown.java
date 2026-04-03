package com.travelswap.dto;

import java.math.BigDecimal;

public record SettlementBreakdown(
        BigDecimal platformFee,
        BigDecimal travellerCommission,
        BigDecimal buyerFinalPrice,
        BigDecimal sellerPayout,
        BigDecimal sellerLoss
) {
}