package com.travelswap.dto;

import com.travelswap.model.ListingStatus;
import com.travelswap.model.VerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record TicketListingResponse(
        Long id,
        String sourcePlatform,
        String operatorName,
        Long travelId,
        String travelName,
        Long busId,
        String busNumber,
        String busType,
        String routeFrom,
        String routeTo,
        List<RoutePointResponse> pickupPoints,
        List<RoutePointResponse> droppingPoints,
        LocalDateTime departureTime,
        String seatNumber,
        String originalPnr,
        BigDecimal originalFare,
        BigDecimal systemSuggestedPrice,
        BigDecimal resalePrice,
        ListingStatus status,
        VerificationStatus verificationStatus,
        Long sellerId,
        String sellerName,
        String sellerContact,
        Long buyerId,
        String buyerName,
        String buyerContact,
        String transferCode,
        BigDecimal buyerFinalPrice,
        BigDecimal platformFee,
        BigDecimal travellerCommission,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
