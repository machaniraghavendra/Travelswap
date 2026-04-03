package com.travelswap.dto;

public record AdminOverviewResponse(
        long totalUsers,
        long totalAdmins,
        long totalTravellers,
        long totalSellers,
        long totalBuyers,
        long totalTravels,
        long totalBuses,
        long totalListings,
        long totalSoldListings,
        java.math.BigDecimal totalPlatformFees,
        java.math.BigDecimal resalePlatformFees,
        java.math.BigDecimal bookingPlatformFees
) {
}
