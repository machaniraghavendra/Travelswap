package com.travelswap.dto;

import com.travelswap.model.JourneyStatus;
import com.travelswap.model.SeatDeck;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record JourneyResponse(
        Long id,
        Long travelId,
        String travelName,
        Long busId,
        String busNumber,
        String busType,
        String routeFrom,
        String routeTo,
        List<RoutePointResponse> pickupPoints,
        List<RoutePointResponse> droppingPoints,
        SeatDeck preferredDeck,
        LocalDateTime departureTime,
        BigDecimal baseFare,
        int availableSeats,
        int bookedSeats,
        JourneyStatus status
) {
}
