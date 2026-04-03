package com.travelswap.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record JourneySeatResponse(
        Long journeyId,
        String travelName,
        String busNumber,
        String busType,
        String routeFrom,
        String routeTo,
        String preferredDeck,
        List<RoutePointResponse> pickupPoints,
        List<RoutePointResponse> droppingPoints,
        LocalDateTime departureTime,
        BigDecimal baseFare,
        BigDecimal serviceFee,
        BigDecimal taxAmount,
        BigDecimal totalPayable,
        int availableSeats,
        List<SeatAvailabilityResponse> seats
) {
}
