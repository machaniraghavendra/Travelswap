package com.travelswap.dto;

import java.math.BigDecimal;

public record UserDashboardResponse(
        long activeSellingTickets,
        long soldTickets,
        long cancelledTickets,
        long purchasedTickets,
        BigDecimal totalRecoveryFromSales,
        BigDecimal totalLossFromSales,
        BigDecimal totalSpentOnPurchases,
        BigDecimal totalSavingsOnPurchases,
        BigDecimal totalPlatformFeePaid,
        BigDecimal totalPlatformFeeGenerated,
        BigDecimal totalTravellerCommission,
        BigDecimal netProfitOrLoss,
        TicketListingResponse upcomingTrip
) {
}
